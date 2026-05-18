import { IsString, IsObject, IsNotEmpty, IsEmail } from 'class-validator';

export class SubmitFeedbackDto {
  @IsEmail()
  userEmail: string;

  @IsObject()
  answers: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  hygieiaReview: string;
}
