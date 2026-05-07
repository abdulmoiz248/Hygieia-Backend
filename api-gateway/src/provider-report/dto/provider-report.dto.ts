import { ApiProperty } from '@nestjs/swagger'
import { IsUUID, IsIn, IsString, MaxLength, IsOptional, IsArray, ArrayMaxSize } from 'class-validator'

export class SubmitProviderReportDto {
  @ApiProperty({
    description: 'Patient user ID who is filing the report',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  patientId: string

  @ApiProperty({
    description: 'ID of the doctor or nutritionist being reported',
    example: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
  })
  @IsUUID()
  reportedProviderId: string

  @ApiProperty({
    description: 'Role of the provider being reported',
    enum: ['doctor', 'nutritionist'],
    example: 'doctor',
  })
  @IsIn(['doctor', 'nutritionist'])
  reportedProviderRole: 'doctor' | 'nutritionist'

  @ApiProperty({
    description: 'Short reason for the report',
    example: 'Unprofessional behavior during consultation',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  reason: string

  @ApiProperty({
    description: 'Detailed description of the issue (optional)',
    example: 'The doctor was dismissive and did not listen to my concerns during the appointment on May 5th.',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiProperty({
    description: 'Array of base64-encoded images as proof (max 3). Each can be a data URI or raw base64 string.',
    required: false,
    type: [String],
    maxItems: 3,
    example: ['data:image/png;base64,iVBORw0KGgo...'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  images?: string[]
}

export class GetProviderReportsDto {
  @ApiProperty({
    description: 'Admin user ID for authorization check',
    example: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
  })
  @IsUUID()
  userId: string

  @ApiProperty({
    description: 'ID of the provider whose reports to fetch',
    example: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
  })
  @IsUUID()
  reportedProviderId: string
}

export class IssueProviderWarningDto {
  @ApiProperty({
    description: 'Admin user ID for authorization check',
    example: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
  })
  @IsUUID()
  userId: string

  @ApiProperty({
    description: 'ID of the provider to warn',
    example: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
  })
  @IsUUID()
  reportedProviderId: string

  @ApiProperty({
    description: 'Report ID that triggered this warning',
    example: 'c3d4e5f6-a1b2-7890-fedc-ba0987654321',
  })
  @IsUUID()
  reportId: string

  @ApiProperty({
    description: 'Optional admin notes to include with the warning',
    required: false,
    example: 'Multiple patients have reported similar issues. Please improve your consultation manner.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string
}
