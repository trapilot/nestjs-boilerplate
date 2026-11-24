import { Injectable } from '@nestjs/common'
import { EnumActivityLogAction } from '../enums/activity-log.enum'
import { APP_LANGUAGE, IRequestApp, MessageService } from 'lib/nest-core'
import { PrismaUtil } from 'lib/nest-prisma'
import { UAParser } from 'ua-parser-js'
import { IActivityLogMetadata, IActivityLogRequestInfo } from '../interfaces/activity-log.interface'

@Injectable()
export class ActivityLogUtil {
  constructor(private readonly messageService: MessageService) {}

  /**
   * Human-readable description from the `activityLog.<action>` i18n key, interpolating metadata.
   * Always rendered in the default app language so stored rows are consistent.
   */
  getDescription(action: EnumActivityLogAction, metadata: IActivityLogMetadata): string {
    return this.messageService.setMessage(`activityLog.${action}`, {
      customLanguage: APP_LANGUAGE,
      properties: metadata,
    })
  }

  /** Request context captured once per request: caller (JWT), IP and user agent. */
  getRequestInfo(request: IRequestApp): IActivityLogRequestInfo {
    const scopeType = request.user?.scopeType
    const id = Number(request.user?.user?.id)

    return {
      payload: scopeType && Number.isInteger(id) && id > 0 ? { scopeType, id } : null,
      ipAddress: request.ip ?? null,
      userAgent: PrismaUtil.toPlainObject(this.parseUserAgent(request)),
    }
  }

  // Same resolution as the RequestUserAgent decorator: the app's x-user-agent first, then the header
  private parseUserAgent(request: IRequestApp): object {
    try {
      const custom = request.headers['x-user-agent']
      if (typeof custom === 'string' && custom) {
        return JSON.parse(custom)
      }
    } catch {}
    return new UAParser(request.headers['user-agent']).getResult()
  }
}
