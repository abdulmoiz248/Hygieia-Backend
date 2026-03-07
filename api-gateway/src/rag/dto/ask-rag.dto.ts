import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AskRagDto {
  @ApiProperty({
    description: 'Admin user ID used for authorization against Supabase users table.',
    example: 'a6f8e1f7-6382-48ee-96d0-3cc4f4b5fb9e',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'User question to answer using retrieval-augmented generation.',
    example: 'What skills are most common among our top data science candidates?',
  })
  @IsString()
  @MaxLength(1000)
  question: string;

  @ApiPropertyOptional({
    description: 'Maximum number of candidate chunks to retrieve from FAISS.',
    default: 6,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;

  @ApiPropertyOptional({
    description: 'Minimum similarity score for chunks to be included in context.',
    default: 0.15,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number;

  @ApiPropertyOptional({
    description: 'Groq model override. Leave empty to use service default.',
    example: 'llama-3.1-8b-instant',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({
    description: 'Sampling temperature for generation.',
    default: 0.2,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;
}
