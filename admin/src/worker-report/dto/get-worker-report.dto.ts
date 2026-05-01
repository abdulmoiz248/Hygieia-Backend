import { IsUUID, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GetWorkerReportDto {
  @IsUUID()
  workerId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  monthlyTrendMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  newPatientTrendDays?: number;

  @IsOptional()
  includeDetailedAnalytics?: boolean;

  @IsOptional()
  includeRecommendations?: boolean;
}
