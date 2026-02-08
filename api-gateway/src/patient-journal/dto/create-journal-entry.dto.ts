import { IsString, IsNotEmpty, IsArray, IsOptional, IsDate, IsEnum } from 'class-validator'

export enum JournalCategory {
  MEDICATION = 'medication',
  SYMPTOM = 'symptom',
  FOOD = 'food',
  MOOD = 'mood',
  EXERCISE = 'exercise',
  VITALS = 'vitals',
  GENERAL = 'general',
  ALERT = 'alert',
}

export enum AlertLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateJournalEntryDto {
  @IsString()
  @IsNotEmpty()
  patientId: string

  @IsString()
  @IsNotEmpty()
  message: string

  @IsArray()
  @IsEnum(JournalCategory, { each: true })
  @IsNotEmpty()
  categories: JournalCategory[]

  @IsArray()
  @IsOptional()
  tags?: string[]

  @IsEnum(AlertLevel)
  @IsOptional()
  alertLevel?: AlertLevel

  @IsOptional()
  @IsDate()
  entryDate?: Date

  @IsOptional()
  @IsString()
  attachmentUrl?: string
}
