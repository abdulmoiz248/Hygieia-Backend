import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionDto {
  @ApiProperty({ description: 'Unique identifier for the question' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Type of question', example: 'rating' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'The question text' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Options for multiple choice questions', required: false })
  @IsOptional()
  @IsArray()
  options?: string[];
}

export class CreateFeedbackFormDto {
  @ApiProperty({ description: 'Admin user ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Title of the form', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Description of the form', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [QuestionDto], description: 'List of questions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @ApiProperty({ description: 'Percentage of patients to send the form to', minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  percentageOfUsers: number;

  @ApiProperty({ description: 'Expiry duration in hours', minimum: 1 })
  @IsNumber()
  @Min(1)
  durationHours: number;
}
