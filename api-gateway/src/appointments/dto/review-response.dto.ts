import { ApiProperty } from '@nestjs/swagger'

export class SubmitAppointmentReviewDataDto {
  @ApiProperty({ format: 'uuid' })
  id: string

  @ApiProperty({ format: 'uuid' })
  appointmentId: string

  @ApiProperty({ format: 'uuid' })
  patientId: string

  @ApiProperty({ format: 'uuid' })
  providerId: string

  @ApiProperty({ enum: ['doctor', 'nutritionist'] })
  providerRole: 'doctor' | 'nutritionist'

  @ApiProperty({ minimum: 1, maximum: 5 })
  rating: number

  @ApiProperty()
  review: string

  @ApiProperty({ format: 'date-time' })
  createdAt: string
}

export class SubmitAppointmentReviewProviderDto {
  @ApiProperty({ format: 'uuid' })
  id: string

  @ApiProperty({ enum: ['doctor', 'nutritionist'] })
  role: 'doctor' | 'nutritionist'

  @ApiProperty({ minimum: 0, maximum: 5 })
  rating: number

  @ApiProperty({ minimum: 0 })
  totalReviews: number
}

export class SubmitAppointmentReviewResponseDto {
  @ApiProperty()
  success: boolean

  @ApiProperty()
  message: string

  @ApiProperty({ type: SubmitAppointmentReviewDataDto })
  data: SubmitAppointmentReviewDataDto

  @ApiProperty({ type: SubmitAppointmentReviewProviderDto })
  provider: SubmitAppointmentReviewProviderDto
}

export class ProviderReviewItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string

  @ApiProperty({ format: 'uuid' })
  appointmentId: string

  @ApiProperty({ format: 'uuid' })
  patientId: string

  @ApiProperty()
  patientName: string

  @ApiProperty({ format: 'uuid' })
  providerId: string

  @ApiProperty({ enum: ['doctor', 'nutritionist'] })
  providerRole: 'doctor' | 'nutritionist'

  @ApiProperty({ minimum: 1, maximum: 5 })
  rating: number

  @ApiProperty()
  review: string

  @ApiProperty({ format: 'date-time' })
  createdAt: string
}

export class GetProviderReviewsResponseDto {
  @ApiProperty({ type: [ProviderReviewItemDto] })
  items: ProviderReviewItemDto[]

  @ApiProperty({ minimum: 0 })
  count: number

  @ApiProperty({ minimum: 1 })
  limit: number

  @ApiProperty({ minimum: 0 })
  offset: number
}
