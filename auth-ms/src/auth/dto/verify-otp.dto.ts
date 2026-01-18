import { IsEmail, IsString, Length } from 'class-validator'

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string

  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string
}
