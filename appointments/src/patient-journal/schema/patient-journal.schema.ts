import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type PatientJournalDocument = PatientJournal & Document

@Schema({ timestamps: true })
export class PatientJournal {
  @Prop({ required: true, index: true })
  patientId: string

  @Prop({ required: true })
  message: string

  @Prop({ type: [String], required: true })
  categories: string[]

  @Prop({ type: [String], default: [] })
  tags: string[]

  @Prop({ enum: ['low', 'medium', 'high', 'critical'], default: 'low' })
  alertLevel: string

  @Prop({ type: Date, default: () => new Date() })
  entryDate: Date

  @Prop({ type: String, default: null })
  attachmentUrl?: string

  @Prop({ type: Boolean, default: false })
  isPrivate: boolean
}

export const PatientJournalSchema = SchemaFactory.createForClass(PatientJournal)

// Create indexes for better query performance
PatientJournalSchema.index({ patientId: 1, entryDate: -1 })
PatientJournalSchema.index({ alertLevel: 1 })
