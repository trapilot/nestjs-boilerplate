import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@runtime/prisma-client'
import { IPrismaExportOptions, IPrismaReturnList, PrismaService } from 'lib/nest-prisma'
import { TPolicy } from '../interfaces/policy.interface'

@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getOne(kwargs: Prisma.PolicyFindUniqueArgs): Promise<TPolicy> {
    return await this.prisma.policy.findUnique(kwargs)
  }

  async getFirst(kwargs?: Prisma.PolicyFindFirstArgs): Promise<TPolicy> {
    return await this.prisma.policy.findFirst(kwargs)
  }

  async getMany(kwargs?: Prisma.PolicyFindManyArgs): Promise<TPolicy[]> {
    return await this.prisma.policy.findMany(kwargs)
  }

  async getList(
    kwargs: Prisma.PolicyFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnList> {
    return await this.prisma.policy.list(kwargs, options)
  }

  async findOrFail(
    id: number,
    kwargs: Omit<Prisma.PolicyFindUniqueOrThrowArgs, 'where'> = {},
  ): Promise<TPolicy> {
    return await this.prisma.policy
      .findUniqueOrThrow({ ...kwargs, where: { id } })
      .catch((_err: unknown) => {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'module.policy.notFound',
        })
      })
  }

  async update(
    id: number,
    data: Prisma.PolicyUncheckedUpdateInput,
    kwargs: Omit<Prisma.PolicyFindUniqueOrThrowArgs, 'where'> = {},
  ): Promise<TPolicy> {
    const policy = await this.findOrFail(id, { include: { pivotRoles: true } })
    const rolePolicies = policy?.pivotRoles ?? []

    const updated = await this.prisma.$transaction(async tx => {
      const bitwise = Number(data.bitwise)
      for (const rolePolicy of rolePolicies) {
        const roleBitwise = rolePolicy.bitwise & bitwise
        const roleWhere: Prisma.RolesPoliciesWhereUniqueInput = {
          policyId_roleId: {
            policyId: rolePolicy.policyId,
            roleId: rolePolicy.roleId,
          },
        }

        if (roleBitwise === 0) {
          await tx.rolesPolicies.delete({ where: roleWhere })
        } else {
          await tx.rolesPolicies.update({
            data: { bitwise: roleBitwise },
            where: roleWhere,
          })
        }
      }

      return await tx.policy.update({
        ...kwargs,
        data,
        where: { id: policy.id },
      })
    })
    return updated
  }

  async create(
    data: Prisma.PolicyUncheckedCreateInput,
    kwargs: Omit<Prisma.PolicyFindUniqueOrThrowArgs, 'where'> = {},
  ): Promise<TPolicy> {
    const created = await this.prisma.policy.create({
      ...kwargs,
      data,
    })
    return created
  }
}
