import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { EnumAuthScopeType } from 'lib/nest-auth'
import { ApiRequestData, IResponseData } from 'lib/nest-web'
import { CONTENT_DOC_OPERATION } from '../constants/content.doc.constant'
import { ContentResponseDetailDto } from '../dtos/content.response.detail.dto'
import { EnumContentType } from '../enums/content.enum'
import { ContentService } from '../services/content.service'

@ApiTags(CONTENT_DOC_OPERATION)
@Controller({ version: '1', path: '/contents' })
export class ContentAppController {
  constructor(protected readonly contentService: ContentService) {}

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.CUSTOMER,
      user: {
        synchronize: false,
        require: false,
      },
    },
    response: {
      dto: ContentResponseDetailDto,
    },
  })
  @Get('/terms-and-conditions')
  async getTAC(): Promise<IResponseData> {
    const content = await this.contentService.getFirst({
      where: {
        type: EnumContentType.TERM_AND_CONDITION,
        isActive: true,
      },
      orderBy: [{ sorting: 'desc' }, { id: 'desc' }],
    })
    return { data: content }
  }

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.CUSTOMER,
      user: {
        synchronize: false,
        require: false,
      },
    },
    response: {
      dto: ContentResponseDetailDto,
    },
  })
  @Get('/about-us')
  async getAboutUs(): Promise<IResponseData> {
    const content = await this.contentService.getFirst({
      where: {
        type: EnumContentType.ABOUT_US,
        isActive: true,
      },
      orderBy: [{ sorting: 'desc' }, { id: 'desc' }],
    })
    return { data: content }
  }

  @ApiRequestData({
    summary: CONTENT_DOC_OPERATION,
    docExclude: false,
    docExpansion: false,
    jwtAccessToken: {
      scope: EnumAuthScopeType.CUSTOMER,
      user: {
        synchronize: false,
        require: false,
      },
    },
    response: {
      dto: ContentResponseDetailDto,
    },
  })
  @Get('/privacy-policy')
  async getPrivatePolicy(): Promise<IResponseData> {
    const content = await this.contentService.getFirst({
      where: {
        type: EnumContentType.PRIVACY,
        isActive: true,
      },
      orderBy: [{ sorting: 'desc' }, { id: 'desc' }],
    })
    return { data: content }
  }
}
