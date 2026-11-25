import { EnumJobBatchMode, EnumJobStatus, Prisma, QueueJob } from '@runtime/prisma-client'
import { PrismaService } from '../services'

/**
 * DB clock (UTC, matching how Prisma stores DateTime in `timestamp` columns). Heartbeats are
 * written and compared with it so clock skew between nodes cannot mark live jobs as stale.
 */
const DB_NOW = Prisma.sql`(NOW() AT TIME ZONE 'UTC')`

const status = (value: EnumJobStatus) => Prisma.sql`${value}::"EnumJobStatus"`

const staleBefore = (ms: number) =>
  Prisma.sql`(${DB_NOW} - make_interval(secs => ${Math.ceil(ms / 1000)}))`

const toJson = (value: unknown) =>
  value === undefined || value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue)

export interface IQueueBatchSplit {
  mode: EnumJobBatchMode
  topic: string
  version: number
  payloads: unknown[]
}

/**
 * All SQL of the DB-backed queue (producer inserts, worker claims and state changes, batch
 * counters). Every write that follows a claim is conditional on `lockedBy = workerId` (and the
 * expected status), so a worker that lost its lock to recovery never overwrites the new
 * owner's state.
 */
export class PrismaQueueStore {
  constructor(private readonly prisma: PrismaService) {}

  // =========================
  // Producer
  // =========================

  async insert(data: Prisma.QueueJobCreateInput): Promise<void> {
    await this.prisma.queueJob.create({ data })
  }

  // =========================
  // Claim / release / recover
  // =========================

  /**
   * Atomically claim up to `limit` due PENDING jobs (FOR UPDATE SKIP LOCKED) and mark them
   * RUNNING for workerId; returns the claimed ids. A batch of a SEQUENTIAL parent is due only
   * once no sibling with a lower batchNo is left (finalized children are removed).
   */
  async claimPendingBatch(workerId: string, limit: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      UPDATE queue_jobs
      SET status = ${status(EnumJobStatus.RUNNING)},
        "lockedAt" = ${DB_NOW},
        "lockedBy" = ${workerId},
        "heartbeatAt" = ${DB_NOW},
        "updatedAt" = ${DB_NOW}
      WHERE id IN (
        SELECT j.id
        FROM queue_jobs j
        WHERE j.status = ${status(EnumJobStatus.PENDING)}
          AND j."startAt" <= ${DB_NOW}
          AND j."retryCount" < j."maxRetries"
          AND j."lockedBy" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM queue_jobs s
            JOIN queue_jobs p ON p.id = s."parentId"
            WHERE s."parentId" = j."parentId"
              AND s."batchNo" < j."batchNo"
              AND p."batchMode" = ${EnumJobBatchMode.SEQUENTIAL}::"EnumJobBatchMode"
          )
        ORDER BY j.priority ASC, j."startAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id`)

    return rows.map(r => Number(r.id))
  }

  /**
   * Find a job in `status` still locked by workerId
   */
  async findOwned(
    id: number,
    workerId: string,
    jobStatus: EnumJobStatus = EnumJobStatus.RUNNING,
  ): Promise<QueueJob | null> {
    return this.prisma.queueJob.findFirst({ where: { id, lockedBy: workerId, status: jobStatus } })
  }

  /**
   * Hand jobs locked by workerId that have not started back to PENDING
   */
  async releaseLocked(ids: number[], workerId: string): Promise<number> {
    if (!ids.length) return 0

    const { count } = await this.prisma.queueJob.updateMany({
      where: { id: { in: ids }, lockedBy: workerId, status: EnumJobStatus.RUNNING },
      data: { status: EnumJobStatus.PENDING, lockedAt: null, lockedBy: null, heartbeatAt: null },
    })

    return count
  }

  /**
   * Move RUNNING jobs with a stale or missing heartbeat back to PENDING: jobs of other or
   * unknown workers (incl. this node's previous process), and jobs of workerId it no longer
   * tracks (they get no heartbeat, e.g. after processJob failed to read or settle them).
   * WAITING parents hold no lock and are never recovered.
   */
  async recoverStale(
    workerId: string,
    trackedIds: number[],
    heartbeatTimeoutMs: number,
  ): Promise<number> {
    return this.prisma.$executeRaw(Prisma.sql`
      UPDATE queue_jobs
      SET status = ${status(EnumJobStatus.PENDING)},
        "lockedAt" = NULL,
        "lockedBy" = NULL,
        "heartbeatAt" = NULL,
        "updatedAt" = ${DB_NOW}
      WHERE status = ${status(EnumJobStatus.RUNNING)}
        AND ("heartbeatAt" IS NULL OR "heartbeatAt" < ${staleBefore(heartbeatTimeoutMs)})
        AND (
          "lockedBy" IS NULL
          OR "lockedBy" <> ${workerId}
          OR NOT (id = ANY(${trackedIds}::int[]))
        )`)
  }

  /**
   * Refresh the heartbeat of jobs locked by workerId: RUNNING ones, and SUCCESS/FAILED ones
   * while their callbacks run (so other workers do not claim them). Leaves updatedAt as the
   * last state change.
   */
  async touchHeartbeat(ids: number[], workerId: string): Promise<number> {
    if (!ids.length) return 0

    return this.prisma.$executeRaw(Prisma.sql`
      UPDATE queue_jobs
      SET "heartbeatAt" = ${DB_NOW}
      WHERE id = ANY(${ids}::int[])
        AND "lockedBy" = ${workerId}
        AND status IN (
          ${status(EnumJobStatus.RUNNING)},
          ${status(EnumJobStatus.SUCCESS)},
          ${status(EnumJobStatus.FAILED)}
        )`)
  }

  /**
   * Claim the SUCCESS/FAILED job with the oldest stale heartbeat so only one worker
   * finalizes it; returns the job (now locked by workerId) or null
   */
  async claimStaleFinalized(
    workerId: string,
    heartbeatTimeoutMs: number,
  ): Promise<QueueJob | null> {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
      UPDATE queue_jobs
      SET "lockedBy" = ${workerId},
        "heartbeatAt" = ${DB_NOW}
      WHERE id = (
        SELECT id
        FROM queue_jobs
        WHERE status IN (${status(EnumJobStatus.SUCCESS)}, ${status(EnumJobStatus.FAILED)})
          AND ("heartbeatAt" IS NULL OR "heartbeatAt" < ${staleBefore(heartbeatTimeoutMs)})
        ORDER BY "heartbeatAt" ASC NULLS FIRST
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id`)

    if (!rows.length) return null

    return this.prisma.queueJob.findFirst({
      where: { id: Number(rows[0].id), lockedBy: workerId },
    })
  }

  // =========================
  // State changes
  // =========================

  /**
   * Conditional state transition: applies only while the row is still in `fromStatus` and
   * locked by workerId. `heartbeat` also stamps heartbeatAt with the DB clock. Mirrors the
   * written values on `job`; returns false when the lock was lost.
   */
  async transition(
    job: QueueJob,
    workerId: string,
    fromStatus: EnumJobStatus,
    data: Prisma.QueueJobUpdateManyMutationInput,
    options: { heartbeat?: boolean } = {},
  ): Promise<boolean> {
    const owned = await this.prisma.$transaction(async tx => {
      const { count } = await tx.queueJob.updateMany({
        where: { id: job.id, status: fromStatus, lockedBy: workerId },
        data,
      })
      if (count !== 1) return false

      if (options.heartbeat) {
        await tx.$executeRaw`UPDATE queue_jobs SET "heartbeatAt" = ${DB_NOW} WHERE id = ${job.id}`
      }

      return true
    })

    if (owned) this.mirror(job, data)

    return owned
  }

  /**
   * Turn a RUNNING job locked by workerId into a WAITING parent (lock released) and insert one
   * PENDING child job per payload, in one transaction. Children inherit the parent's priority,
   * maxRetries and persistent flag. Returns false when the lock was lost (nothing written).
   */
  async splitIntoBatches(
    job: QueueJob,
    workerId: string,
    split: IQueueBatchSplit,
    data: Prisma.QueueJobUpdateManyMutationInput,
  ): Promise<boolean> {
    const parentData: Prisma.QueueJobUpdateManyMutationInput = {
      ...data,
      status: EnumJobStatus.WAITING,
      lockedAt: null,
      lockedBy: null,
      heartbeatAt: null,
      batchMode: split.mode,
      batchTotal: split.payloads.length,
      batchDone: 0,
      batchFailed: 0,
    }

    const owned = await this.prisma.$transaction(async tx => {
      const { count } = await tx.queueJob.updateMany({
        where: { id: job.id, status: EnumJobStatus.RUNNING, lockedBy: workerId },
        data: parentData,
      })
      if (count !== 1) return false

      const startAt = new Date()
      const thresholdAt = new Date(startAt.getTime() + 30 * 60_000)

      await tx.queueJob.createMany({
        data: split.payloads.map((payload, index) => ({
          jobName: split.topic,
          version: split.version,
          payload: toJson(payload),
          status: EnumJobStatus.PENDING,
          parentId: job.id,
          batchNo: index + 1,
          priority: job.priority,
          maxRetries: job.maxRetries,
          persistent: job.persistent,
          startAt,
          thresholdAt,
        })),
      })

      return true
    })

    if (owned) this.mirror(job, parentData)

    return owned
  }

  /**
   * Remove a finalized (SUCCESS/FAILED) job still locked by workerId and, in the same
   * transaction, archive it (persistent SUCCESS) or record the failure (FAILED). A batch also
   * counts towards its parent; the batch that settles the last one closes the parent
   * (SUCCESS, or FAILED when any batch failed) and locks it for workerId to finalize.
   *
   * Returns `moved = false` when the lock was lost (nothing removed, nothing written), and the
   * parent this call closed, if any.
   */
  async moveFinalized(
    job: QueueJob,
    workerId: string,
  ): Promise<{ moved: boolean; closedParent: { id: number; status: EnumJobStatus } | null }> {
    return this.prisma.$transaction(async tx => {
      const { count } = await tx.queueJob.deleteMany({
        where: { id: job.id, status: job.status, lockedBy: workerId },
      })
      if (count !== 1) return { moved: false, closedParent: null }

      const succeeded = job.status === EnumJobStatus.SUCCESS
      const base = {
        jobId: job.id,
        parentId: job.parentId,
        jobName: job.jobName,
        payload: toJson(job.payload),
        result: toJson(job.result),
        metadata: toJson(job.metadata),
        retryCount: job.retryCount,
      }

      if (!succeeded) {
        await tx.queueJobFailure.create({
          data: { ...base, lastError: job.lastError, failedAt: job.updatedAt },
        })
      } else if (job.persistent) {
        await tx.queueJobArchive.create({ data: { ...base, finishedAt: job.updatedAt } })
      }

      if (!job.parentId) return { moved: true, closedParent: null }

      // The parent row lock serializes concurrent batches: exactly one of them closes it.
      // SET expressions read the old row, hence `+ 1` / `+ failed` in the conditions.
      const failed = succeeded ? 0 : 1
      const closing = Prisma.sql`("batchDone" + "batchFailed" + 1 >= "batchTotal")`
      const anyFailed = Prisma.sql`("batchFailed" + ${failed}::int > 0)`

      const parents = await tx.$queryRaw<{ id: number; status: EnumJobStatus }[]>(Prisma.sql`
        UPDATE queue_jobs
        SET "batchDone" = "batchDone" + ${1 - failed}::int,
          "batchFailed" = "batchFailed" + ${failed}::int,
          status = CASE
            WHEN NOT ${closing} THEN status
            WHEN ${anyFailed} THEN ${status(EnumJobStatus.FAILED)}
            ELSE ${status(EnumJobStatus.SUCCESS)}
          END,
          "lastError" = CASE
            WHEN ${closing} AND ${anyFailed}
            THEN ("batchFailed" + ${failed}::int) || ' of ' || "batchTotal" || ' batches failed'
            ELSE "lastError"
          END,
          "lockedBy" = CASE WHEN ${closing} THEN ${workerId} ELSE "lockedBy" END,
          "heartbeatAt" = CASE WHEN ${closing} THEN ${DB_NOW} ELSE "heartbeatAt" END,
          "updatedAt" = ${DB_NOW}
        WHERE id = ${job.parentId} AND status = ${status(EnumJobStatus.WAITING)}
        RETURNING id, status`)

      const parent = parents[0]
      const closed = parent && parent.status !== EnumJobStatus.WAITING

      return {
        moved: true,
        closedParent: closed ? { id: Number(parent.id), status: parent.status } : null,
      }
    })
  }

  /**
   * Mirror written values on the in-memory job. Plain values only (no `{ increment }`
   * operations); null sentinels mirror as null.
   */
  private mirror(job: QueueJob, data: Prisma.QueueJobUpdateManyMutationInput) {
    for (const [key, value] of Object.entries(data)) {
      job[key] = value === Prisma.DbNull || value === Prisma.JsonNull ? null : value
    }
    job.updatedAt = new Date() // used as the finish time on archive / failure record
  }
}
