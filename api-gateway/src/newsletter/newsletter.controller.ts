import { 
  Controller, 
  Inject, 
  Post, 
  Get,
  Query,
  Body, 
  UnauthorizedException,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices/client/client-proxy';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SubscribeNewsletterDto } from './dto/subscribeNewsletter.dto';
import { GenerateNewsletterHtmlDto } from './dto/generate-newsletter-html.dto';
import { SendNewsletterDto } from './dto/send-newsletter.dto';
import { SendBlogpostNewsletterDto } from './dto/send-blogpost-newsletter.dto';
import { GetSentNewslettersDto } from './dto/get-sent-newsletters.dto';
import { firstValueFrom } from 'rxjs';

@ApiTags('Newsletter')
@Controller()
export class NewsletterController {
  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
    @Inject('ADMIN_SERVICE') private adminClient: ClientProxy,
  ) {}

  @Post('subscribe-newsletter')
  @ApiOperation({ 
    summary: 'Subscribe to newsletter',
    description: 'Subscribe user email to the newsletter mailing list.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Successfully subscribed to newsletter',
    schema: {
      example: {
        statusCode: 201,
        message: 'Subscribed successfully',
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - email already subscribed or validation error',
    schema: {
      example: {
        statusCode: 400,
        message: 'Email already subscribed',
        success: false
      }
    }
  })
  async subscribe(@Body() dto: SubscribeNewsletterDto) {
    try {
      return await firstValueFrom(
        this.authClient.send(
          { cmd: 'subscribe-newsletter' },
          dto
        )
      );
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Newsletter subscription failed');
    }
  }

  @Get('subscribers')
  @ApiOperation({
    summary: 'Get all newsletter subscribers',
    description: 'Retrieve a list of all newsletter subscribers',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all subscribers',
    schema: {
      example: [
        {
          id: 'uuid',
          email: 'subscriber@example.com',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    },
  })
  async getAllSubscribers() {
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'allNewsletterSubscribers' }, {})
      );
    } catch (e: any) {
      throw new BadRequestException(
        e?.message || 'Failed to retrieve newsletter subscribers'
      );
    }
  }

  @Get('sent-newsletters')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Get sent newsletters history (Admin only)',
    description:
      'Retrieve paginated history of newsletters sent from the system. Requires admin role.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'Admin user ID for authorization',
    example: '5e3dd75b-7c38-4bf9-8a76-bc45bab74d7c',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Pagination limit (1-100), default 20',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Pagination offset, default 0',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved sent newsletters history',
    schema: {
      example: {
        statusCode: 200,
        message: 'Sent newsletters retrieved successfully',
        data: {
          items: [
            {
              id: '4dd140f1-c1fc-4454-a1b3-b72937b7d2fe',
              type: 'blogpost',
              subject: 'Why Modern Healthcare Needs AI More Than Ever - Hygieia Blog',
              newsletter_link:
                'https://hygieia-frontend.vercel.app/blogs/9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
              recipient_count: 150,
              sent_count: 150,
              failed_count: 0,
              status: 'sent',
              created_at: '2026-04-07T09:00:00.000Z',
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - user is not an admin',
    schema: {
      example: {
        statusCode: 401,
        message: 'Only admins can perform this action',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation or retrieval failure',
    schema: {
      example: {
        statusCode: 400,
        message: 'Failed to retrieve sent newsletters',
        success: false,
      },
    },
  })
  async getSentNewsletters(@Query() query: GetSentNewslettersDto) {
    try {
      await this.verifyAdmin(query.userId);

      return await firstValueFrom(
        this.adminClient.send(
          { cmd: 'get_sent_newsletters' },
          {
            limit: query.limit ?? 20,
            offset: query.offset ?? 0,
          },
        ),
      );
    } catch (e: any) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new BadRequestException(
        e?.message || 'Failed to retrieve sent newsletters',
      );
    }
  }

  @Post('generate-newsletter-html')
  @ApiOperation({ 
    summary: 'Generate newsletter HTML (Admin only)',
    description: 'Generate responsive HTML newsletter content using AI based on provided idea. Requires admin role.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Newsletter HTML generated successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Newsletter HTML generated successfully',
        data: {
          html: '<html>...</html>'
        },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - user is not an admin',
    schema: {
      example: {
        statusCode: 401,
        message: 'Only admins can generate newsletters',
        success: false
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation error or generation failed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Newsletter idea is required',
        success: false
      }
    }
  })
  async generateNewsletterHtml(@Body() dto: GenerateNewsletterHtmlDto) {
    try {
      // Verify user is admin
      await this.verifyAdmin(dto.userId);

      // Generate newsletter HTML via admin service
      return await firstValueFrom(
        this.adminClient.send(
          { cmd: 'generate_newsletter_html' },
          { idea: dto.idea }
        )
      );
    } catch (e: any) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new BadRequestException(e?.message || 'Newsletter generation failed');
    }
  }

  @Post('send-newsletter')
  @ApiOperation({ 
    summary: 'Send newsletter to all subscribers (Admin only)',
    description: 'Send newsletter HTML to all subscribed users. Requires admin role.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Newsletter sent successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Newsletter send request processed',
        data: {
          success: true,
          sentCount: 150,
          failedCount: 0,
          recipientCount: 150,
          message: 'Newsletter sent to all recipients'
        },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - user is not an admin',
    schema: {
      example: {
        statusCode: 401,
        message: 'Only admins can send newsletters',
        success: false
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - validation error or send failed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Newsletter HTML is required',
        success: false
      }
    }
  })
  async sendNewsletter(@Body() dto: SendNewsletterDto) {
    try {
      // Verify user is admin
      await this.verifyAdmin(dto.userId);

      // Send newsletter via admin service
      return await firstValueFrom(
        this.adminClient.send(
          { cmd: 'send_newsletter' },
          { html: dto.html, subject: dto.subject }
        )
      );
    } catch (e: any) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new BadRequestException(e?.message || 'Newsletter send failed');
    }
  }

  @Post('send-blogpost-newsletter')
  @ApiOperation({ 
    summary: 'Send blog post as newsletter (Admin only)',
    description: 'Converts a blog post to newsletter format using AI and sends to all subscribers. Requires admin role.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Blog post newsletter sent successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Blogpost newsletter sent successfully',
        data: {
          success: true,
          sentCount: 150,
          failedCount: 0,
          recipientCount: 150,
          blogpost: {
            id: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
            title: 'Why Modern Healthcare Needs AI More Than Ever',
            category: 'Technology'
          },
          message: 'Newsletter sent to all recipients'
        },
        success: true
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - user is not an admin',
    schema: {
      example: {
        statusCode: 401,
        message: 'Only admins can send blogpost newsletters',
        success: false
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - blogpost not found or send failed',
    schema: {
      example: {
        statusCode: 400,
        message: 'Blogpost not found',
        success: false
      }
    }
  })
  async sendBlogpostNewsletter(@Body() dto: SendBlogpostNewsletterDto) {
    try {
      // Verify user is admin
      await this.verifyAdmin(dto.userId);

      // Send blogpost as newsletter via admin service
      return await firstValueFrom(
        this.adminClient.send(
          { cmd: 'send_blogpost_newsletter' },
          { blogpostId: dto.blogpostId }
        )
      );
    } catch (e: any) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new BadRequestException(e?.message || 'Blogpost newsletter send failed');
    }
  }

  private async verifyAdmin(userId: string): Promise<void> {
    try {
      const userResult = await firstValueFrom(
        this.authClient.send(
          { cmd: 'user-data' },
          { id: userId, role: 'admin' }
        )
      );

      if (!userResult?.data?.role || userResult.data.role !== 'admin') {
        throw new UnauthorizedException('Only admins can perform this action');
      }
    } catch (e: any) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Only admins can perform this action');
    }
  }
}
