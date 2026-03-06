import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendNewsletterDto {
  @IsString()
  @IsNotEmpty()
  html: string;

  @IsString()
  @IsOptional()
  subject?: string;
}
