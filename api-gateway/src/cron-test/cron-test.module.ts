import { Module } from '@nestjs/common'
import { CronTestController } from './cron-test.controller'
import { CronTestService } from './cron-test.service'

@Module({
  controllers: [CronTestController],
  providers: [CronTestService],
})
export class CronTestModule {}
