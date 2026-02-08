import { IsString, IsOptional, IsArray, IsEnum, IsDate } from 'class-validator'
import { JournalCategory, AlertLevel } from './create-journal-entry.dto'

export class UpdateJournalEntryDto {
  @IsString()
  @IsOptional()
  message?: string

  @IsArray()
  @IsEnum(JournalCategory, { each: true })
  @IsOptional()
  categories?: JournalCategory[]

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
