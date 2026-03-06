import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({
    description: 'The FAQ question text',
    example: 'How accurate is Hygieia\'s AI diagnosis?',
    type: String,
    minLength: 1
  })
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  question: string;

  @ApiProperty({
    description: 'The FAQ answer text',
    example: 'Hygieia\'s AI has been trained on millions of medical records and achieves a 95% accuracy rate for common conditions. However, it\'s designed to be a preliminary assessment tool, not a replacement for professional medical advice.',
    type: String,
    minLength: 1
  })
  @IsString()
  @IsNotEmpty({ message: 'Answer is required' })
  answer: string;

  @ApiPropertyOptional({
    description: 'Display order index for the FAQ (lower numbers appear first)',
    example: 1,
    type: Number,
    minimum: 0,
    default: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}
