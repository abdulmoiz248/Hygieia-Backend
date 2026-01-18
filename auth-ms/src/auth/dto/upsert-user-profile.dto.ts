import { IsString, IsObject } from 'class-validator'

export class UpsertUserProfileDto {
  @IsString({ message: 'Role must be a valid string' })
  role: string

  @IsObject({ message: 'Profile data must be a valid object' })
  profileData: Record<string, any>
}
