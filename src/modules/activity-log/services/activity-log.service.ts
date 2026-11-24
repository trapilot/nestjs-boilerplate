import { Injectable } from '@nestjs/common'
import { PrismaService } from 'lib/nest-prisma'

@Injectable()
export class ActivityLogService {
  constructor(private readonly _prisma: PrismaService) {}
}
