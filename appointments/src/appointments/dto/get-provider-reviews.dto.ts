import { IsIn, IsOptional, IsUUID, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class GetProviderReviewsDto {
  @IsUUID('all')
  providerId: string

  @IsOptional()
  @IsIn(['doctor', 'nutritionist'])
  role?: 'doctor' | 'nutritionist'

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number
}
