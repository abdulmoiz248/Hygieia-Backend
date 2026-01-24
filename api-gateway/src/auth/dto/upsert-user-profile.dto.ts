import { IsString, IsOptional, IsIn, IsObject } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpsertUserProfileDto {
  @ApiProperty({
    example: 'patient',
    description: 'User role',
    enum: ['patient', 'doctor', 'nutritionist', 'lab-technician', 'admin']
  })
  @IsString({ message: 'Role must be a string' })
  @IsIn(['patient', 'doctor', 'nutritionist', 'lab-technician', 'admin'], {
    message: 'Role must be one of: patient, doctor, nutritionist, lab-technician, admin'
  })
  role: string

  @ApiProperty({
    description: 'Profile data object containing user information',
    example: {
      id: 'user-uuid',
      name: 'John Doe',
      phone: '+1234567890',
      gender: 'male'
    }
  })
  @IsObject({ message: 'Profile data must be an object' })
  profileData: Record<string, any>
}