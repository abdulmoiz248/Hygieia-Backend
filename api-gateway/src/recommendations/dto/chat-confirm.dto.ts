import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ChatConfirmDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  patientId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  conversationId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  actionToken: string;
}
