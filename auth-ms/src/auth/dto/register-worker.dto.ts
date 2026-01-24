import { IsEmail, IsString, IsIn, IsNotEmpty, MinLength, MaxLength } from 'class-validator'

export class RegisterWorkerDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string

  @IsString({ message: 'Role must be a string' })
  @IsIn(['doctor', 'nutritionist', 'lab-technician'], {
    message: 'Role must be either doctor, nutritionist, or lab-technician'
  })
  role: string

  @IsEmail({}, { message: 'Please provide a valid personal email address' })
  personalEmail: string
}