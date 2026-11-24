import { OmitType } from '@nestjs/swagger'
import { ContentRequestCreateDto } from './content.request.create.dto'

export class ContentRequestUpdateDto extends OmitType(ContentRequestCreateDto, ['type'] as const) {}
