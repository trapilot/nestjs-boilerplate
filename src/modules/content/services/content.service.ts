import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { Content, Prisma } from '@runtime/prisma-client'
import {
  IPrismaExportOptions,
  IPrismaReturnList,
  IPrismaReturnPaging,
  PrismaService,
} from 'lib/nest-prisma'
import { TContent } from '../interfaces/content.interface'

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getOne(kwargs: Prisma.ContentFindUniqueArgs): Promise<Content> {
    return this.prisma.content.findUnique(kwargs)
  }

  async getFirst(kwargs?: Prisma.ContentFindFirstArgs): Promise<Content> {
    return await this.prisma.content.findFirst(kwargs)
  }

  async getMany(kwargs?: Prisma.ContentFindManyArgs): Promise<Content[]> {
    return await this.prisma.content.findMany(kwargs)
  }

  async getList(
    kwargs: Prisma.ContentFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnList> {
    return await this.prisma.content.list(kwargs, options)
  }

  async getPage(
    kwargs: Prisma.ContentFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnPaging> {
    return await this.prisma.content.paginate(kwargs, options)
  }

  async findOrFail(
    id: number,
    kwargs: Omit<Prisma.ContentFindUniqueOrThrowArgs, 'where'> = {},
  ): Promise<TContent> {
    return await this.prisma.content
      .findUniqueOrThrow({ ...kwargs, where: { id } })
      .catch((_err: unknown) => {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'module.content.notFound',
        })
      })
  }

  async create(data: Prisma.ContentUncheckedCreateInput): Promise<TContent> {
    const created = await this.prisma.content.create({ data })
    return created
  }

  async update(id: number, data: Prisma.ContentUncheckedUpdateInput): Promise<TContent> {
    const content = await this.findOrFail(id)

    const updated = await this.prisma.content.update({
      data,
      where: { id: content.id },
    })
    return updated
  }

  async delete(id: number): Promise<Content> {
    const content = await this.getOne({ where: { id } })
    if (content) {
      const exists = await this.prisma.content.exists({
        where: { isActive: true, type: content.type },
      })
      if (exists) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'module.content.requiredOne',
        })
      }

      return await this.prisma.content.update({
        where: { id: content.id },
        data: { isActive: false },
      })
    }
    return content
  }

  async change(id: number, data: Prisma.ContentUncheckedUpdateInput): Promise<TContent> {
    const content = await this.findOrFail(id)
    return await this.prisma.content.update({
      data,
      where: { id: content.id },
    })
  }
}
