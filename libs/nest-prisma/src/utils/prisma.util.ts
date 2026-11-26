import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaPg } from '@prisma/adapter-pg'
import * as runtime from '@prisma/client/runtime/client'
import { Prisma } from '@runtime/prisma-client'
import { AppUtil, IDatabaseProvider, IMessageAttributes } from 'lib/nest-core'
import { IPrismaAdapterCreateOptions, IPrismaLanguageBuildOptions } from '../interfaces'

export class PrismaUtil {
  static toAlias<T, N>(data: T): N {
    return structuredClone(data as unknown) as N
  }

  static toPlainObject<T, N = Prisma.JsonObject>(data: T): N {
    return structuredClone(data as unknown) as N
  }

  static toPlainArray<T, N = Prisma.JsonObject>(data: T): N[] {
    return structuredClone(data) as N[]
  }

  /**
   * Inline `$1, $2, ...` placeholders with their values. For debug logging only: the output is
   * NOT escaped for execution and must never be sent to the database.
   */
  static buildQuery(rawQuery: string, options: { params: string }): string {
    const query = PrismaUtil.unquoteIdentifiers(rawQuery)

    let params: unknown[] = []
    try {
      params = JSON.parse(options.params)
    } catch {
      return query
    }

    return query.replace(/\$(\d+)(?!\d)/g, (match: string, num: string) => {
      const index = Number(num) - 1
      if (index < 0 || index >= params.length) return match

      const value = params[index]
      if (value === null || value === undefined) return 'NULL'
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
      if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`
      return String(value)
    })
  }

  /**
   * Drop the quotes around plain identifiers (`"batchTotal"`, `` `users` ``) so a logged query
   * reads without the `\"` escapes JSON logs add. Single-quoted literals are kept as they are.
   * For debug logging only: the output may not run (PostgreSQL folds unquoted names to
   * lowercase). Runs before params are inlined, so JSON values keep their quotes.
   */
  static unquoteIdentifiers(query: string): string {
    return query.replace(
      /('(?:[^']|'')*')|"([A-Za-z_][A-Za-z0-9_$]*)"|`([A-Za-z_][A-Za-z0-9_$]*)`/g,
      (match: string, literal: string, dq: string, bt: string) => literal ?? dq ?? bt ?? match,
    )
  }

  static buildBulkInsert(datas: any[], table: string, pk: string = 'id'): Prisma.Sql {
    if (datas.length) {
      const quote = (name: string): string => `"${name.replace(/"/g, '""')}"`
      const columns = Object.keys(datas[0])
      const updates = columns.filter(key => key !== pk)

      return Prisma.sql`INSERT INTO ${Prisma.raw(quote(table))} (${Prisma.raw(columns.map(quote).join(','))}) VALUES ${Prisma.join(datas.map(i => Prisma.sql`(${Prisma.join(Object.values(i))})`))} ON CONFLICT (${Prisma.raw(quote(pk))}) DO ${
        updates.length
          ? Prisma.sql`UPDATE SET ${Prisma.raw(updates.map(key => `${quote(key)} = EXCLUDED.${quote(key)}`).join(','))}`
          : Prisma.sql`NOTHING`
      }`
    }
    return Prisma.sql`SELECT 1`
  }

  static buildLanguages<WhereInput = any>(
    attributes: IMessageAttributes<string>,
    options?: IPrismaLanguageBuildOptions<WhereInput>,
  ): any {
    const data = AppUtil.parseMessageRows(attributes, {
      fieldLang: options?.langField || 'language',
      fallbackValue: '',
    })

    return {
      createMany: { data, skipDuplicates: true },
      deleteMany: options?.whereField,
    }
  }

  static createAdapter(
    provider: IDatabaseProvider,
    options: IPrismaAdapterCreateOptions,
  ): runtime.SqlDriverAdapterFactory {
    if (provider === 'postgres') {
      // PrismaPg takes a pg PoolConfig, not a bare connection string
      return new PrismaPg({ connectionString: options.url })
    }

    if (provider === 'mysql' || provider === 'mariadb') {
      return new PrismaMariaDb(options.url)
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  static isUniqueError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  }
  static isNoRequiredRecord(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
  }

  static isTimeoutError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
  }

  static isDeadlockError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
  }
}
