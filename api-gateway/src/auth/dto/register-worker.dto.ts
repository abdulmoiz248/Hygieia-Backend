import { IsEmail, IsString, IsIn, IsNotEmpty, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterWorkerDto {
  @ApiProperty({
    example: 'Dr. Sarah Johnson',
    description: 'Full name of the healthcare worker',
    minLength: 2,
    maxLength: 100
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string

  @ApiProperty({
    example: 'doctor',
    description: 'Role of the healthcare worker',
    enum: ['doctor', 'nutritionist', 'lab-technician']
  })
  @IsString({ message: 'Role must be a string' })
  @IsIn(['doctor', 'nutritionist', 'lab-technician'], {
    message: 'Role must be either doctor, nutritionist, or lab-technician'
  })
  role: string

  @ApiProperty({
    example: 'sarah.johnson@gmail.com',
    description: 'Personal email address where credentials will be sent',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please provide a valid personal email address' })
  personalEmail: string
}