/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum EnumQueuePriority {
  CRITICAL = 0, // system, blocking, incident
  HIGH = 1, // user-facing, realtime
  MEDIUM = 5, // default
  LOW = 10, // background
  VERY_LOW = 20, // maintenance, cleanup
}

/**
 * How the child jobs (batches) of a parent job run. Values match the Prisma EnumJobBatchMode.
 */
export enum EnumWorkerBatchMode {
  SEQUENTIAL = 'SEQUENTIAL', // batch N+1 starts only once batch N is finalized
  PARALLEL = 'PARALLEL', // all batches can run at once, on any node
}
