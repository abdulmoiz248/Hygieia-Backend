import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateNewsletterHtmlDto {
  @IsString()
  @IsNotEmpty()
  idea: string;
}
