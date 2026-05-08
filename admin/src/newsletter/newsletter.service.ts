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

    const prompt = `You are an elite email designer specializing in modern, premium health-tech newsletters.
Generate a production-ready responsive HTML email newsletter.
Return ONLY raw HTML — no markdown fences, no commentary, no explanation. Start with <!DOCTYPE html>.

Newsletter idea / topic:
${idea}

BRAND IDENTITY — Hygieia (modern digital health platform):
- Brand voice: Trustworthy, clean, forward-thinking, warm.
- Logo text: "HYGIEIA" in bold uppercase, letter-spacing: 3px.

COLOR PALETTE (use these exclusively):
- Primary Teal:    #008396  — hero backgrounds, headings, primary buttons
- Mint Accent:     #46bba5  — secondary accents, subtle highlights, gradient partner
- Coral Pop:       #ff1c6c  — small accent pops only (tags, badges, tiny highlights)
- Off-White:       #fbf9ea  — main body background
- Deep Slate:      #001016  — body text, footer background
- Forest Green:    #17433b  — subheadings, secondary text

DESIGN SYSTEM (modern 2025+ email aesthetics):
1. LAYOUT:
   - Table-based layout for email-client compatibility, all CSS inline.
   - Single-column, centered, max-width 600px, with 24px horizontal padding.
   - Use MSO conditionals for Outlook compatibility.
2. HERO SECTION:
   - Full-width gradient background: linear-gradient(135deg, #008396, #46bba5).
   - For email fallback, use background-color: #008396.
   - Large white headline (28–32px, bold, line-height 1.3) with a short subtitle (16px, rgba white 85%).
   - Generous vertical padding (48px top/bottom).
3. TYPOGRAPHY:
   - Font stack: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif.
   - Body text: #001016, 16px, line-height 1.7 for readability.
   - Headings: #008396 or #17433b, bold, with clear size hierarchy (h1: 28px, h2: 22px, h3: 18px).
   - Use generous letter-spacing on section labels (1.5px, uppercase, 12px, #46bba5).
4. CONTENT BLOCKS:
   - Wrap key content sections in rounded-corner card-style containers (background: #ffffff, border-radius: 12px, padding: 28px 24px, border: 1px solid #e8e8e8).
   - Use subtle top-border accents on cards (3px solid #46bba5) for visual interest.
   - Add 20px vertical spacing between cards.
5. DIVIDERS:
   - Use thin (1px) gradient-look dividers: border-top: 2px solid #46bba5 with 50% width, centered, margin 32px auto.
6. CTA BUTTON:
   - Pill-shaped (border-radius: 50px), background: #008396, color: #ffffff.
   - Padding: 16px 40px, font-size: 16px, font-weight: 600, no underline.
   - Centered in its own table cell. Add a subtle box-shadow effect if possible.
   - On hover-capable clients, slightly darker background.
   - Link to: https://hygieia-frontend.vercel.app/blogs
7. FOOTER:
   - Background: #001016, color: rgba(255,255,255,0.7), padding: 32px 24px.
   - Include: © ${new Date().getFullYear()} Hygieia. All rights reserved.
   - Small links: Website (https://hygieia-frontend.vercel.app) | Blogs (https://hygieia-frontend.vercel.app/blogs)
   - "You received this because you subscribed to the Hygieia newsletter."
   - Include an unsubscribe placeholder link.
   - Today's date: ${new Date().toLocaleDateString()}
8. HEADER / NAV BAR:
   - Clean top bar with white/off-white background, "HYGIEIA" logo text on the left in #008396 (bold, 22px, letter-spacing: 3px).
   - Optional subtle bottom-border: 2px solid #46bba5.
9. NO IMAGES — rely entirely on typography, color, spacing, and layout for visual impact.
10. WHITESPACE: Be generous. Use at least 24px padding in content areas, 16px between paragraphs. Let the design breathe.
11. MOBILE RESPONSIVE: Include a <style> block with @media queries for max-width:600px to stack content and adjust font sizes.

CRITICAL: Make this look like a premium 2025 health-tech newsletter — clean, spacious, modern. NOT a generic corporate email from 2015.
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

    const prompt = `You are an elite email designer specializing in modern, premium health-tech newsletters.
Convert this blog post into a stunning, production-ready responsive HTML email newsletter.
Return ONLY raw HTML — no markdown fences, no commentary, no explanation. Start with <!DOCTYPE html>.

BLOG POST DETAILS:
Title: ${blogpost.title}
Author: ${blogpost.author || 'Hygieia Team'}
Excerpt: ${blogpost.excerpt || ''}
Category: ${blogpost.category || ''}
Tags: ${blogpost.tags?.join(', ') || ''}
Read Time: ${blogpost.readTime || ''} minutes
Content (markdown — convert to beautiful HTML):
${blogpost.content}

BRAND IDENTITY — Hygieia (modern digital health platform):
- Brand voice: Trustworthy, clean, forward-thinking, warm.
- Logo text: "HYGIEIA" in bold uppercase, letter-spacing: 3px.

COLOR PALETTE (use these exclusively):
- Primary Teal:    #008396  — hero backgrounds, headings, primary buttons
- Mint Accent:     #46bba5  — secondary accents, subtle highlights, gradient partner
- Coral Pop:       #ff1c6c  — small accent pops only (category badge, tags)
- Off-White:       #fbf9ea  — main body background
- Deep Slate:      #001016  — body text, footer background
- Forest Green:    #17433b  — subheadings, secondary text, author name

DESIGN SYSTEM (modern 2025+ email aesthetics):
1. LAYOUT:
   - Table-based layout for email-client compatibility, all CSS inline.
   - Single-column, centered, max-width 600px, with 24px horizontal padding.
   - Use MSO conditionals for Outlook compatibility.
2. HERO SECTION:
   - Full-width gradient background: linear-gradient(135deg, #008396, #46bba5).
   - For email fallback, use background-color: #008396.
   - Blog title as large white headline (28–32px, bold, line-height 1.3).
   - Blog excerpt as subtitle below (16px, rgba white 85%).
   - Generous vertical padding (48px top/bottom).
3. METADATA BAR (below hero):
   - Clean horizontal layout showing: Author (with a small "By" prefix in #17433b), Category (as a small pill badge with background #ff1c6c, white text, border-radius 20px, font-size 11px, uppercase), Read Time (with a clock emoji or "📖"), and Date.
   - Use 14px font, color #17433b, padding 16px 24px, background #ffffff.
   - Separate items with subtle "·" dot dividers.
4. TYPOGRAPHY:
   - Font stack: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif.
   - Body text: #001016, 16px, line-height 1.7 for readability.
   - Headings: #008396 or #17433b, bold, clear hierarchy (h2: 22px, h3: 18px).
   - Use generous letter-spacing on section labels (1.5px, uppercase, 12px, #46bba5).
5. CONTENT AREA:
   - Render the blog markdown as well-formatted HTML inside a white card container.
   - Card style: background #ffffff, border-radius: 12px, padding: 32px 28px, border: 1px solid #e8e8e8.
   - Add subtle top-border accent on the card (3px solid #46bba5).
   - Properly format: paragraphs, headings, bold, italic, lists (with #46bba5 bullet color), blockquotes (left-border: 4px solid #46bba5, background: #f0faf8, padding: 16px).
   - Code blocks if any: background #f5f5f5, border-radius 8px, padding 16px, font-family monospace.
6. TAGS SECTION:
   - Display tags as small pill badges below the content (background: #e8f7f5, color: #17433b, border-radius: 20px, padding: 4px 14px, font-size: 12px, display: inline-block, margin: 4px).
7. CTA BUTTON:
   - Text: "Read Full Article" or "Continue Reading"
   - Pill-shaped (border-radius: 50px), background: #008396, color: #ffffff.
   - Padding: 16px 40px, font-size: 16px, font-weight: 600, no underline.
   - Centered in its own table cell.
   - Link to: https://hygieia-frontend.vercel.app/blogs/${blogpostId}
8. DIVIDERS:
   - Thin (1px) dividers: border-top: 2px solid #46bba5, 50% width, centered, margin 32px auto.
9. HEADER / NAV BAR:
   - Clean top bar with white/off-white background, "HYGIEIA" logo text on the left in #008396 (bold, 22px, letter-spacing: 3px).
   - Subtle bottom-border: 2px solid #46bba5.
10. FOOTER:
    - Background: #001016, color: rgba(255,255,255,0.7), padding: 32px 24px.
    - Include: © ${new Date().getFullYear()} Hygieia. All rights reserved.
    - Small links: Website (https://hygieia-frontend.vercel.app) | Blogs (https://hygieia-frontend.vercel.app/blogs)
    - "You received this because you subscribed to the Hygieia newsletter."
    - Include an unsubscribe placeholder link.
    - Today's date: ${new Date().toLocaleDateString()}
11. NO IMAGES — rely entirely on typography, color, spacing, and layout for visual impact.
12. WHITESPACE: Be generous. Use at least 24px padding in content areas, 16px between paragraphs. Let the design breathe.
13. MOBILE RESPONSIVE: Include a <style> block with @media queries for max-width:600px to adjust font sizes and padding.

CRITICAL: This must look like a premium 2025 health-tech newsletter — clean, spacious, elegant. NOT a generic corporate email from 2015.
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
