import { IsEmail, IsString, Length, IsNumberString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
    minLength: 6,
    maxLength: 6
  })
  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @IsNumberString({}, { message: 'OTP must contain only numbers' })
  otp: string
}