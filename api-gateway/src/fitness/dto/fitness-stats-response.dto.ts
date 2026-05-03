import { ApiProperty } from '@nestjs/swagger';

export class FitnessMetricsDto {
  @ApiProperty({ example: 8000 }) steps: number;
  @ApiProperty({ example: 2.5 }) water: number;
  @ApiProperty({ example: 7.5 }) sleep: number;
  @ApiProperty({ example: 350 }) calories_burned: number;
  @ApiProperty({ example: 2100 }) calories_intake: number;
  @ApiProperty({ example: 60 }) fat: number;
  @ApiProperty({ example: 120 }) protein: number;
  @ApiProperty({ example: 250 }) carbs: number;
  @ApiProperty({ example: 80 }) walk_calories_burned: number;
}

export class DailyFitnessRowDto {
  @ApiProperty({ example: 'uuid-row-id' }) id: string;
  @ApiProperty({ example: '2025-04-30T08:00:00.000Z' }) created_at: string;
  @ApiProperty({ example: 'uuid-patient-id' }) patient_id: string;
  @ApiProperty({ example: 8000 }) steps: number;
  @ApiProperty({ example: 2.5 }) water: number;
  @ApiProperty({ example: 7.5 }) sleep: number;
  @ApiProperty({ example: 350 }) calories_burned: number;
  @ApiProperty({ example: 2100 }) calories_intake: number;
  @ApiProperty({ example: 60 }) fat: number;
  @ApiProperty({ example: 120 }) protein: number;
  @ApiProperty({ example: 250 }) carbs: number;
  @ApiProperty({ example: 80 }) walk_calories_burned: number;
}

export class MonthlyStatDto {
  @ApiProperty({ example: '2025-04', description: 'Year-Month key (YYYY-MM)' }) month: string;
  @ApiProperty({ example: 28, description: 'Number of days with logged data in this month' }) totalDays: number;
  @ApiProperty({ type: FitnessMetricsDto, description: 'Sum of all metrics for the month' }) totals: FitnessMetricsDto;
  @ApiProperty({ type: FitnessMetricsDto, description: 'Daily average of all metrics for the month' }) averages: FitnessMetricsDto;
}

export class WeeklyStatDto {
  @ApiProperty({ example: '2025-W18', description: 'ISO year-week key (YYYY-Www)' }) week: string;
  @ApiProperty({ example: 6, description: 'Number of days with logged data in this week' }) totalDays: number;
  @ApiProperty({ type: FitnessMetricsDto, description: 'Sum of all metrics for the week' }) totals: FitnessMetricsDto;
  @ApiProperty({ type: FitnessMetricsDto, description: 'Daily average of all metrics for the week' }) averages: FitnessMetricsDto;
}

export class PeriodDto {
  @ApiProperty({ example: '2024-05-03T00:00:00.000Z', description: 'Start of the 1-year window (UTC)' }) from: string;
  @ApiProperty({ example: '2025-05-03T17:00:00.000Z', description: 'End of the 1-year window (UTC)' }) to: string;
}

export class YearlyFitnessStatsResponseDto {
  @ApiProperty({ type: PeriodDto, description: 'UTC date range covered by this response' })
  period: PeriodDto;

  @ApiProperty({ example: 312, description: 'Total number of days that have at least one fitness entry' })
  totalDays: number;

  @ApiProperty({ type: [DailyFitnessRowDto], description: 'Raw daily fitness rows ordered oldest-first' })
  daily: DailyFitnessRowDto[];

  @ApiProperty({ type: [WeeklyStatDto], description: 'Per-ISO-week aggregated stats' })
  weekly: WeeklyStatDto[];

  @ApiProperty({ type: [MonthlyStatDto], description: 'Per-calendar-month aggregated stats' })
  monthly: MonthlyStatDto[];

  @ApiProperty({ type: FitnessMetricsDto, description: 'Grand totals across the entire year' })
  totals: FitnessMetricsDto;

  @ApiProperty({ type: FitnessMetricsDto, description: 'Grand daily averages across the entire year' })
  averages: FitnessMetricsDto;
}

export class TodayFitnessResponseDto {
  @ApiProperty({ example: 8000 }) steps: number;
  @ApiProperty({ example: 2.5 }) water: number;
  @ApiProperty({ example: 7.5 }) sleep: number;
  @ApiProperty({ example: 430 }) calories_burned: number;
  @ApiProperty({ example: 2100 }) calories_intake: number;
  @ApiProperty({ example: 120 }) protein: number;
  @ApiProperty({ example: 60 }) fat: number;
  @ApiProperty({ example: 250 }) carbs: number;
}
