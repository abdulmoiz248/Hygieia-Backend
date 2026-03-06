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

    if (!emails.length) {
      return {
        success: false,
        message: 'No newsletter subscribers found',
        recipientCount: 0,
      };
    }

    const mailerResult = await firstValueFrom(
      this.mailerClient.send(
        { cmd: 'send-newsletter-bulk' },
        {
          emails,
          html,
          subject: subject?.trim() || 'Hygieia Newsletter',
        },
      ),
    );

    return {
      ...mailerResult,
      recipientCount: emails.length,
    };
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

  private stripCodeFence(value: string): string {
    return value.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
  }
}
