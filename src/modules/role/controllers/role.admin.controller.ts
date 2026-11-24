import { Controller, Delete, Get, Post, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { EnumRoleType, Prisma } from '@runtime/prisma-client'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from 'app/enums/user.enum'
import { AuthJwtPayload, EnumAuthScopeType } from 'lib/nest-auth'
import {
  ApiRequestData,
  ApiRequestList,
  ApiRequestPaging,
  IResponseData,
  IResponseList,
  IResponsePaging,
  RequestBody,
  RequestFilterDto,
  RequestListDto,
  RequestParam,
  RequestQueryFilterInBoolean,
  RequestQueryList,
} from 'lib/nest-web'
import { ROLE_DOC_ADMIN_QUERY_LIST, ROLE_DOC_OPERATION } from '../constants/role.doc.constant'
import { RequestRoleType } from '../decorators/role.type.decorator'
import { RoleRequestCreateDto } from '../dtos/role.request.create.dto'
import { RoleRequestUpdateDto } from '../dtos/role.request.update.dto'
import { RoleResponseDetailDto, RoleResponseListDto } from '../dtos/role.response.detail.dto'
import { RoleLimitedTypePipe } from '../pipes/role.limited-type.pipe'
import { RoleNotSelfPipe } from '../pipes/role.not-self.pipe'
import { RoleService } from '../services/role.service'

@ApiTags(ROLE_DOC_OPERATION)
@Controller({ path: '/roles' })
export class RoleAdminController {
  constructor(protected readonly roleService: RoleService) {}

  @ApiRequestPaging({
    summary: ROLE_DOC_OPERATION,
    queries: ROLE_DOC_ADMIN_QUERY_LIST,
    sortable: false,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.ROLE,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: RoleResponseListDto,
    },
  })
  @Get('/')
  async list(
    @RequestQueryList({
      defaultPerPage: 50,
      defaultOrderBy: 'id',
      availableOrderBy: ['id'],
    })
    { _search, _kwargs }: RequestListDto,
    @RequestQueryFilterInBoolean('isActive') _enabled: RequestFilterDto,
    @RequestRoleType() _type: RequestFilterDto,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.RoleFindManyArgs = {
      ..._kwargs,
      where: {
        ..._search,
        ..._enabled,
        ..._type,
      },
    }

    return await this.roleService.getPage(kwargs)
  }

  @ApiRequestList({
    summary: ROLE_DOC_OPERATION,
    sortable: false,
    searchable: false,
    exportable: false,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: false,
      },
    },
    response: {
      dto: RoleResponseListDto,
    },
  })
  @Get('/map-shorted')
  async mapShorted(
    @RequestQueryList({
      defaultOrderBy: 'name:asc',
      availableOrderBy: ['name'],
    })
    { _search, _kwargs }: RequestListDto,
    @RequestQueryFilterInBoolean('isActive', true) _enabled: RequestFilterDto,
    @RequestRoleType() _type: RequestFilterDto,
  ): Promise<IResponseList> {
    const where: Prisma.RoleWhereInput = {
      ..._search,
      ..._enabled,
      ..._type,
    }
    const select: Prisma.RoleSelect = {
      id: true,
      name: true,
      type: true,
    }

    return await this.roleService.getList({
      ..._kwargs,
      where,
      select,
    })
  }

  @ApiRequestData({
    summary: ROLE_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.ROLE,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: RoleResponseDetailDto,
    },
  })
  @Get('/new')
  async new(): Promise<IResponseData> {
    const [role, policies] = await this.roleService.getWithAllPolicies()
    return {
      data: {
        role,
        fullPolicies: policies,
      },
    }
  }

  @ApiRequestData({
    summary: ROLE_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.ROLE,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: RoleResponseDetailDto,
    },
  })
  @Get('/:id')
  async get(@RequestParam('id', RoleLimitedTypePipe) id: number): Promise<IResponseData> {
    const [role, policies] = await this.roleService.getWithAllPolicies(id)
    return {
      data: {
        role,
        fullPolicies: policies,
      },
    }
  }

  @ApiRequestData({
    summary: ROLE_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.ROLE,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: RoleResponseDetailDto,
    },
  })
  @Put('/:id')
  async update(
    @RequestBody() body: RoleRequestUpdateDto,
    @RequestParam('id', RoleNotSelfPipe, RoleLimitedTypePipe) id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
    @AuthJwtPayload('user.roleType') requesterType: EnumRoleType,
  ): Promise<IResponseData> {
    const { policies, ...dto } = body
    if (dto.type) {
      this.roleService.assertCanManageType(requesterType, dto.type)
    }
    const data = { ...dto, updatedBy }
    const updated = await this.roleService.update(id, data, {
      policies,
    })

    return { data: updated }
  }

  @ApiRequestData({
    summary: ROLE_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.ROLE,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: RoleResponseDetailDto,
    },
  })
  @Post('/')
  async create(
    @RequestBody() body: RoleRequestCreateDto,
    @AuthJwtPayload('user.id') createdBy: number,
    @AuthJwtPayload('user.roleType') requesterType: EnumRoleType,
  ): Promise<IResponseData> {
    const { policies, ...data } = body
    this.roleService.assertCanManageType(requesterType, data.type ?? EnumRoleType.USER)
    const created = await this.roleService.create({ ...data, createdBy }, { policies })
    return { data: created }
  }

  @ApiRequestData({
    summary: ROLE_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.ROLE,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.DELETE],
          },
        ],
      },
    },
  })
  @Delete('/:id')
  async delete(@RequestParam('id', RoleLimitedTypePipe) id: number): Promise<IResponseData> {
    await this.roleService.delete(id)

    return { data: { status: true } }
  }

  @ApiRequestData({
    summary: ROLE_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.ROLE,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: RoleResponseDetailDto,
    },
  })
  @Put('/:id/active')
  async active(
    @RequestParam('id', RoleLimitedTypePipe) id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const updated = await this.roleService.change(id, {
      isActive: true,
      updatedBy,
    })

    return { data: updated }
  }

  @ApiRequestData({
    summary: ROLE_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.ROLE,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: RoleResponseDetailDto,
    },
  })
  @Put('/:id/inactive')
  async inactive(
    @RequestParam('id', RoleNotSelfPipe, RoleLimitedTypePipe) id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const updated = await this.roleService.change(id, {
      isActive: false,
      updatedBy,
    })

    return { data: updated }
  }
}
