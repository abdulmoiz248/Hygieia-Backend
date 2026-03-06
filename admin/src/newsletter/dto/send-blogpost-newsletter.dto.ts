import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendBlogpostNewsletterDto {
  @IsUUID()
  @IsNotEmpty()
  blogpostId: string;
}
