import { Controller, Get, Post, Put, UploadedFile } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Prisma } from '@runtime/prisma-client'
import { EnumActivityLogAction } from 'modules/activity-log/enums/activity-log.enum'
import { EnumAuthAbilityAction, EnumAuthAbilitySubject } from 'app/enums/user.enum'
import { AuthJwtPayload, AuthUtil, EnumAuthScopeType } from 'lib/nest-auth'
import {
  EnumFileExtensionDocument,
  EnumFileExtensionImage,
  FileExtensionPipe,
  IFile,
} from 'lib/nest-core'
import {
  ApiRequestData,
  ApiRequestList,
  ApiRequestPaging,
  IResponseData,
  IResponseList,
  IResponsePaging,
  RequestBody,
  RequestBookType,
  RequestFilterDto,
  RequestListDto,
  RequestParam,
  RequestQueryFilterContain,
  RequestQueryFilterInBoolean,
  RequestQueryList,
  RequestRequiredPipe,
} from 'lib/nest-web'
import { IActivityLogStagedEvent } from 'modules/activity-log/interfaces/activity-log.interface'
import { ActivityLogService } from 'modules/activity-log/services/activity-log.service'
import { CUSTOMER_UPLOAD_IMAGE_PATH } from '../constants/customer.constant'
import {
  CUSTOMER_DOC_ADMIN_QUERY_LIST,
  CUSTOMER_DOC_OPERATION,
} from '../constants/customer.doc.constant'
import { CustomerChangeAvatarRequestDto } from '../dtos/customer.request.change-avatar.dto'
import { CustomerRequestCreateDto } from '../dtos/customer.request.create.dto'
import { CustomerRequestUpdateDto } from '../dtos/customer.request.update.dto'
import {
  CustomerResponseDetailDto,
  CustomerResponseListDto,
} from '../dtos/customer.response.detail.dto'
import { CustomerService } from '../services/customer.service'

@ApiTags(CUSTOMER_DOC_OPERATION)
@Controller({ path: '/customers' })
export class CustomerAdminController {
  constructor(
    protected readonly authUtil: AuthUtil,
    protected readonly customerService: CustomerService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Prepares the two rows of an admin acting on a customer: the actor row (owner = JWT admin)
   * and the target row on the affected customer (createdBy = the admin).
   */
  private prepareActivityLogs(
    actorAction: EnumActivityLogAction,
    targetAction: EnumActivityLogAction,
    customerId: number,
    actorUserId: number,
    isActive?: boolean,
  ): IActivityLogStagedEvent[] {
    const status = isActive === undefined ? {} : { isActive }
    return [
      this.activityLogService.prepare({
        action: actorAction,
        metadata: { customerId, ...status },
      }),
      this.activityLogService.prepare({
        action: targetAction,
        customerId,
        createdBy: actorUserId,
        metadata: { actorUserId, ...status },
      }),
    ]
  }

  @ApiRequestPaging({
    summary: CUSTOMER_DOC_OPERATION,
    queries: CUSTOMER_DOC_ADMIN_QUERY_LIST,
    sortable: true,
    searchable: false,
    exportable: true,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: true,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.CUSTOMER,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: CustomerResponseListDto,
    },
  })
  @Get('/')
  async list(
    @RequestQueryList({
      defaultPerPage: 50,
      defaultOrderBy: 'id:desc',
      availableOrderBy: ['id'],
    })
    { _search, _kwargs }: RequestListDto,
    @RequestBookType() bookType: EnumFileExtensionDocument,
    @RequestQueryFilterContain('phone') _phone: RequestFilterDto,
    @RequestQueryFilterContain('email') _email: RequestFilterDto,
    @RequestQueryFilterContain('name') _name: RequestFilterDto,
    @RequestQueryFilterInBoolean('isActive') _enabled: RequestFilterDto,
  ): Promise<IResponsePaging> {
    const kwargs: Prisma.CustomerFindManyArgs = {
      ..._kwargs,
      where: {
        ..._search,
        ..._enabled,
        ..._phone,
        ..._email,
        ..._name,
      },
      include: {
        createdByUser: true,
        updatedByUser: true,
        deletedByUser: true,
      },
    }

    return await this.customerService.getPage(kwargs, {
      document: bookType,
      filePrefix: 'customers',
      fileTimestamp: true,
    })
  }

  @ApiRequestList({
    summary: CUSTOMER_DOC_OPERATION,
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
      dto: CustomerResponseListDto,
    },
  })
  @Get('/map-shorted')
  async mapShorted(
    @RequestQueryList({
      defaultOrderBy: 'name:asc',
      availableOrderBy: ['name'],
    })
    { _search, _kwargs }: RequestListDto,
  ): Promise<IResponseList> {
    return await this.customerService.getList({
      ..._kwargs,
      where: { ..._search },
      select: { id: true },
    })
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.USER,
      user: {
        synchronize: false,
        require: true,
        abilities: [
          {
            subject: EnumAuthAbilitySubject.CUSTOMER,
            actions: [EnumAuthAbilityAction.READ],
          },
        ],
      },
    },
    response: {
      dto: CustomerResponseDetailDto,
    },
  })
  @Get('/:id')
  async get(@RequestParam('id') id: number): Promise<IResponseData> {
    const customer = await this.customerService.findOrFail(id, {
      include: {
        createdByUser: true,
        updatedByUser: true,
        deletedByUser: true,
      },
    })

    return {
      data: customer,
    }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    file: {
      single: {
        field: 'avatar',
        filePath: CUSTOMER_UPLOAD_IMAGE_PATH,
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
            subject: EnumAuthAbilitySubject.CUSTOMER,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.CREATE],
          },
        ],
      },
    },
    response: {
      dto: CustomerResponseDetailDto,
    },
  })
  @Post('/')
  async create(
    @RequestBody() body: CustomerRequestCreateDto,
    @AuthJwtPayload('user.id') createdBy: number,
    @UploadedFile(
      FileExtensionPipe([
        EnumFileExtensionImage.JPEG,
        EnumFileExtensionImage.JPG,
        EnumFileExtensionImage.PNG,
      ]),
    )
    file: IFile,
  ): Promise<IResponseData> {
    const passwordHash = this.authUtil.passwordCreate(body.password)
    const customer = await this.customerService.create(
      { ...body, avatar: file?.path ?? undefined, createdBy },
      passwordHash,
    )
    // Autoincrement id: the events can only be prepared once the row exists
    this.activityLogService.stagePrepared(
      this.prepareActivityLogs(
        EnumActivityLogAction.adminCustomerCreate,
        EnumActivityLogAction.customerCreatedByAdmin,
        customer.id,
        createdBy,
      ),
    )

    return {
      data: customer,
    }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.CUSTOMER,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: CustomerResponseDetailDto,
    },
  })
  @Put('/:id')
  async put(
    @RequestBody() body: CustomerRequestUpdateDto,
    @RequestParam('id') customerId: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const events = this.prepareActivityLogs(
      EnumActivityLogAction.adminCustomerUpdate,
      EnumActivityLogAction.customerUpdatedByAdmin,
      customerId,
      updatedBy,
    )
    let password = undefined
    if (body?.password) {
      const { passwordHash } = this.authUtil.passwordCreate(body.password)
      password = passwordHash
    }

    const customer = await this.customerService.update(customerId, {
      ...body,
      password,
      updatedBy,
    })
    this.activityLogService.stagePrepared(events)

    return {
      data: customer,
    }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.CUSTOMER,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: CustomerResponseDetailDto,
    },
  })
  @Put('/:id/inactive')
  async inactive(
    @RequestParam('id') id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const events = this.prepareActivityLogs(
      EnumActivityLogAction.adminCustomerUpdateStatus,
      EnumActivityLogAction.customerBlocked,
      id,
      updatedBy,
      false,
    )
    const customer = await this.customerService.inactive(id)
    this.activityLogService.stagePrepared(events)
    return { data: customer }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
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
            subject: EnumAuthAbilitySubject.CUSTOMER,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: CustomerResponseDetailDto,
    },
  })
  @Put('/:id/active')
  async active(
    @RequestParam('id') id: number,
    @AuthJwtPayload('user.id') updatedBy: number,
  ): Promise<IResponseData> {
    const events = this.prepareActivityLogs(
      EnumActivityLogAction.adminCustomerUpdateStatus,
      EnumActivityLogAction.customerUpdateStatus,
      id,
      updatedBy,
      true,
    )
    const customer = await this.customerService.active(id)
    this.activityLogService.stagePrepared(events)
    return { data: customer }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    file: {
      single: {
        field: 'avatar',
        filePath: CUSTOMER_UPLOAD_IMAGE_PATH,
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
            subject: EnumAuthAbilitySubject.CUSTOMER,
            actions: [EnumAuthAbilityAction.READ, EnumAuthAbilityAction.UPDATE],
          },
        ],
      },
    },
    response: {
      dto: CustomerResponseDetailDto,
    },
  })
  @Put('/:id/change-avatar')
  async update(
    @RequestBody() _body: CustomerChangeAvatarRequestDto,
    @RequestParam('id') customerId: number,
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
      EnumActivityLogAction.adminCustomerUpdatePhotoProfile,
      EnumActivityLogAction.customerUpdatePhotoProfileByAdmin,
      customerId,
      updatedBy,
    )
    const customer = await this.customerService.findOrFail(customerId)
    const updated = await this.customerService.changeAvatar(customer, {
      avatar: file?.path ?? undefined,
      updatedBy,
    })
    this.activityLogService.stagePrepared(events)

    return {
      data: updated,
    }
  }
}
