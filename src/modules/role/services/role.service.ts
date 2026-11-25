import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { EnumRoleType, Prisma } from '@runtime/prisma-client'
import { UserAbilityUtil } from 'app/helpers/user.ability.util'
import {
  IPrismaExportOptions,
  IPrismaReturnList,
  IPrismaReturnPaging,
  PrismaService,
} from 'lib/nest-prisma'
import { TPolicy } from 'modules/policy/interfaces/policy.interface'
import { RoleUtil } from '../helpers/role.util'
import { IRoleCreateOptions, IRoleUpdateOptions, TRole } from '../interfaces/role.interface'

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async getOne(kwargs: Prisma.RoleFindUniqueArgs): Promise<TRole> {
    return await this.prisma.role.findUnique(kwargs)
  }

  async getFirst(kwargs?: Prisma.RoleFindFirstArgs): Promise<TRole> {
    return await this.prisma.role.findFirst(kwargs)
  }

  async getMany(kwargs?: Prisma.RoleFindManyArgs): Promise<TRole[]> {
    return await this.prisma.role.findMany(kwargs)
  }

  async getList(
    kwargs: Prisma.RoleFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnList> {
    return await this.prisma.role.list(kwargs, options)
  }

  async getPage(
    kwargs: Prisma.RoleFindManyArgs,
    options?: IPrismaExportOptions,
  ): Promise<IPrismaReturnPaging> {
    return await this.prisma.role.paginate(kwargs, options)
  }

  async findOrFail(
    id: number,
    kwargs: Omit<Prisma.RoleFindUniqueOrThrowArgs, 'where'> = {},
  ): Promise<TRole> {
    return await this.prisma.role
      .findUniqueOrThrow({ ...kwargs, where: { id } })
      .catch((_err: unknown) => {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'module.role.notFound',
        })
      })
  }

  async create(
    data: Prisma.RoleUncheckedCreateInput,
    options?: IRoleCreateOptions,
  ): Promise<TRole> {
    const policies = options?.policies ?? []
    const rolePolicies = []
    for (const p of policies) {
      const roleBit = UserAbilityUtil.map2Bitwise(p.actions)
      const policy = await this.prisma.policy.findUnique({ where: { subject: p.subject } })
      if (policy) {
        rolePolicies.push({ policyId: policy.id, bitwise: roleBit })
      }
    }

    const created = await this.prisma.role.create({
      data: {
        ...data,
        pivotPolicies: {
          createMany: {
            data: rolePolicies,
            skipDuplicates: true,
          },
        },
      },
    })
    return created
  }

  async update(
    id: number,
    data: Prisma.RoleUncheckedUpdateInput,
    options?: IRoleUpdateOptions,
  ): Promise<TRole> {
    const role = await this.findOrFail(id, {
      include: {
        pivotPolicies: { select: { policyId: true } },
      },
    })

    const newPolicies = options?.policies ?? []
    const rolePolicies = []
    for (const p of newPolicies) {
      const roleBit = UserAbilityUtil.map2Bitwise(p.actions)
      const policy = await this.prisma.policy.findUnique({ where: { subject: p.subject } })
      if (policy) {
        rolePolicies.push({ policyId: policy.id, bitwise: roleBit })
      }
    }

    const updated = await this.prisma.$transaction(async tx => {
      await tx.rolesPolicies.deleteMany({ where: { roleId: role.id } })
      await tx.rolesPolicies.createMany({
        data: rolePolicies.map(policy => {
          return {
            bitwise: policy.bitwise,
            policyId: policy.policyId,
            roleId: role.id,
          }
        }),
      })
      return await tx.role.update({
        data: { updatedAt: options?.updatedAt, ...data },
        where: { id: role.id },
        include: {
          pivotPolicies: {
            include: { policy: true },
          },
        },
      })
    })
    return updated
  }

  /** Throws when the requester is not allowed to manage or assign a role of the given type. */
  assertCanManageType(requesterType: EnumRoleType | null | undefined, type: EnumRoleType): void {
    if (!RoleUtil.canAccess(requesterType, type)) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'module.role.forbidden',
      })
    }
  }

  /** Throws when the requester is not allowed to assign the given role to a user. */
  async assertCanAssign(
    requesterType: EnumRoleType | null | undefined,
    roleId: number,
  ): Promise<TRole> {
    const role = await this.findOrFail(roleId)
    this.assertCanManageType(requesterType, role.type)
    return role
  }

  async delete(id: number): Promise<boolean> {
    const assigned = await this.prisma.user.count({ where: { roleId: id } })
    if (assigned > 0) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        message: 'module.role.conflict',
      })
    }

    try {
      await this.prisma.role.delete({ where: { id } })
      return true
    } catch (_err: unknown) {}
    return false
  }

  async change(id: number, data: Prisma.RoleUncheckedUpdateInput): Promise<TRole> {
    const role = await this.findOrFail(id)
    return await this.prisma.role.update({
      data,
      where: { id: role.id },
    })
  }

  async deleteAll(): Promise<boolean> {
    await this.prisma.role.deleteMany()
    return true
  }

  async getWithAllPolicies(id?: number): Promise<[TRole, TPolicy[]]> {
    const getFulLPoliciesFn = this.prisma.policy.findMany({
      where: { isActive: true },
      orderBy: [{ sorting: 'asc' }],
    })

    if (id) {
      return await Promise.all([
        this.findOrFail(id, { include: { pivotPolicies: true } }),
        getFulLPoliciesFn,
      ])
    }
    return await Promise.all([this.fakeNew(), getFulLPoliciesFn])
  }

  private fakeNew(): TRole {
    return {
      id: 0,
      name: '',
      type: EnumRoleType.USER,
      description: '',
      isActive: true,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
      createdBy: null,
      updatedBy: null,
    }
  }
}
