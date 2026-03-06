import { Injectable } from '@nestjs/common';
import { generateNewsletterSubscriptionEmail } from 'src/helpers/generateNewsletterSubscriptionEmail';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class NewsletterService {


 constructor(private mailService: MailService) {}

    
    async handleWelcomeNewsletterEmail(data) {
     
        console.log(`Sending welcome newsletter email to ${data.email}`);
         await this.mailService.sendMail(
                    data.email,
                    'Welcome to Our Newsletter',
                    generateNewsletterSubscriptionEmail(data.email)
                );
        
    }

    async handleSendNewsletterBulk(data: { emails: string[]; html: string; subject?: string }) {
        const emails = Array.isArray(data.emails) ? data.emails.filter(Boolean) : [];
        if (!emails.length) {
            return { success: false, message: 'No newsletter recipients provided', sentCount: 0 };
        }

        const subject = data.subject?.trim() || 'Hygieia Newsletter';
        const html = data.html;

        const sendResults = await Promise.allSettled(
            emails.map((email) => this.mailService.sendMail(email, subject, html)),
        );

        const sentCount = sendResults.filter((result) => result.status === 'fulfilled').length;
        const failedCount = sendResults.length - sentCount;

        return {
            success: failedCount === 0,
            message:
                failedCount === 0
                    ? 'Newsletter sent to all recipients'
                    : 'Newsletter sent with partial failures',
            sentCount,
            failedCount,
        };
    }
}
