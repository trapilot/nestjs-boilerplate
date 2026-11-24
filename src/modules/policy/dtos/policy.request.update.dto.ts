import { OmitType } from '@nestjs/swagger'
import { PolicyRequestCreateDto } from './policy.request.create.dto'

export class PolicyRequestUpdateDto extends OmitType(PolicyRequestCreateDto, [] as const) {}
