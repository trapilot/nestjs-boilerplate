import { registerAs } from '@nestjs/config'
import { IConfigDatabase, StrUtil } from 'lib/nest-core'

export default registerAs(
  'database',
  (): IConfigDatabase => ({
    replication: {
      provider: 'postgres',
      master: process.env.DATABASE_URL,
      slaves: StrUtil.split(process.env.REPLICA_URL, {
        delimiter: ',',
        allowEmpty: false,
      }),
    },
  }),
)
