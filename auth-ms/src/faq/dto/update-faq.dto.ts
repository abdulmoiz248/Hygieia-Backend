import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateFaqDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Question cannot be empty' })
  question?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Answer cannot be empty' })
  answer?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}
