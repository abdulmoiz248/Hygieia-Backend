import { IsString, IsUUID, IsArray, IsOptional, IsIn, MaxLength, ArrayMaxSize } from 'class-validator'

export class ReportProviderDto {
  @IsUUID()
  patientId: string

  @IsUUID()
  reportedProviderId: string

  @IsIn(['doctor', 'nutritionist'])
  reportedProviderRole: 'doctor' | 'nutritionist'

  @IsString()
  @MaxLength(500)
  reason: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  /**
   * Base64-encoded images as proof (max 3).
   * Each entry should be a data URI or raw base64 string.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  images?: string[]
}
