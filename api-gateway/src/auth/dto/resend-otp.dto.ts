import { IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResendOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to resend the verification OTP to',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string
}