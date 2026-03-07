import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AskRagDto } from './dto/ask-rag.dto';
import { RagService } from './rag.service';

@ApiTags('RAG')
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ask')
  @ApiOperation({
    summary: 'Ask a question using RAG (Admin only)',
    description:
      'Verifies admin privileges from Supabase users table and forwards the question to embeddings RAG service powered by Groq.',
  })
  @ApiBody({
    type: AskRagDto,
    description: 'RAG request payload.',
  })
  @ApiResponse({
    status: 200,
    description: 'RAG answer generated successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'RAG answer generated successfully',
        data: {
          answer: 'Based on indexed CVs, Python and SQL are the most common skills.',
          sources: [
            {
              cv_id: 'a7f8e1f7-6382-48ee-96d0-3cc4f4b5fb9e',
              cv_url: 'https://example.com/cv.pdf',
              email: 'candidate@domain.com',
              similarity_score: 0.86,
            },
          ],
          retrieval: {
            chunks_considered: 6,
            chunks_used: 4,
          },
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - user does not exist.',
    schema: {
      example: {
        statusCode: 401,
        message: 'User not found.',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - non-admin users cannot access this endpoint.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Only admins can access RAG.',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Embeddings service unavailable.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Embeddings service is unavailable.',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid RAG input.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Question is required',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 502,
    description: 'Upstream LLM generation failed.',
    schema: {
      example: {
        statusCode: 502,
        message: 'Failed to generate answer from Groq.',
        success: false,
      },
    },
  })
  async ask(@Body() dto: AskRagDto) {
    return this.ragService.askRag(dto);
  }
}
