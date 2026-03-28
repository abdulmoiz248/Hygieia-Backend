import { IsInt, IsString, IsUUID, Max, Min } from 'class-validator'

export class SubmitAppointmentReviewDto {
  @IsUUID('all')
  appointmentId: string

  @IsUUID('all')
  patientId: string

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number

  @IsString()
  review: string
}
