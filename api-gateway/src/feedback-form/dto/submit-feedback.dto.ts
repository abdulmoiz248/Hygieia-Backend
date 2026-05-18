import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsNotEmpty, IsEmail } from 'class-validator';

export class SubmitFeedbackDto {
  @ApiProperty({ description: 'Email of the user submitting the form' })
  @IsEmail()
  userEmail: string;

  @ApiProperty({ description: 'Answers mapped by question id' })
  @IsObject()
  answers: Record<string, any>;

  @ApiProperty({ description: 'Mandatory review about Hygieia' })
  @IsString()
  @IsNotEmpty()
  hygieiaReview: string;
}
