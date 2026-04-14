import { Injectable } from '@nestjs/common';
import { generateCvReceivedEmail } from 'src/helpers/generateCvReceivedEmail';
import { generateCvShortlistedEmail } from 'src/helpers/generateCvShortlistedEmail';
import { generateCvRejectedEmail } from 'src/helpers/generateCvRejectedEmail';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class CvService {

  constructor(private mailService: MailService) {}

  async handleCvRecEmail(data: any) {
    console.log('[MAILER MS] CV received email data:', data);

    await this.mailService.sendMail(
      data.email,
      'Your CV has been received',
      generateCvReceivedEmail()
    );
  }

  async handleCvShortlistedEmail(data: any) {
    console.log('[MAILER MS] CV shortlisted email data:', data);

    await this.mailService.sendMail(
      data.email,
      'Great News! You\'ve Been Shortlisted',
      generateCvShortlistedEmail(data.fullName)
    );
  }

  async handleCvRejectedEmail(data: any) {
    console.log('[MAILER MS] CV rejected email data:', data);

    await this.mailService.sendMail(
      data.email,
      'Application Status Update',
      generateCvRejectedEmail(data.fullName)
    );
  }
}
