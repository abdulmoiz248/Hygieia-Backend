import { Equals, IsBoolean, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator'

export class MedicationTakenDto {
  @IsUUID()
  patientId: string

  @IsUUID()
  prescriptionId: string

  @IsString()
  medicationId: string

  @IsBoolean()
  @Equals(true)
  taken: boolean

  @IsOptional()
  @IsISO8601()
  takenAt?: string

  @IsOptional()
  @IsString()
  scheduledTime?: string

  @IsOptional()
  @IsString()
  source?: string
}
