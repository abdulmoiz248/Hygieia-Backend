import { IsOptional, IsString, IsUUID, IsArray } from 'class-validator'

export class CompleteDoctorAppointmentDto {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  referredTestIds?: string[]

  @IsOptional()
  @IsString()
  report?: string

  @IsOptional()
  prescription?: {
    medications: {
      name: string
      dosage: string
      frequency: string
      duration: string
      instructions?: string
      time?: string
    }[]
    notes?: string
    startDate?: string
    endDate?: string
    status?: 'active' | 'completed'
  }
}
