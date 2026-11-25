import { Module } from '@nestjs/common'

/**
 * Empty stand-ins for DataMockModule / DataSeedModule. Production builds
 * (BUILD_EXCLUDE_DATA=true) replace data.mock.module and data.seed.module with this file via
 * webpack.config.js, so no seed or mock code is bundled. Never import it directly.
 */
@Module({})
export class DataMockModule {}

@Module({})
export class DataSeedModule {}
