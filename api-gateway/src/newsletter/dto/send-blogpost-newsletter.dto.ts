import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendBlogpostNewsletterDto {
  @ApiProperty({
    description: 'UUID of the blog post to send as newsletter',
    example: '9a5d2f1a-9bc7-4c52-8214-1f03e11faa01',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  blogpostId: string;

  @ApiProperty({
    description: 'User ID requesting the action (must be admin)',
    example: '5e3dd75b-7c38-4bf9-8a76-bc45bab74d7c',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
