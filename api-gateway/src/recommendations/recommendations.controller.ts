import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RecommendationHistoryQueryDto } from './dto/recommendation-history-query.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get(':patientId')
  @ApiOperation({ summary: 'Get latest recommendations for a patient' })
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Latest recommendations fetched successfully.' })
  @ApiResponse({ status: 404, description: 'No recommendations found for patient.' })
  @ApiResponse({ status: 503, description: 'Recommendations service unavailable.' })
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
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Recommendation history fetched successfully.' })
  @ApiResponse({ status: 503, description: 'Recommendations service unavailable.' })
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
  @ApiParam({ name: 'patientId', description: 'Patient UUID' })
  @ApiResponse({ status: 200, description: 'Recommendations refreshed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request payload.' })
  @ApiResponse({ status: 503, description: 'Recommendations service unavailable.' })
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
  @ApiResponse({ status: 200, description: 'Recommendations batch job completed.' })
  @ApiResponse({ status: 503, description: 'Recommendations service unavailable.' })
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
