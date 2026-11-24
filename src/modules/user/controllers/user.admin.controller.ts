import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Post,
  Put,
  UploadedFile,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { EnumRoleType, Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from 'modules/activity-log/enums/activity-log.enum'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from 'app/enums/user.enum'
import { AuthJwtPayload, AuthUtil, EnumAuthScopeType } from 'lib/nest-auth'
import {
  EnumFileExtensionDocument,
  EnumFileExtensionImage,
  FILE_SIZE_IN_BYTES,
  FileExtensionPipe,
  HelperService,
  IFile,
} from 'lib/nest-core'
import {
  ApiRequestData,
  ApiRequestPaging,
  IResponseData,
  IResponsePaging,
  RequestBody,
  RequestBookType,
  RequestFilterDto,
  RequestListDto,
  RequestParam,
  RequestQueryFilterContain,
  RequestQueryFilterEqual,
  RequestQueryFilterInBoolean,
  RequestQueryList,
  RequestRequiredPipe,
} from 'lib/nest-web'
import { IActivityLogStagedEvent } from 'modules/activity-log/interfaces/activity-log.interface'
import { ActivityLogService } from 'modules/activity-log/services/activity-log.service'
import { USER_UPLOAD_IMAGE_PATH } from '../constants/users.constant'
import { USER_DOC_ADMIN_QUERY_LIST, USER_DOC_OPERATION } from '../constants/users.doc.constant'
import { UserRequestChangeAvatarDto } from '../dtos/user.request.change-avatar.dto'
import { UserRequestCreateDto } from '../dtos/user.request.create.dto'
import { UserRequestUpdateDto } from '../dtos/user.request.update.dto'
import { UserResponseDetailDto, UserResponseListDto } from '../dtos/user.response.detail.dto'
import { RoleService } from 'modules/role/services/role.service'
import { UserService } from '../services/user.service'

@ApiTags(USER_DOC_OPERATION)
@Controller({ path: '/users' })
export class UserAdminController {
  constructor(
    protected readonly authUtil: AuthUtil,
    protected readonly userService: UserService,
    protected readonly helperService: HelperService,
    protected readonly roleService: RoleService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Prepares the rows of an admin acting on a staff user: the actor row (owner = JWT admin) and,
   * unless the admin acts on their own account, the target row on the affected user.
   */
  private prepareActivityLogs(
    actorAction: EnumActivityLogAction,
    targetAction: EnumActivityLogAction,
    userId: number,
    actorUserId: number,
    isActive?: boolean,
  ): IActivityLogStagedEvent[] {
    const status = isActive === undefined ? {} : { isActive }
    const events = [
      this.activityLogService.prepare({
        action: actorAction,
        metadata: { userId, ...status },
      }),
    ]
    if (userId !== actorUserId) {
      events.push(
        this.activityLogService.prepare({
          action: targetAction,
          userId,
          createdBy: actorUserId,
          metadata: { actorUserId, ...status },
        }),
      )
    }
    return events
  }

  @ApiRequestPaging({
    summary: USER_DOC_OPERATION,
    queries: USER_DOC_ADMIN_QUERY_LIST,
    sortable: true,
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
            subject: EnumAuthAbilitySubject.USER,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: UserResponseListDto,
    },
  })
  @Get('/')
  async list(
    @RequestQueryList({
      defaultPerPage: 50,
      defaultOrderBy: 'isActive:desc|id:desc',
      availableOrderBy: ['id', 'isActive'],
    })
    { _search, _kwargs }: RequestListDto,
    @RequestBookType() bookType: EnumFileExtensionDocument,
    @RequestQueryFilterEqual('roleId', { parseAs: 'id' }) _role: RequestFilterDto,
    @RequestQueryFilterContain('phone') _phone: RequestFilterDto,
    @RequestQueryFilterContain('name') _name: RequestFilterDto,
    @RequestQueryFilterInBoolean('isActive') _enabled: RequestFilterDto,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.UserFindManyArgs = {
      ..._kwargs,
      where: {
        ..._search,
        ..._enabled,
        ..._name,
        ..._phone,
        ..._role,
      },
      include: {
        role: {
          select: { id: true, name: true, type: true, isActive: true },
        },
      },
    }

    return await this.userService.getPage(kwargs, {
      document: bookType,
    })
  }

  @ApiRequestData({
    summary: USER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.USER,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: UserResponseDetailDto,
    },
  })
  @Get('/:id')
  async get(@RequestParam('id') id: number): Promise<IResponseData> {
    const user = await this.userService.findOrFail(id, {
      include: {
        role: {
          select: { id: true, name: true, type: true, isActive: true },
        },
      },
    })
    return { data: user }
  }

  @ApiRequestData({
    summary: USER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    file: {
      single: {
        field: 'avatar',
        filePath: USER_UPLOAD_IMAGE_PATH,
        fileSize: FILE_SIZE_IN_BYTES,
      },
    },
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.USER,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: UserResponseDetailDto,
    },
  })
  @Post('/')
  async create(
    @RequestBody() body: UserRequestCreateDto,
    @UploadedFile(
      FileExtensionPipe([
        EnumFileExtensionImage.JPEG,
        EnumFileExtensionImage.JPG,
        EnumFileExtensionImage.PNG,
      ]),
    )
    file: IFile,
    @AuthJwtPayload('user.id') createdBy: number,
    @AuthJwtPayload('user.roleType') requesterType: EnumRoleType,
  ): Promise<IResponseData> {
    const { roleId, password, ...data } = body
    await this.roleService.assertCanAssign(requesterType, roleId)
    const { passwordHash } = this.authUtil.passwordCreate(password)
    const created = await this.userService.create(
      {
        ...data,
        password: passwordHash,
        avatar: file?.path ?? undefined,
      },
      { roleId },
    )
    // Autoincrement id: the events can only be prepared once the row exists
    this.activityLogService.stagePrepared(
      this.prepareActivityLogs(
        EnumActivityLogAction.adminUserCreate,
        EnumActivityLogAction.userCreatedByAdmin,
        created.id,
        createdBy,
      ),
    )

    return {
      data: created,
    }
  }

  @ApiRequestData({
    summary: USER_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.USER,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: UserResponseDetailDto,
    },
  })
  @Put('/:id')
  async update(
    @RequestParam('id') id: number,
    @RequestBody() body: UserRequestUpdateDto,
    @AuthJwtPayload('user.id') userId: number,
    @AuthJwtPayload('user.roleType') requesterType: EnumRoleType,
  ): Promise<IResponseData> {
    const { roleId, ...data } = body

    if (roleId) {
      await this.roleService.assertCanAssign(requesterType, roleId)
    }

    if (userId === id) {
      const user = await this.userService.findOrFail(id)

      if (user.isActive && user.isActive !== data.isActive) {
        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'auth.error.notSelf',
        })
      }

      if (roleId && roleId !== user.roleId) {
        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'auth.error.notSelf',
        })
      }
    }

    if (data?.password) {
      const authPassword = this.authUtil.passwordCreate(data.password)
      data.password = authPassword.passwordHash
    }

    const events = this.prepareActivityLogs(
      EnumActivityLogAction.adminUserUpdate,
      EnumActivityLogAction.userUpdatedByAdmin,
      id,
      userId,
      data.isActive,
    )
    const updated = await this.userService.update(id, data, { roleId })
    this.activityLogService.stagePrepared(events)
    return {
      data: updated,
    }
  }

  @ApiRequestData({
    summary: USER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    file: {
      single: {
        field: 'avatar',
        filePath: USER_UPLOAD_IMAGE_PATH,
        fileSize: FILE_SIZE_IN_BYTES,
      },
    },
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.USER,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: UserResponseDetailDto,
    },
  })
  @Put('/:id/change-avatar')
  async changeAvatar(
    @RequestBody() _body: UserRequestChangeAvatarDto,
    @RequestParam('id') id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
    @UploadedFile(
      RequestRequiredPipe,
      FileExtensionPipe([
        EnumFileExtensionImage.JPEG,
        EnumFileExtensionImage.JPG,
        EnumFileExtensionImage.PNG,
      ]),
    )
    file: IFile,
  ): Promise<IResponseData> {
    const events = this.prepareActivityLogs(
      EnumActivityLogAction.adminUserUpdatePhotoProfile,
      EnumActivityLogAction.userUpdatePhotoProfileByAdmin,
      id,
      updatedBy,
    )
    const user = await this.userService.findOrFail(id)
    const updated = await this.userService.changeAvatar(user, {
      avatar: file?.path ?? undefined,
      updatedBy,
    })
    this.activityLogService.stagePrepared(events)

    return {
      data: updated,
    }
  }
}
