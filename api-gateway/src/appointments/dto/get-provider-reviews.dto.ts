import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsOptional, IsUUID, Min } from 'class-validator'

export class GetProviderReviewsDto {
  @ApiProperty({ format: 'uuid', description: 'Provider ID (doctor or nutritionist)' })
  @IsUUID('all')
  providerId: string

  @ApiPropertyOptional({ enum: ['doctor', 'nutritionist'], description: 'Provider role filter' })
  @IsOptional()
  @IsIn(['doctor', 'nutritionist'])
  role?: 'doctor' | 'nutritionist'

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number
}
