import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GoogleGenAI } from '@google/genai';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
  ) {}

  async generateNewsletterHtml(idea: string): Promise<string> {
    if (!idea?.trim()) {
      throw new BadRequestException('Newsletter idea is required');
    }

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured');
    }

    const model = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    const client = new GoogleGenAI({ apiKey });

    const prompt = `Generate a production-ready responsive HTML email newsletter.
Return ONLY raw HTML (no markdown, no code fences, no explanation).

Newsletter idea:
${idea}

Design requirements:
- Must be email-client friendly and responsive for mobile using table-based layout and inline CSS.
- Must include viewport meta and semantic email sections (header, hero, body, CTA, footer).
- Keep width centered, max width around 600px.
- Use these colors only:
  - #008396 (soft blue)
  - #46bba5 (mint green)
  - #ff1c6c (soft coral)
  - #fbf9ea (snow white)
  - #001016 (dark slate gray)
  - #17433b (cool gray)
- Ensure good text contrast and accessible font sizing.
- Include a clear CTA button.
- Include a footer note suitable for newsletters. note today's date is ${new Date().toLocaleDateString()} and our website is hygieia-frontend.vercel.app with blogs at /blogs.
- no images section 
- our website is hygieia-frontend.vercel.app and /blogs for blogs pages
`;

    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
      });

      const generated = this.extractText(response)?.trim();
      if (!generated || !generated.includes('<html')) {
        throw new InternalServerErrorException(
          'Failed to generate valid newsletter HTML',
        );
      }

      return this.stripCodeFence(generated);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Newsletter generation failed');
    }
  }

  async sendNewsletterToAll(html: string, subject?: string) {
    if (!html?.trim()) {
      throw new BadRequestException('Newsletter HTML is required');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('newsletter')
      .select('email');

    if (error) {
      throw new InternalServerErrorException('Failed to fetch newsletter subscribers');
    }

    const emails = (data || [])
      .map((row) => row.email)
      .filter((email): email is string => Boolean(email));

    const resolvedSubject = subject?.trim() || 'Hygieia Newsletter';

    if (!emails.length) {
      const result = {
        success: false,
        message: 'No newsletter subscribers found',
        recipientCount: 0,
      };

      await this.logSentNewsletter({
        type: 'manual',
        subject: resolvedSubject,
        html,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
        status: 'no_recipients',
      });

      return result;
    }

    try {
      const mailerResult = await firstValueFrom(
        this.mailerClient.send(
          { cmd: 'send-newsletter-bulk' },
          {
            emails,
            html,
            subject: resolvedSubject,
          },
        ),
      );

      const result = {
        ...mailerResult,
        recipientCount: emails.length,
      };

      await this.logSentNewsletter({
        type: 'manual',
        subject: resolvedSubject,
        html,
        recipientCount: emails.length,
        sentCount: this.toNumber(mailerResult?.sentCount),
        failedCount: this.toNumber(mailerResult?.failedCount),
        status: 'sent',
      });

      return result;
    } catch (error) {
      await this.logSentNewsletter({
        type: 'manual',
        subject: resolvedSubject,
        html,
        recipientCount: emails.length,
        sentCount: 0,
        failedCount: emails.length,
        status: 'failed',
        error: this.errorMessage(error),
      });

      throw new InternalServerErrorException('Newsletter send failed');
    }
  }

  private extractText(response: unknown): string {
    if (
      response &&
      typeof response === 'object' &&
      'text' in response &&
      typeof (response as { text?: unknown }).text === 'string'
    ) {
      return (response as { text: string }).text;
    }

    const fallback = response as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    return fallback.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async sendBlogpostAsNewsletter(blogpostId: string) {
    if (!blogpostId?.trim()) {
      throw new BadRequestException('Blogpost ID is required');
    }

    // Fetch the blogpost
    const { data: blogpost, error } = await this.supabaseService
      .getClient()
      .from('blogpost')
      .select('*')
      .eq('id', blogpostId)
      .single();

    if (error || !blogpost) {
      throw new BadRequestException('Blogpost not found');
    }

    // Generate newsletter HTML from blogpost content
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured');
    }

    const model = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    const client = new GoogleGenAI({ apiKey });

    const prompt = `Convert this blog post into a production-ready responsive HTML email newsletter.
Return ONLY raw HTML (no markdown, no code fences, no explanation).

Blog Post Details:
Title: ${blogpost.title}
Author: ${blogpost.author || 'Hygieia Team'}
Excerpt: ${blogpost.excerpt || ''}
Category: ${blogpost.category || ''}
Tags: ${blogpost.tags?.join(', ') || ''}
Read Time: ${blogpost.readTime || ''} minutes
Content (in markdown):
${blogpost.content}

Design requirements:
- Must be email-client friendly and responsive for mobile using table-based layout and inline CSS.
- Must include viewport meta and semantic email sections (header, hero, body, CTA, footer).
- Keep width centered, max width around 600px.
- Use these colors only:
  - #008396 (soft blue)
  - #46bba5 (mint green)
  - #ff1c6c (soft coral)
  - #fbf9ea (snow white)
  - #001016 (dark slate gray)
  - #17433b (cool gray)
- Ensure good text contrast and accessible font sizing.
- Convert the markdown content properly to HTML with proper formatting.
- Include the blog title as a prominent heading.
- Show author, category, tags, and read time in metadata section.
- Include a clear CTA button that links to the full blog post at: https://hygieia-frontend.vercel.app/blogs/${blogpostId}
- Include a footer note. Today's date is ${new Date().toLocaleDateString()} and our website is hygieia-frontend.vercel.app with blogs at /blogs.
- Make it visually appealing and professional.
`;

    let html: string;
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
      });

      const generated = this.extractText(response)?.trim();
      if (!generated || !generated.includes('<html')) {
        throw new InternalServerErrorException(
          'Failed to generate valid newsletter HTML from blogpost',
        );
      }

      html = this.stripCodeFence(generated);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Newsletter generation from blogpost failed');
    }

    // Send newsletter to all subscribers
    const { data: subscribers, error: subscribersError } = await this.supabaseService
      .getClient()
      .from('newsletter')
      .select('email');

    if (subscribersError) {
      throw new InternalServerErrorException('Failed to fetch newsletter subscribers');
    }

    const emails = (subscribers || [])
      .map((row) => row.email)
      .filter((email): email is string => Boolean(email));

    if (!emails.length) {
      const result = {
        success: false,
        message: 'No newsletter subscribers found',
        recipientCount: 0,
        blogpost: {
          id: blogpost.id,
          title: blogpost.title,
        },
      };

      await this.logSentNewsletter({
        type: 'blogpost',
        subject: `${blogpost.title} - Hygieia Blog`,
        html,
        blogpostId: blogpost.id,
        newsletterLink: `https://hygieia-frontend.vercel.app/blogs/${blogpost.id}`,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
        status: 'no_recipients',
      });

      return result;
    }

    const subject = `${blogpost.title} - Hygieia Blog`;
    const newsletterLink = `https://hygieia-frontend.vercel.app/blogs/${blogpost.id}`;

    try {
      const mailerResult = await firstValueFrom(
        this.mailerClient.send(
          { cmd: 'send-newsletter-bulk' },
          {
            emails,
            html,
            subject,
          },
        ),
      );

      const result = {
        ...mailerResult,
        recipientCount: emails.length,
        blogpost: {
          id: blogpost.id,
          title: blogpost.title,
          category: blogpost.category,
        },
      };

      await this.logSentNewsletter({
        type: 'blogpost',
        subject,
        html,
        blogpostId: blogpost.id,
        newsletterLink,
        recipientCount: emails.length,
        sentCount: this.toNumber(mailerResult?.sentCount),
        failedCount: this.toNumber(mailerResult?.failedCount),
        status: 'sent',
      });

      return result;
    } catch (error) {
      await this.logSentNewsletter({
        type: 'blogpost',
        subject,
        html,
        blogpostId: blogpost.id,
        newsletterLink,
        recipientCount: emails.length,
        sentCount: 0,
        failedCount: emails.length,
        status: 'failed',
        error: this.errorMessage(error),
      });

      throw new InternalServerErrorException('Blogpost newsletter send failed');
    }
  }

  async getSentNewsletters(limit = 20, offset = 0) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;

    const { data, error, count } = await this.supabaseService
      .getClient()
      .from('sent_newsletters')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch sent newsletters');
    }

    return {
      items: data || [],
      total: count || 0,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  private stripCodeFence(value: string): string {
    return value.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
  }

  private async logSentNewsletter(entry: {
    type: 'manual' | 'blogpost';
    subject: string;
    html: string;
    blogpostId?: string;
    newsletterLink?: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    status: 'sent' | 'failed' | 'no_recipients';
    error?: string;
  }): Promise<void> {
    const { error } = await this.supabaseService.getClient().from('sent_newsletters').insert({
      type: entry.type,
      subject: entry.subject,
      html: entry.html,
      blogpost_id: entry.blogpostId || null,
      newsletter_link: entry.newsletterLink || null,
      recipient_count: entry.recipientCount,
      sent_count: entry.sentCount,
      failed_count: entry.failedCount,
      status: entry.status,
      error: entry.error || null,
    });

    if (error) {
      throw new InternalServerErrorException('Failed to log sent newsletter');
    }
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const converted = Number(value);
      return Number.isFinite(converted) ? converted : 0;
    }

    return 0;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error';
  }
}
