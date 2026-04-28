import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RecommendationHistoryQueryDto } from './dto/recommendation-history-query.dto';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatConfirmDto } from './dto/chat-confirm.dto';
import { ChatConversationRenameDto } from './dto/chat-conversation-rename.dto';
import { ChatConversationUnarchiveDto } from './dto/chat-conversation-unarchive.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('model/status')
  @ApiOperation({
    summary: 'Get recommendation model bootstrap status',
    description:
      'Reports whether the recommendation model was downloaded from Google Drive and loaded successfully by the upstream service.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendation model status fetched successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Recommendation model status fetched successfully',
        data: {
          status: 'ready',
          loaded: true,
          path: 'recommendations/models/recommendation_model.pth',
          source_url: 'https://drive.google.com/file/d/16HH783V215USXVVIvzlIugR6DWdK8Tbf/view?usp=sharing',
          downloaded: true,
          loaded_via: 'torch.load',
          artifact_type: 'OrderedDict',
          loaded_at: '2026-04-14T12:00:00.000Z',
          size_bytes: 12345678,
          error: null,
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Recommendations service unavailable.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Recommendations service is unavailable.',
        success: false,
      },
    },
  })
  async getModelStatus() {
    const data = await this.recommendationsService.getModelStatus();
    return {
      statusCode: 200,
      message: 'Recommendation model status fetched successfully',
      data,
      success: true,
    };
  }

  @Post('predict-acne')
  @ApiOperation({
    summary: 'Predict acne class from an uploaded image',
    description: 'Forwards an image to the recommendation service and returns the predicted acne class and confidence.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', description: 'Acne image file' },
      },
      required: ['image'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Acne prediction completed successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Acne prediction completed successfully',
        data: {
          predicted_class: 'Pustules',
          confidence: 0.92,
          probabilities: {
            Blackheads: 0.01,
            Cyst: 0.02,
            Papules: 0.03,
            Pustules: 0.92,
            Whiteheads: 0.02,
          },
          model_status: {
            status: 'ready',
            loaded: true,
            path: 'recommendations/models/recommendation_model.pth',
          },
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image upload.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Image file is required.',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Recommendations service unavailable.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Recommendations service is unavailable.',
        success: false,
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async predictAcne(@UploadedFile() image: Express.Multer.File) {
    const data = await this.recommendationsService.predictAcne(image);
    return {
      statusCode: 200,
      message: 'Acne prediction completed successfully',
      data,
      success: true,
    };
  }

  @Post('predict-dental')
  @ApiOperation({
    summary: 'Predict dental condition class from an uploaded image',
    description:
      'Forwards a dental image to the recommendation service and returns the predicted dental condition class and confidence.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', description: 'Dental image file (X-ray/photo)' },
      },
      required: ['image'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Dental prediction completed successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Dental prediction completed successfully',
        data: {
          predicted_class: 'Caries',
          confidence: 0.94,
          probabilities: {
            'BDC-BDR': 0.01,
            Caries: 0.94,
            'Fractured Teeth': 0.01,
            'Healthy Teeth': 0.02,
            'Impacted teeth': 0.01,
            Infection: 0.01,
          },
          model_status: {
            status: 'ready',
            loaded: true,
            path: 'recommendations/models/dental_model/best_model.pth',
            metadata_path: 'recommendations/models/dental_model/model_metadata.json',
            source_url: 'https://drive.google.com/file/d/1cEK8DkVn4abbQ4D4BmXWUSiwx9I53Wh1/view',
            class_names: ['BDC-BDR', 'Caries', 'Fractured Teeth', 'Healthy Teeth', 'Impacted teeth', 'Infection'],
            img_size: 224,
          },
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image upload.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Image file is required.',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Recommendations service unavailable.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Recommendations service is unavailable.',
        success: false,
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async predictDental(@UploadedFile() image: Express.Multer.File) {
    const data = await this.recommendationsService.predictDental(image);
    return {
      statusCode: 200,
      message: 'Dental prediction completed successfully',
      data,
      success: true,
    };
  }

  @Post('chat')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Patient chatbot (LangGraph + Groq)' })
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({ status: 200, description: 'Chat turn completed' })
  async postChat(@Body() body: ChatRequestDto, @Headers('authorization') authorization?: string) {
    const data = await this.recommendationsService.chat({
      patientId: body.patientId,
      messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
      conversationId: body.conversationId,
      confirmActionToken: body.confirmActionToken,
      authorization,
    });
    return {
      statusCode: 200,
      message: 'Chat message processed',
      data,
      success: true,
    };
  }

  @Post('chat/confirm')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Confirm a pending chat action' })
  @ApiBody({ type: ChatConfirmDto })
  async postChatConfirm(@Body() body: ChatConfirmDto, @Headers('authorization') authorization?: string) {
    const data = await this.recommendationsService.confirmChat({
      patientId: body.patientId,
      conversationId: body.conversationId,
      actionToken: body.actionToken,
      authorization,
    });
    return {
      statusCode: 200,
      message: 'Action confirmed',
      data,
      success: true,
    };
  }

  @Get('chat/conversations/:patientId')
  @ApiOperation({ summary: 'List patient chat conversations' })
  @ApiParam({ name: 'patientId', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'before', required: false })
  @ApiQuery({ name: 'include_archived', required: false, example: false })
  @ApiQuery({ name: 'search', required: false })
  async getChatConversations(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('include_archived') includeArchived?: string,
    @Query('search') search?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const li = limit ? Math.min(200, Math.max(1, parseInt(limit, 10) || 20)) : 20;
    return this.recommendationsService.getChatConversations(
      patientId,
      {
        limit: li,
        before: before || undefined,
        includeArchived: includeArchived === 'true',
        search: search || undefined,
      },
      authorization,
    );
  }

  @Get('chat/history/:patientId')
  @ApiOperation({ summary: 'List chat message history' })
  @ApiParam({ name: 'patientId', format: 'uuid' })
  @ApiQuery({ name: 'conversation_id', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'before', required: false })
  async getChatHistory(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query('conversation_id') conversationId?: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const li = limit ? Math.min(200, Math.max(1, parseInt(limit, 10) || 50)) : 50;
    const data = await this.recommendationsService.getChatHistory(patientId, {
      conversationId: conversationId || undefined,
      limit: li,
      before: before || undefined,
    }, authorization);
    return {
      statusCode: 200,
      message: 'Chat history',
      data,
      success: true,
    };
  }

  @Patch('chat/:conversationId/title')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Rename a chat conversation' })
  @ApiParam({ name: 'conversationId', format: 'uuid' })
  @ApiBody({ type: ChatConversationRenameDto })
  async renameChatConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() body: ChatConversationRenameDto,
    @Headers('authorization') authorization?: string,
  ) {
    const data = await this.recommendationsService.renameChatConversation(conversationId, body, authorization);
    return { statusCode: 200, message: 'Conversation renamed', data, success: true };
  }

  @Post('chat/:conversationId/unarchive')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Unarchive a chat conversation' })
  @ApiParam({ name: 'conversationId', format: 'uuid' })
  @ApiBody({ type: ChatConversationUnarchiveDto })
  async unarchiveChatConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() body: ChatConversationUnarchiveDto,
    @Headers('authorization') authorization?: string,
  ) {
    const data = await this.recommendationsService.unarchiveChatConversation(conversationId, body, authorization);
    return { statusCode: 200, message: 'Conversation unarchived', data, success: true };
  }

  @Delete('chat/:conversationId')
  @ApiOperation({ summary: 'Archive a chat session' })
  @ApiParam({ name: 'conversationId', format: 'uuid' })
  @ApiQuery({ name: 'patient_id', required: true, description: 'Patient who owns the conversation' })
  async deleteChat(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('patient_id', ParseUUIDPipe) patientId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const data = await this.recommendationsService.deleteChat(patientId, conversationId, authorization);
    return {
      statusCode: 200,
      message: 'Chat session archived',
      data,
      success: true,
    };
  }

  @ApiOperation({ summary: 'Get latest recommendations for a patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Latest recommendations fetched successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Latest recommendations fetched successfully',
        data: {
          id: 'rec-001',
          patient_id: '550e8400-e29b-41d4-a716-446655440000',
          recommendations: [
            {
              type: 'fitness',
              title: 'Walk 20 minutes daily',
              description: 'Improve circulation and support overall recovery with a short daily walk.',
              priority: 'medium',
              timeframe: '2 weeks',
              doctorId: null,
              specialization: null,
              conditions: null,
            },
          ],
          generated_at: '2026-04-14T12:00:00.000Z',
          source: 'langgraph-groq',
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No recommendations found for patient.',
    schema: {
      example: {
        statusCode: 404,
        message: 'No recommendations found for patient',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Recommendations service unavailable.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Recommendations service is unavailable.',
        success: false,
      },
    },
  })
  @Get(':patientId')
  async getLatest(@Param('patientId', ParseUUIDPipe) patientId: string) {
    const data = await this.recommendationsService.getLatest(patientId);
    return {
      statusCode: 200,
      message: 'Latest recommendations fetched successfully',
      data,
      success: true,
    };
  }

  @Get(':patientId/history')
  @ApiOperation({ summary: 'Get recommendation history for a patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Number of records to return (1-50).' })
  @ApiResponse({
    status: 200,
    description: 'Recommendation history fetched successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Recommendation history fetched successfully',
        data: [
          {
            id: 'rec-001',
            patient_id: '550e8400-e29b-41d4-a716-446655440000',
            recommendations: [],
            generated_at: '2026-04-14T12:00:00.000Z',
            source: 'langgraph-groq',
          },
        ],
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Recommendations service unavailable.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Recommendations service is unavailable.',
        success: false,
      },
    },
  })
  async getHistory(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: RecommendationHistoryQueryDto,
  ) {
    const data = await this.recommendationsService.getHistory(patientId, query.limit || 10);
    return {
      statusCode: 200,
      message: 'Recommendation history fetched successfully',
      data,
      success: true,
    };
  }

  @Post(':patientId/refresh')
  @ApiOperation({ summary: 'Regenerate recommendations for a specific patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Recommendations refreshed successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Recommendations refreshed successfully',
        data: {
          patient_id: '550e8400-e29b-41d4-a716-446655440000',
          generated_count: 3,
          record_id: 'rec-001',
          generated_at: '2026-04-14T12:00:00.000Z',
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid UUID',
        success: false,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Recommendations service unavailable.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Recommendations service is unavailable.',
        success: false,
      },
    },
  })
  async refreshOne(@Param('patientId', ParseUUIDPipe) patientId: string) {
    const data = await this.recommendationsService.refreshOne(patientId);
    return {
      statusCode: 200,
      message: 'Recommendations refreshed successfully',
      data,
      success: true,
    };
  }

  @Post('refresh-all')
  @ApiOperation({ summary: 'Trigger recommendation generation batch for all patients' })
  @ApiResponse({
    status: 200,
    description: 'Recommendations batch job completed.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Recommendations batch job completed',
        data: {
          status: 'completed',
          total: 20,
          success: 19,
          failed: 1,
          failures: [{ patient_id: '550e8400-e29b-41d4-a716-446655440000', error: 'Timeout' }],
          finished_at: '2026-04-14T12:30:00.000Z',
        },
        success: true,
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Recommendations service unavailable.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Recommendations service is unavailable.',
        success: false,
      },
    },
  })
  async refreshAll() {
    const data = await this.recommendationsService.refreshAll();
    return {
      statusCode: 200,
      message: 'Recommendations batch job completed',
      data,
      success: true,
    };
  }
}
