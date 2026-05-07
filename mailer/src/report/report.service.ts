import { Injectable } from '@nestjs/common'
import { MailService } from 'src/mail/mail.service'
import { ReportSubmittedDto } from './dto/report-submitted.dto'
import { generateReportAcknowledgementEmail } from 'src/helpers/generateReportAcknowledgementEmail'

@Injectable()
export class ReportService {
  constructor(private mailService: MailService) {}

  async handleReportSubmitted(data: ReportSubmittedDto) {
    console.log('Handling provider report acknowledgement email:', data)
    await this.mailService.sendMail(
      data.patient_email,
      'Your Report Has Been Received — Hygieia',
      generateReportAcknowledgementEmail({
        patient_name: data.patient_name,
        reported_provider_role: data.reported_provider_role,
        report_id: data.report_id,
      }),
    )
  }
}
