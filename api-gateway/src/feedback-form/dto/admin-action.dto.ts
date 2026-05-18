import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AdminActionDto {
  @ApiProperty({ description: 'Admin user ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
