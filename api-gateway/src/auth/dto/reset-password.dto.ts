import { IsEmail, IsString, Length, IsNumberString, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code received via email',
    minLength: 6,
    maxLength: 6
  })
  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @IsNumberString({}, { message: 'OTP must contain only numbers' })
  otp: string

  @ApiProperty({
    example: 'NewPassword123',
    description: 'New password with at least 8 characters, containing uppercase, lowercase, and number',
    minLength: 8,
    maxLength: 32
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password must not exceed 32 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string
}