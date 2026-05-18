import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { FeedbackMailerService } from './feedback.service'

@Controller()
export class FeedbackMailerController {
  constructor(private readonly feedbackMailerService: FeedbackMailerService) { }

  @MessagePattern({ cmd: 'send-feedback-form-email' })
  async handleSendFeedbackFormEmail(
    @Payload()
    data: {
      emails: string[]
      formId: string
      title: string
      description?: string
      expiryDate: string
    },
  ) {
    return this.feedbackMailerService.sendFeedbackFormEmails(data)
  }
}
