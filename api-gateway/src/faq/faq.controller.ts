import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@ApiTags('FAQs')
@Controller('faqs')
export class FaqController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  // Public endpoint - no auth required
  @Get()
    @ApiOperation({ 
      summary: 'Get all FAQs',
      description: 'Retrieve all frequently asked questions. This is a public endpoint that does not require authentication.'
    })
    @ApiResponse({ 
      status: 200, 
      description: 'FAQs retrieved successfully',
      schema: {
        example: {
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              question: 'How accurate is Hygieia\'s AI diagnosis?',
              answer: 'Hygieia\'s AI has been trained on millions of medical records and achieves a 95% accuracy rate for common conditions. However, it\'s designed to be a preliminary assessment tool, not a replacement for professional medical advice.',
              order_index: 1,
              created_at: '2026-03-06T10:30:00Z',
              updated_at: '2026-03-06T10:30:00Z'
            }
          ]
        }
      }
    })
    @ApiResponse({ 
      status: 500, 
      description: 'Internal server error',
      schema: {
        example: {
          statusCode: 500,
          message: 'Failed to fetch FAQs',
          success: false
        }
      }
    })
  async findAll() {
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'get_all_faqs' }, {}),
      );
    } catch (error) {
      throw new BadRequestException('Failed to fetch FAQs');
    }
  }

  @Get(':id')
    @ApiOperation({ 
      summary: 'Get FAQ by ID',
      description: 'Retrieve a specific FAQ by its unique identifier. This is a public endpoint that does not require authentication.'
    })
    @ApiParam({ 
      name: 'id', 
      description: 'FAQ unique identifier (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({ 
      status: 200, 
      description: 'FAQ retrieved successfully',
      schema: {
        example: {
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            question: 'How accurate is Hygieia\'s AI diagnosis?',
            answer: 'Hygieia\'s AI has been trained on millions of medical records and achieves a 95% accuracy rate for common conditions. However, it\'s designed to be a preliminary assessment tool, not a replacement for professional medical advice.',
            order_index: 1,
            created_at: '2026-03-06T10:30:00Z',
            updated_at: '2026-03-06T10:30:00Z'
          }
        }
      }
    })
    @ApiResponse({ 
      status: 404, 
      description: 'FAQ not found',
      schema: {
        example: {
          statusCode: 404,
          message: 'FAQ with ID 550e8400-e29b-41d4-a716-446655440000 not found',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 400, 
      description: 'Bad request - invalid ID format',
      schema: {
        example: {
          statusCode: 400,
          message: 'Failed to fetch FAQ',
          success: false
        }
      }
    })
  async findOne(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'get_faq_by_id' }, { id }),
      );
    } catch (error) {
      throw new BadRequestException('Failed to fetch FAQ');
    }
  }

  // Admin only
  @Post()
    @ApiOperation({ 
      summary: 'Create new FAQ (Admin only)',
      description: 'Create a new frequently asked question. Requires admin authentication. Only users with admin role can create FAQs.'
    })
    @ApiBody({ 
      type: CreateFaqDto,
      description: 'FAQ data',
      examples: {
        example1: {
          summary: 'Basic FAQ',
          value: {
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards, PayPal, and health insurance for eligible services.'
          }
        },
        example2: {
          summary: 'FAQ with custom order',
          value: {
            question: 'Do you offer 24/7 support?',
            answer: 'Yes, our AI-powered support is available 24/7. For urgent medical concerns, our telehealth service operates round the clock.',
            order_index: 10
          }
        }
      }
    })
    @ApiResponse({ 
      status: 201, 
      description: 'FAQ created successfully',
      schema: {
        example: {
          statusCode: 201,
          message: 'FAQ created successfully',
          data: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards, PayPal, and health insurance for eligible services.',
            order_index: 0,
            created_at: '2026-03-06T10:30:00Z',
            updated_at: '2026-03-06T10:30:00Z'
          },
          success: true
        }
      }
    })
    @ApiResponse({ 
      status: 401, 
      description: 'Unauthorized - authentication required',
      schema: {
        example: {
          statusCode: 401,
          message: 'Authentication required',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 403, 
      description: 'Forbidden - admin role required',
      schema: {
        example: {
          statusCode: 403,
          message: 'Only admins can perform this action',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 400, 
      description: 'Bad request - validation errors',
      schema: {
        example: {
          statusCode: 400,
          message: 'Question is required',
          success: false
        }
      }
    })
  async create(@Body() createFaqDto: CreateFaqDto, @Req() req: any) {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'create_faq' }, { createFaqDto, userId }),
      );
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to create FAQ');
    }
  }

  // Admin only
  @Patch(':id')
    @ApiOperation({ 
      summary: 'Update FAQ (Admin only)',
      description: 'Update an existing FAQ by ID. Requires admin authentication. Only users with admin role can update FAQs.'
    })
    @ApiParam({ 
      name: 'id', 
      description: 'FAQ unique identifier (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiBody({ 
      type: UpdateFaqDto,
      description: 'FAQ update data (all fields optional)',
      examples: {
        updateAnswer: {
          summary: 'Update answer only',
          value: {
            answer: 'Updated answer with more detailed information.'
          }
        },
        updateQuestion: {
          summary: 'Update question only',
          value: {
            question: 'What is the updated question?'
          }
        },
        updateAll: {
          summary: 'Update all fields',
          value: {
            question: 'Updated question',
            answer: 'Updated answer',
            order_index: 5
          }
        }
      }
    })
    @ApiResponse({ 
      status: 200, 
      description: 'FAQ updated successfully',
      schema: {
        example: {
          statusCode: 200,
          message: 'FAQ updated successfully',
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            question: 'Updated question',
            answer: 'Updated answer with more detailed information.',
            order_index: 5,
            created_at: '2026-03-06T10:30:00Z',
            updated_at: '2026-03-06T12:45:00Z'
          },
          success: true
        }
      }
    })
    @ApiResponse({ 
      status: 401, 
      description: 'Unauthorized - authentication required',
      schema: {
        example: {
          statusCode: 401,
          message: 'Authentication required',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 403, 
      description: 'Forbidden - admin role required',
      schema: {
        example: {
          statusCode: 403,
          message: 'Only admins can perform this action',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 404, 
      description: 'FAQ not found',
      schema: {
        example: {
          statusCode: 404,
          message: 'FAQ with ID 550e8400-e29b-41d4-a716-446655440000 not found',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 400, 
      description: 'Bad request - validation errors',
      schema: {
        example: {
          statusCode: 400,
          message: 'Failed to update FAQ',
          success: false
        }
      }
    })
  async update(
    @Param('id') id: string,
    @Body() updateFaqDto: UpdateFaqDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'update_faq' }, { id, updateFaqDto, userId }),
      );
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to update FAQ');
    }
  }

  // Admin only
  @Delete(':id')
    @ApiOperation({ 
      summary: 'Delete FAQ (Admin only)',
      description: 'Delete an existing FAQ by ID. Requires admin authentication. Only users with admin role can delete FAQs.'
    })
    @ApiParam({ 
      name: 'id', 
      description: 'FAQ unique identifier (UUID)',
      example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiResponse({ 
      status: 200, 
      description: 'FAQ deleted successfully',
      schema: {
        example: {
          statusCode: 200,
          message: 'FAQ deleted successfully',
          success: true
        }
      }
    })
    @ApiResponse({ 
      status: 401, 
      description: 'Unauthorized - authentication required',
      schema: {
        example: {
          statusCode: 401,
          message: 'Authentication required',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 403, 
      description: 'Forbidden - admin role required',
      schema: {
        example: {
          statusCode: 403,
          message: 'Only admins can perform this action',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 404, 
      description: 'FAQ not found',
      schema: {
        example: {
          statusCode: 404,
          message: 'FAQ with ID 550e8400-e29b-41d4-a716-446655440000 not found',
          success: false
        }
      }
    })
    @ApiResponse({ 
      status: 400, 
      description: 'Bad request',
      schema: {
        example: {
          statusCode: 400,
          message: 'Failed to delete FAQ',
          success: false
        }
      }
    })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      return await firstValueFrom(
        this.authClient.send({ cmd: 'delete_faq' }, { id, userId }),
      );
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to delete FAQ');
    }
  }
}
