import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class RecommendationHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Number of records to return (1-50)',
    example: 10,
    default: 10,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}
