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
        const baseHtml = data.html;

        const sendResults = await Promise.allSettled(
            emails.map((email) => {
                const unsubscribeUrl = `https://hygieia-frontend.vercel.app/unsubscribe-newsletter?email=${encodeURIComponent(email)}`;
                // Replace any placeholder unsubscribe href in the AI-generated HTML
                let personalizedHtml = baseHtml.replace(
                    /href="[^"]*unsubscribe[^"]*"/gi,
                    `href="${unsubscribeUrl}"`,
                );
                // If no placeholder was found, append an unsubscribe footer
                if (!personalizedHtml.includes(unsubscribeUrl)) {
                    const unsubscribeFooter = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align:center;padding:16px;"><tr><td><a href="${unsubscribeUrl}" style="color:rgba(255,255,255,0.7);font-size:12px;text-decoration:underline;">Unsubscribe from this newsletter</a></td></tr></table>`;
                    personalizedHtml = personalizedHtml.replace(
                        /<\/body>/i,
                        `${unsubscribeFooter}</body>`,
                    );
                }
                return this.mailService.sendMail(email, subject, personalizedHtml);
            }),
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
