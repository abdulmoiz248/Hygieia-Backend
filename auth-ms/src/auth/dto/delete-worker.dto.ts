import { IsEmail } from 'class-validator'

export class DeleteWorkerDto {
  @IsEmail({}, { message: 'Please provide a valid worker email address' })
  email: string
}