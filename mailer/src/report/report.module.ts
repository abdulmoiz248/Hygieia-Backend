import { Module } from '@nestjs/common'
import { ReportController } from './report.controller'
import { ReportService } from './report.service'
import { MailService } from 'src/mail/mail.service'

@Module({
  controllers: [ReportController],
  providers: [ReportService, MailService],
})
export class ReportModule {}
