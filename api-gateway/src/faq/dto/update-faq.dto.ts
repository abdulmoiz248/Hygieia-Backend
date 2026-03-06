import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFaqDto {
  @ApiPropertyOptional({
    description: 'The updated FAQ question text',
    example: 'How accurate is Hygieia\'s AI diagnosis system?',
    type: String,
    minLength: 1
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Question cannot be empty' })
  question?: string;

  @ApiPropertyOptional({
    description: 'The updated FAQ answer text',
    example: 'Our AI has been trained on millions of medical records and achieves a 95% accuracy rate.',
    type: String,
    minLength: 1
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Answer cannot be empty' })
  answer?: string;

  @ApiPropertyOptional({
    description: 'Updated display order index for the FAQ',
    example: 5,
    type: Number,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}
