import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendNewsletterDto {
  @ApiProperty({
    description: 'Newsletter HTML content',
    example: '<html>...</html>',
  })
  @IsString()
  @IsNotEmpty()
  html: string;

  @ApiPropertyOptional({
    description: 'Email subject line',
    example: 'Hygieia Weekly Health Newsletter',
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({
    description: 'Admin user ID',
    example: 'uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
