import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChatMessageDto } from './chat-message.dto';

export class ChatRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @ApiProperty({ type: [ChatMessageDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;

  @ApiPropertyOptional({ description: 'If set, confirms an action without sending a new user message' })
  @IsOptional()
  @IsString()
  confirmActionToken?: string;
}
