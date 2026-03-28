import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsString, IsUUID, Max, Min } from 'class-validator'

export class SubmitAppointmentReviewDto {
  @ApiProperty({ format: 'uuid', description: 'Patient ID who is submitting the review' })
  @IsUUID('all')
  patientId: string

  @ApiProperty({ minimum: 1, maximum: 5, description: 'Rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number

  @ApiProperty({ description: 'Written review for the provider/appointment' })
  @IsString()
  review: string
}
