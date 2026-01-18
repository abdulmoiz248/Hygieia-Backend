import { IsEmail, IsString, Length, Matches } from 'class-validator'

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string

  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string

  @IsString({ message: 'New password must be a string' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string
}
