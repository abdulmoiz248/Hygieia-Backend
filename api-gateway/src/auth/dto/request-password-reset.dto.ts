import { IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to send password reset OTP',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string
}