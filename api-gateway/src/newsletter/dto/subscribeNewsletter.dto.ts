import { IsEmail, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SubscribeNewsletterDto {
  @ApiProperty({
    description: 'Email address to subscribe/unsubscribe',
    example: 'patient@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string
}