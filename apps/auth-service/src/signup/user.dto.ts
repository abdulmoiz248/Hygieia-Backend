import { IsEmail, IsNotEmpty, IsOptional, IsEnum, MinLength } from 'class-validator'

export enum Role {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
 PHARMACIST = 'PHARMACIST',
  LAB_TECHNICIAN  = 'LAB_TECHNICIAN',
  NUTRITIONIST  ='NUTRITIONIST'
}

export class CreateUserDto {
  @IsNotEmpty()
  name: string

  @IsEmail()
  email: string

  @IsOptional()
  @MinLength(6)
  password?: string

  @IsOptional()
  @IsEnum(Role)
  role?: Role

  @IsOptional()
  otp?: string
  
    @IsOptional()
    otpExpiry?: Date
}
