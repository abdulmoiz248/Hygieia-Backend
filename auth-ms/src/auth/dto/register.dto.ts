import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator'

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(32, { message: 'Password must not exceed 32 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string
}
