import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateLabTestDto {
  @ApiProperty({
    description: 'Admin user ID for authorization',
    example: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
  })
  @IsUUID()
  userId: string

  @ApiProperty({ description: 'Name of the lab test', example: 'Complete Blood Count (CBC)' })
  @IsString()
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({ description: 'Detailed description of the test', example: 'Measures various components of blood including red cells, white cells, hemoglobin...' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiProperty({
    description: 'Category of the lab test',
    example: 'Hematology',
  })
  @IsString()
  @MaxLength(100)
  category: string

  @ApiProperty({ description: 'Price of the lab test in PKR', example: 1500 })
  @IsNumber()
  @Min(0)
  price: number

  @ApiPropertyOptional({ description: 'Estimated duration (e.g. "24-48 hours")', example: '24-48 hours' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  duration?: string

  @ApiPropertyOptional({
    description: 'Preparation instructions for the patient',
    type: [String],
    example: ['Fast for 8-12 hours before the test', 'Avoid alcohol for 24 hours'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preparation_instructions?: string[]

  @ApiPropertyOptional({ description: 'Measurement unit for the test result', example: 'mg/dL' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string

  @ApiPropertyOptional({ description: 'Optimal range for normal results', example: '70-100' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  optimal_range?: string

  @ApiPropertyOptional({
    description: 'Type of record (lab or scan)',
    enum: ['lab', 'scan'],
    example: 'lab',
  })
  @IsOptional()
  @IsIn(['lab', 'scan'])
  record_type?: string
}

export class UpdateLabTestDto {
  @ApiProperty({
    description: 'Admin user ID for authorization',
    example: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
  })
  @IsUUID()
  userId: string

  @ApiPropertyOptional({ description: 'Name of the lab test', example: 'Complete Blood Count (CBC)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @ApiPropertyOptional({ description: 'Detailed description of the test' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiPropertyOptional({ description: 'Category of the lab test', example: 'Hematology' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @ApiPropertyOptional({ description: 'Price of the lab test in PKR', example: 2000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @ApiPropertyOptional({ description: 'Estimated duration', example: '24-48 hours' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  duration?: string

  @ApiPropertyOptional({
    description: 'Preparation instructions',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preparation_instructions?: string[]

  @ApiPropertyOptional({ description: 'Measurement unit', example: 'mg/dL' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string

  @ApiPropertyOptional({ description: 'Optimal range', example: '70-100' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  optimal_range?: string

  @ApiPropertyOptional({
    description: 'Type of record',
    enum: ['lab', 'scan'],
  })
  @IsOptional()
  @IsIn(['lab', 'scan'])
  record_type?: string
}

export class DeleteLabTestDto {
  @ApiProperty({
    description: 'Admin user ID for authorization',
    example: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
  })
  @IsUUID()
  userId: string
}
