import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateNewsletterHtmlDto {
  @ApiProperty({
    description: 'Newsletter content idea or theme',
    example: 'Weekly health tips about maintaining a balanced diet and exercise routine',
  })
  @IsString()
  @IsNotEmpty()
  idea: string;

  @ApiProperty({
    description: 'Admin user ID',
    example: 'uuid-string',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
