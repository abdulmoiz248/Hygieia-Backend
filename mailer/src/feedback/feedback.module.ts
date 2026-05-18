import { Module } from '@nestjs/common'
import { FeedbackMailerController } from './feedback.controller'
import { FeedbackMailerService } from './feedback.service'
import { MailService } from 'src/mail/mail.service'

@Module({
  controllers: [FeedbackMailerController],
  providers: [FeedbackMailerService, MailService],
})
export class FeedbackMailerModule {}
