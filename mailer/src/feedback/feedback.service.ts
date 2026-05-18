import { Injectable, Logger } from '@nestjs/common'
import { MailService } from 'src/mail/mail.service'
import { generateFeedbackFormEmail } from 'src/helpers/generateFeedbackFormEmail'

@Injectable()
export class FeedbackMailerService {
  private readonly logger = new Logger(FeedbackMailerService.name)

  constructor(private readonly mailService: MailService) {}

  async sendFeedbackFormEmails(data: {
    emails: string[]
    formId: string
    title: string
    description?: string
    expiryDate: string
  }) {
    const emails = Array.isArray(data.emails) ? data.emails.filter(Boolean) : []

    if (!emails.length) {
      this.logger.warn('No recipients provided for feedback form email')
      return { success: false, message: 'No recipients provided', sentCount: 0, failedCount: 0 }
    }

    this.logger.log(`Sending feedback form "${data.title}" to ${emails.length} recipient(s)`)

    const html = generateFeedbackFormEmail({
      formId: data.formId,
      title: data.title,
      description: data.description,
      expiryDate: data.expiryDate,
    })

    const results = await Promise.allSettled(
      emails.map((email) =>
        this.mailService.sendMail(email, `You're invited: ${data.title} — Hygieia Feedback`, html),
      ),
    )

    const sentCount = results.filter((r) => r.status === 'fulfilled').length
    const failedCount = results.length - sentCount

    if (failedCount > 0) {
      this.logger.warn(`${failedCount} email(s) failed out of ${emails.length} for form ${data.formId}`)
    }

    this.logger.log(`Feedback form emails sent: ${sentCount} success, ${failedCount} failed`)

    return {
      success: failedCount === 0,
      message:
        failedCount === 0
          ? `Feedback form sent to all ${sentCount} recipient(s)`
          : `Sent to ${sentCount}, failed for ${failedCount} recipient(s)`,
      sentCount,
      failedCount,
    }
  }
}
