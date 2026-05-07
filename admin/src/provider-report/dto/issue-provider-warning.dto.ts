import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator'

export class IssueProviderWarningDto {
  @IsUUID()
  reportedProviderId: string

  @IsUUID()
  reportId: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string
}
