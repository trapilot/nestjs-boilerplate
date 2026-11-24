import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator'
import { ToObject, ToString } from 'lib/nest-core'
import { RequestSentenceDto } from 'lib/nest-web'
import { EnumContentType } from '../enums/content.enum'

export class ContentRequestCreateDto {
  @IsNotEmpty()
  @IsObject()
  @ToObject({ type: RequestSentenceDto })
  @ApiProperty({ required: true, type: RequestSentenceDto })
  title: object

  @IsOptional()
  @IsObject()
  @ToObject({ type: RequestSentenceDto })
  @ApiProperty({ required: true, type: RequestSentenceDto })
  content: object

  @IsNotEmpty()
  @IsEnum(EnumContentType)
  @ToString()
  @ApiProperty({ required: true, enum: EnumContentType, enumName: 'EnumContentType' })
  type: EnumContentType

  @IsOptional()
  @ApiProperty({ required: false, type: 'string', format: 'binary' })
  thumbnail?: string
}
