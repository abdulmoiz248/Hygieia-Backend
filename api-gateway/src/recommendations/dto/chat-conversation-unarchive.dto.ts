import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ChatConversationUnarchiveDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  patientId: string;
}