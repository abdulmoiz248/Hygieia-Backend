import { IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class DeleteWorkerDto {
  @ApiProperty({
    example: 'drsarahjohnson@hygieia.com',
    description: 'Worker account email address to delete',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please provide a valid worker email address' })
  email: string
}