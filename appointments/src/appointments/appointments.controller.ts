import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { AppointmentsService } from './appointments.service'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { CompleteNutritionistAppointmentDto } from './dto/complete-nutritionist-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'
import { AvailableSlotsQueryDto } from './dto/available-slots.dto'
import { CancelAppointmentDto } from './dto/cancel-appointment.dto'
import { MedicationTakenDto } from './dto/medication-taken.dto'
import { MedicationLogsQueryDto } from './dto/medication-logs-query.dto'
import { CompleteDoctorAppointmentDto } from './dto/complete-doctor-appointment.dto'
import { SubmitAppointmentReviewDto } from './dto/submit-appointment-review.dto'
import { GetProviderReviewsDto } from './dto/get-provider-reviews.dto'

@Controller()
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @MessagePattern({ cmd: 'create_appointment' })
  create(@Payload() dto: CreateAppointmentDto) {
    return this.svc.create(dto)
  }

  @MessagePattern({ cmd: 'find_all_appointments' })
  findAll(
    @Payload()
    query: {
      patientId?: string
      doctorId?: string
      status?: AppointmentStatus
      type?: AppointmentTypes
      mode?: AppointmentMode
      from?: string
      to?: string
      limit?: number
      offset?: number
    },
  ) {
    return this.svc.findAll(query)
  }

  @MessagePattern({ cmd: 'find_one_appointment' })
  findOne(@Payload() id: string) {
    return this.svc.findOne(id)
  }

  @MessagePattern({ cmd: 'update_appointment' })
  update(@Payload() payload: { id: string; dto: UpdateAppointmentDto }) {
    return this.svc.update(payload.id, payload.dto)
  }

  @MessagePattern({ cmd: 'remove_appointment' })
  remove(@Payload() id: string) {
    return this.svc.remove(id)
  }

  @MessagePattern({ cmd: 'complete_nutritionist_appointment' })
  completeNutritionistAppointment(
    @Payload()
    payload: { id: string; dto: CompleteNutritionistAppointmentDto; nutritionistId: string },
  ) {
    return this.svc.completeNutritionistAppointment(payload.id, payload.dto, payload.nutritionistId)
  }

  @MessagePattern({ cmd: 'cancel_appointment' })
  cancelAppointment(
    @Payload()
    payload: { id: string; dto: CancelAppointmentDto; nutritionistId: string },
  ) {
    return this.svc.cancelAppointment(payload.id, payload.dto, payload.nutritionistId)
  }


  @MessagePattern({ cmd: 'get_assigned_diet_plans' })
getAssignedDietPlans(@Payload() nutritionistId: string) {
  return this.svc.getAssignedDietPlans(nutritionistId)
}

@MessagePattern({ cmd: 'update_diet_plan' })
updateDietPlan(@Payload() payload: { dietPlanId: string; nutritionistId: string; dto: any }) {
  return this.svc.updateDietPlan(payload.dietPlanId, payload.dto)
}

@MessagePattern({ cmd: 'get_active_diet_plans_for_patient' })
getActiveDietPlansForPatient(@Payload() patientId: string) {
  return this.svc.getActiveDietPlansForPatient(patientId)
}


@MessagePattern({ cmd: 'get_appointments_for_patient' })
getAppointmentsForPatient(@Payload() patientId: string) {
  return this.svc.getAppointmentsForPatient(patientId)
}


@MessagePattern({ cmd: 'get_available_slots' })
getAvailableSlots(@Payload() payload:AvailableSlotsQueryDto) {
  return this.svc.getAvailableSlots(payload.providerId, payload.role, payload.date)
}


  @MessagePattern({ cmd: 'get_previous_appointments' })
  async getPreviousAppointments(
    @Payload() { nutritionistId, patientId }: { nutritionistId: string; patientId: string },
  ) {
    return this.svc.getPreviousAppointmentsForPatient(
      nutritionistId,
      patientId
    )
  }

  @MessagePattern({ cmd: 'complete_doctor_appointment' })
  completeDoctorAppointment(
    @Payload()
    payload: { id: string; dto: CompleteDoctorAppointmentDto; doctorId: string },
  ) {
    return this.svc.completeDoctorAppointment(payload.id, payload.dto, payload.doctorId)
  }

  @MessagePattern({ cmd: 'submit_appointment_review' })
  submitAppointmentReview(@Payload() payload: SubmitAppointmentReviewDto) {
    return this.svc.submitAppointmentReview(payload)
  }

  @MessagePattern({ cmd: 'get_provider_reviews' })
  getProviderReviews(@Payload() query: GetProviderReviewsDto) {
    return this.svc.getProviderReviews(query)
  }

  @MessagePattern({ cmd: 'get_assigned_prescriptions' })
  getAssignedPrescriptions(@Payload() doctorId: string) {
    return this.svc.getAssignedPrescriptions(doctorId)
  }

  @MessagePattern({ cmd: 'get_active_prescriptions_for_patient' })
  getActivePrescriptionsForPatient(@Payload() patientId: string) {
    return this.svc.getActivePrescriptionsForPatient(patientId)
  }

  @MessagePattern({ cmd: 'update_prescription' })
  updatePrescription(@Payload() payload: { prescriptionId: string; doctorId: string; dto: any }) {
    return this.svc.updatePrescription(payload.prescriptionId, payload.doctorId, payload.dto)
  }

  @MessagePattern({ cmd: 'get_previous_prescriptions' })
  getPreviousPrescriptions(@Payload() payload: { doctorId: string; patientId: string }) {
    return this.svc.getPreviousPrescriptionsForPatient(payload.doctorId, payload.patientId)
  }

  @MessagePattern({ cmd: 'save_medication_taken' })
  saveMedicationTaken(@Payload() payload: MedicationTakenDto) {
    return this.svc.saveMedicationTaken(payload)
  }

  @MessagePattern({ cmd: 'get_medication_logs' })
  getMedicationLogs(@Payload() payload: MedicationLogsQueryDto) {
    return this.svc.getMedicationLogs(payload)
  }


}
