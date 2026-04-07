import { BadRequestException, Body, Controller, Delete, Get, Inject, Logger, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'
import { CompleteNutritionistAppointmentDto } from './dto/complete-nutritionist-appointment.dto'
import { CompleteDoctorAppointmentDto } from './dto/complete-doctor-appointment.dto'
import { firstValueFrom } from 'rxjs'
import { AvailableSlotsQueryDto } from './dto/available-slots.dto'
import { CancelAppointmentDto } from './dto/cancel-appointment.dto'
import { MedicationTakenDto } from './dto/medication-taken.dto'
import { MedicationLogsQueryDto } from './dto/medication-logs-query.dto'
import { SubmitAppointmentReviewDto } from './dto/submit-appointment-review.dto'
import { GetProviderReviewsDto } from './dto/get-provider-reviews.dto'
import { GetProviderReviewsResponseDto, SubmitAppointmentReviewResponseDto } from './dto/review-response.dto'
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  private readonly logger = new Logger(AppointmentsController.name)

  constructor(
    @Inject('APPOINTMENTS_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Get("/available-slots")
async getAvailableSlots(@Query() query: AvailableSlotsQueryDto) {
  const { providerId, role, date } = query
  console.log(query)
  return await firstValueFrom(
    this.client.send({ cmd: "get_available_slots" },query)
  )
}


  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.client.send({ cmd: 'create_appointment' }, dto)
  }


   @Get('patient')
  async getAppointmentsByPatient(@Query('patientId') patientId: string) {
     return this.client.send({ cmd: 'get_appointments_for_patient' },  patientId)
  }
  

  
  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('type') type?: AppointmentTypes,
    @Query('mode') mode?: AppointmentMode,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.client.send({ cmd: 'find_all_appointments' }, {
      patientId,
      doctorId,
      status,
      type,
      mode,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    })
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.client.send({ cmd: 'find_one_appointment' }, id)
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateAppointmentDto) {
    console.log("appointment dto=",dto)
    return this.client.send({ cmd: 'update_appointment' }, { id, dto })
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.client.send({ cmd: 'remove_appointment' }, id)
  }



  
  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete nutritionist appointment',
    description: 'Marks appointment as completed and optionally assigns diet plan/referred tests.',
  })
  @ApiParam({ name: 'id', description: 'Appointment ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Appointment completed successfully' })
  completeAppointment(
    @Param('id') id: string,
    @Body() body: { dto: CompleteNutritionistAppointmentDto; nutritionistId: string },
  ) {
    return this.client.send({ cmd: 'complete_nutritionist_appointment' }, { id, ...body })
  }

  @Post(':id/complete-doctor')
  @ApiOperation({
    summary: 'Complete doctor appointment',
    description: 'Marks doctor appointment as completed and optionally assigns prescription/referred tests.',
  })
  @ApiParam({ name: 'id', description: 'Appointment ID (UUID)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        doctorId: { type: 'string', format: 'uuid' },
        dto: {
          type: 'object',
          properties: {
            report: { type: 'string' },
            referredTestIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            prescription: {
              type: 'object',
              properties: {
                notes: { type: 'string' },
                startDate: { type: 'string', example: '2026-03-18' },
                endDate: { type: 'string', example: '2026-04-18' },
                status: { type: 'string', enum: ['active', 'completed'] },
                medications: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      dosage: { type: 'string' },
                      frequency: { type: 'string' },
                      duration: { type: 'string' },
                      instructions: { type: 'string' },
                      time: { type: 'string' },
                    },
                    required: ['name', 'dosage', 'frequency', 'duration'],
                  },
                },
              },
              required: ['medications'],
            },
          },
        },
      },
      required: ['doctorId', 'dto'],
    },
  })
  @ApiResponse({ status: 200, description: 'Doctor appointment completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload or appointment state' })
  completeDoctorAppointment(
    @Param('id') id: string,
    @Body() body: { dto: CompleteDoctorAppointmentDto; doctorId: string },
  ) {
    return this.client.send({ cmd: 'complete_doctor_appointment' }, { id, ...body })
  }

  @Get('prescriptions/assigned')
  @ApiOperation({
    summary: 'Get assigned prescriptions for doctor',
    description: 'Returns all prescriptions issued by a specific doctor.',
  })
  @ApiQuery({ name: 'doctorId', required: true, description: 'Doctor user ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Assigned prescriptions fetched successfully' })
  getAssignedPrescriptions(@Query('doctorId') doctorId: string) {
    return this.client.send({ cmd: 'get_assigned_prescriptions' }, doctorId)
  }

  @Get('prescriptions/patient/:patientId')
  @ApiOperation({
    summary: 'Get active prescriptions for patient',
    description: 'Returns active prescriptions for a patient based on status and date window.',
  })
  @ApiParam({ name: 'patientId', description: 'Patient user ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Active prescriptions fetched successfully' })
  async getActivePrescriptionsForPatient(@Param('patientId') patientId: string) {
    this.logger.log(`GET ACTIVE PRESCRIPTIONS request patientId=${patientId}`)
    try {
      const response = await firstValueFrom(this.client.send({ cmd: 'get_active_prescriptions_for_patient' }, patientId))
      this.logger.log(`GET ACTIVE PRESCRIPTIONS success patientId=${patientId}`)
      return response
    } catch (e: any) {
      const msg = e?.message || e?.error || 'Failed to fetch active prescriptions'
      this.logger.error(`GET ACTIVE PRESCRIPTIONS failed patientId=${patientId} reason=${msg}`, e?.stack)
      throw new BadRequestException(msg)
    }
  }

  @Patch('prescriptions/:id')
  @ApiOperation({
    summary: 'Update prescription',
    description: 'Updates an issued prescription. Only the issuing doctor can update it.',
  })
  @ApiParam({ name: 'id', description: 'Prescription ID (UUID)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        doctorId: { type: 'string', format: 'uuid' },
        dto: {
          type: 'object',
          properties: {
            notes: { type: 'string' },
            startDate: { type: 'string', example: '2026-03-18' },
            endDate: { type: 'string', example: '2026-04-18' },
            status: { type: 'string', enum: ['active', 'completed'] },
            medications: { type: 'array', items: { type: 'object' } },
          },
        },
      },
      required: ['doctorId', 'dto'],
    },
  })
  @ApiResponse({ status: 200, description: 'Prescription updated successfully' })
  updatePrescription(
    @Param('id') prescriptionId: string,
    @Body() body: { doctorId: string; dto: any },
  ) {
    return this.client.send({ cmd: 'update_prescription' }, { prescriptionId, ...body })
  }

  @Get('prescriptions/previous/:doctorId/:patientId')
  @ApiOperation({
    summary: 'Get previous prescriptions for patient (doctor POV)',
    description: 'Returns completed prescriptions for a doctor-patient pair.',
  })
  @ApiParam({ name: 'doctorId', description: 'Doctor user ID (UUID)' })
  @ApiParam({ name: 'patientId', description: 'Patient user ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Previous prescriptions fetched successfully' })
  getPreviousPrescriptions(
    @Param('doctorId') doctorId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.client.send({ cmd: 'get_previous_prescriptions' }, { doctorId, patientId })
  }

  @Post('prescriptions/medications/taken')
  @ApiOperation({
    summary: 'Save medication taken/un-taken event',
    description: 'Persists patient medicine adherence action and upserts latest action per medication per day.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['patientId', 'prescriptionId', 'medicationId', 'taken', 'takenAt'],
      properties: {
        patientId: { type: 'string', format: 'uuid' },
        prescriptionId: { type: 'string', format: 'uuid' },
        medicationId: { type: 'string', example: 'med-1' },
        taken: { type: 'boolean', enum: [true], example: true },
        takenAt: { type: 'string', format: 'date-time' },
        scheduledTime: { type: 'string', example: '08:00 AM' },
        source: { type: 'string', example: 'patient-web' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Medication status saved' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 404, description: 'Prescription or medication not found for patient' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async saveMedicationTaken(@Body() body: MedicationTakenDto) {
    this.logger.log(
      `SAVE MEDICATION TAKEN request patientId=${body.patientId} prescriptionId=${body.prescriptionId} medicationId=${body.medicationId} taken=${body.taken} takenAt=${body.takenAt ?? 'auto-now'}`,
    )
    try {
      const response = await firstValueFrom(this.client.send({ cmd: 'save_medication_taken' }, body))
      this.logger.log(
        `SAVE MEDICATION TAKEN success patientId=${body.patientId} prescriptionId=${body.prescriptionId} medicationId=${body.medicationId}`,
      )
      return response
    } catch (e: any) {
      const msg = e?.message || e?.error || 'Failed to save medication status'
      this.logger.error(
        `SAVE MEDICATION TAKEN failed patientId=${body.patientId} prescriptionId=${body.prescriptionId} medicationId=${body.medicationId} reason=${msg}`,
        e?.stack,
      )
      if (typeof msg === 'string' && msg.toLowerCase().includes('not found')) {
        throw new NotFoundException(msg)
      }
      throw new BadRequestException(msg)
    }
  }

  @Get('prescriptions/medications/logs')
  @ApiOperation({
    summary: 'Get medication adherence logs',
    description: 'Returns medication taken logs for a patient with optional date range filters.',
  })
  @ApiQuery({ name: 'patientId', required: true, description: 'Patient user ID (UUID)' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Medication logs fetched successfully' })
  async getMedicationLogs(@Query() query: MedicationLogsQueryDto) {
    try {
      return await firstValueFrom(this.client.send({ cmd: 'get_medication_logs' }, query))
    } catch (e: any) {
      const msg = e?.message || e?.error || 'Failed to fetch medication logs'
      throw new BadRequestException(msg)
    }
  }

  @Patch(':id/cancel')
  async cancelAppointment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CancelAppointmentDto,
  ) {
    console.log('Cancel appointment request body:', JSON.stringify(body, null, 2))
    const { nutritionistId, reason, notes, cancelledBy } = body
    const dto = { reason, notes, cancelledBy }
    console.log('Sending to microservice:', { id, dto, nutritionistId })
    return firstValueFrom(
      this.client.send({ cmd: 'cancel_appointment' }, { id, dto, nutritionistId })
    )
  }

  @Post(':id/review')
  @ApiOperation({
    summary: 'Submit appointment review',
    description:
      'Allows the patient to submit one review for a completed appointment. Also updates provider rating and triggers review notifications.',
  })
  @ApiParam({ name: 'id', description: 'Appointment ID (UUID)' })
  @ApiBody({ type: SubmitAppointmentReviewDto })
  @ApiOkResponse({
    description: 'Review submitted successfully',
    type: SubmitAppointmentReviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid review payload or appointment already reviewed' })
  @ApiResponse({ status: 403, description: 'Patient is not allowed to review this appointment' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  submitAppointmentReview(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SubmitAppointmentReviewDto,
  ) {
    return this.client.send(
      { cmd: 'submit_appointment_review' },
      {
        appointmentId: id,
        patientId: body.patientId,
        rating: body.rating,
        review: body.review,
      },
    )
  }

  @Get('reviews/provider')
  @ApiOperation({
    summary: 'Get doctor/nutritionist reviews',
    description: 'Fetches paginated reviews for a provider by provider ID and optional role filter.',
  })
  @ApiQuery({ name: 'providerId', required: true, description: 'Provider ID (UUID)' })
  @ApiQuery({ name: 'role', required: false, enum: ['doctor', 'nutritionist'] })
  @ApiQuery({ name: 'limit', required: false, description: 'Pagination limit, default 20' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset, default 0' })
  @ApiOkResponse({
    description: 'Provider reviews fetched successfully',
    type: GetProviderReviewsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query params' })
  getProviderReviews(@Query() query: GetProviderReviewsDto) {
    return this.client.send({ cmd: 'get_provider_reviews' }, query)
  }

   
  @Get('previous/:nutritionistId/:patientId')
  async getPreviousAppointments(
    @Param('nutritionistId') nutritionistId: string,
    @Param('patientId') patientId: string
  ) {
    return this.client.send({ cmd: 'get_previous_appointments' }, { nutritionistId, patientId })
  }




}
