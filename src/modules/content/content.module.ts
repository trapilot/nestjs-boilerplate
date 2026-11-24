import { Module } from '@nestjs/common'
import { ContentService } from './services/content.service'

@Module({
  providers: [ContentService],
  exports: [ContentService],
  imports: [],
})
export class ContentModule {}
