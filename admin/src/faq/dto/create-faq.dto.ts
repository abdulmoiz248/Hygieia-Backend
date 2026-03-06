import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateFaqDto {
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  question: string;

  @IsString()
  @IsNotEmpty({ message: 'Answer is required' })
  answer: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}
