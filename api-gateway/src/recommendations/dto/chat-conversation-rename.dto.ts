import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChatConversationRenameDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  patientId: string;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title: string;
}