import { IsString, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionDto {
  @IsString()
  id: string;

  @IsString()
  type: string; // 'rating' | 'multiple_choice' | 'text'

  @IsString()
  text: string;

  @IsOptional()
  @IsArray()
  options?: string[];
}

export class CreateFeedbackFormDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @IsNumber()
  @Min(1)
  @Max(100)
  percentageOfUsers: number;

  @IsNumber()
  @Min(1)
  durationHours: number;
}
