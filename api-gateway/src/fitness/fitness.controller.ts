import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { UpsertFitnessDto } from './dto/upsert-fitness.dto'
import {
  TodayFitnessResponseDto,
  YearlyFitnessStatsResponseDto,
} from './dto/fitness-stats-response.dto'

@ApiTags('Fitness')
@ApiBearerAuth()
@Controller('fitness')
export class FitnessController {
  constructor(
    @Inject('FITNESS_SERVICE') private readonly fitnessClient: ClientProxy,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // POST /fitness  — upsert today's fitness record
  // ──────────────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log / update today\'s fitness data',
    description:
      'Creates a new fitness row for today or updates the existing one. ' +
      'All metric fields are optional — only supplied fields are written.',
  })
  @ApiBody({ type: UpsertFitnessDto })
  @ApiResponse({
    status: 200,
    description: 'Fitness record upserted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request — missing userId' })
  @ApiResponse({ status: 500, description: 'Microservice / Supabase error' })
  async upsertFitness(
    @Body('userId') userId: string,
    @Body('updates') updates: any,
  ) {
    return firstValueFrom(
      this.fitnessClient.send({ cmd: 'upsertFitness' }, { userId, updates }),
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /fitness  — today's aggregated fitness data
  // ──────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Get today\'s aggregated fitness metrics',
    description:
      'Returns the sum of all fitness rows recorded today (PKT timezone) ' +
      'for the given patient. Defaults to 0 for any metric not yet logged.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'Patient UUID',
    example: 'uuid-of-patient',
  })
  @ApiResponse({
    status: 200,
    description: 'Today\'s fitness summary',
    type: TodayFitnessResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Microservice / Supabase error' })
  async getFitness(@Query('userId') userId: string) {
    const response = await firstValueFrom(
      this.fitnessClient.send({ cmd: 'getAllFitness' }, userId),
    )

    const row = Array.isArray(response) ? (response[0] || {}) : (response || {})

    return {
      steps: Number(row.steps || 0),
      water: Number(row.water || 0),
      sleep: Number(row.sleep || 0),
      calories_burned: Number(row.calories_burned || 0),
      calories_intake: Number(row.calories_intake || 0),
      protein: Number(row.protein || 0),
      fat: Number(row.fat || 0),
      carbs: Number(row.carbs || 0),
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /fitness/stats/yearly  — last 12-month aggregated stats
  // ──────────────────────────────────────────────────────────────────────────
  @Get('stats/yearly')
  @ApiOperation({
    summary: 'Get patient fitness stats for the last 12 months',
    description:
      'Returns a comprehensive breakdown of fitness data for the past 365 days. ' +
      'The response includes:\n' +
      '- **daily**: raw per-day fitness rows\n' +
      '- **weekly**: ISO-week aggregates (totals + daily averages)\n' +
      '- **monthly**: calendar-month aggregates (totals + daily averages)\n' +
      '- **totals**: grand sum across the entire year\n' +
      '- **averages**: grand daily average across the entire year\n\n' +
      'All numeric fields: `steps`, `water` (L), `sleep` (hrs), ' +
      '`calories_burned`, `calories_intake`, `fat` (g), `protein` (g), ' +
      '`carbs` (g), `walk_calories_burned`.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'Patient UUID',
    example: 'uuid-of-patient',
  })
  @ApiResponse({
    status: 200,
    description: 'Yearly fitness statistics',
    type: YearlyFitnessStatsResponseDto,
  })
  @ApiResponse({ status: 500, description: 'Microservice / Supabase error' })
  async getYearlyFitnessStats(@Query('userId') userId: string) {
    return firstValueFrom(
      this.fitnessClient.send({ cmd: 'getYearlyFitnessStats' }, userId),
    )
  }
}
