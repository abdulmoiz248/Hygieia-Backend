import { IsEmail, IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string

  @ApiProperty({
    example: 'password123',
    description: 'User password'
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string
}