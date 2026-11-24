import { Controller, Delete, Get, Put, UploadedFile } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthJwtPayload, EnumAuthScopeType } from 'lib/nest-auth'
import { EnumFileExtensionImage, FileExtensionPipe, IFile } from 'lib/nest-core'
import { ApiRequestData, IResponseData, RequestBody, RequestRequiredPipe } from 'lib/nest-web'
import { CUSTOMER_UPLOAD_IMAGE_PATH } from '../constants/customer.constant'
import { CUSTOMER_DOC_OPERATION } from '../constants/customer.doc.constant'
import { CustomerCloseProfileRequestDto } from '../dtos/customer.request.close-profile.dto'
import { CustomerEditProfileRequestDto } from '../dtos/customer.request.edit-profile.dto'
import { CustomerProfileResponseDto } from '../dtos/customer.response.profile.dto'
import { CustomerService } from '../services/customer.service'

@ApiTags(CUSTOMER_DOC_OPERATION)
@Controller({ version: '1', path: '/customer' })
export class CustomerAppController {
  constructor(protected readonly customerService: CustomerService) {}

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.CUSTOMER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        unique: false,
      },
    },
    response: {
      dto: CustomerProfileResponseDto,
    },
  })
  @Get('/profile')
  async getProfile(@AuthJwtPayload('user.id') customerId: number): Promise<IResponseData> {
    const profile = await this.customerService.getProfile(customerId)
    return { data: profile }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.CUSTOMER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        unique: false,
      },
    },
    response: {
      dto: CustomerProfileResponseDto,
    },
  })
  @Put('/edit-profile')
  async editProfile(
    @RequestBody() body: CustomerEditProfileRequestDto,
    @AuthJwtPayload('user.id') customerId: number,
  ): Promise<IResponseData> {
    const profile = await this.customerService.editProfile(customerId, body)

    return { data: profile }
  }

  @ApiRequestData({
    summary: CUSTOMER_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.CUSTOMER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        unique: false,
      },
    },
  })
  @Delete('/close')
  async closeProfile(
    @RequestBody() body: CustomerCloseProfileRequestDto,
    @AuthJwtPayload('user.id') customerId: number,
  ): Promise<IResponseData> {
    await this.customerService.closeProfile(customerId, body.reasons)

    return { data: { id: customerId } }
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
      scope: EnumAuthScopeType.CUSTOMER,
      user: {
        synchronize: true,
        require: true,
        active: true,
        unique: false,
      },
    },
    response: {
      dto: CustomerEditProfileRequestDto,
    },
  })
  @Put('upload-avatar')
  async uploadAvatar(
    @AuthJwtPayload('user.id') customerId: number,
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
    await this.customerService.update(customerId, {
      avatar: file?.path,
    })
    const profile = await this.customerService.getProfile(customerId)
    return { data: profile }
  }

  // @ApiRequestData({
  //   summary: CUSTOMER_DOC_OPERATION,
  //   docExclude: false,
  //   docExpansion: false,
  //   jwtAccessToken: {
  //     scope: EnumAuthScopeType.CUSTOMER,
  //     user: {
  //       synchronize: true,
  //       require: true,
  //       active: true,
  //       unique: false,
  //     },
  //   },
  //   rateLimit: {
  //     short: { limit: 3, seconds: 1 },
  //     medium: { limit: 5, seconds: 60 },
  //   },
  //   response: {
  //     dto: CustomerProfileResponseDto,
  //   },
  // })
  // @Put('/change-password')
  // async changePassword(
  //   @RequestBody() body: CustomerChangePasswordRequestDto,
  //   @AuthJwtPayload('user.id') customerId: number,
  // ): Promise<IResponseData> {
  //   const customer = await this.customerService.findOrFail(customerId)
  //   const updated = await this.customerService.changePassword(customer, body)
  //   return { data: updated }
  // }
}
