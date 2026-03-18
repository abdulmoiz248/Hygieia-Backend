import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE } from '../supabase/supabase.module'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'
import { InjectModel } from '@nestjs/mongoose'
import { Profile, ProfileDocument } from './schema/patient.profile.schema'
import { Model } from 'mongoose'
import { CompleteNutritionistAppointmentDto } from './dto/complete-nutritionist-appointment.dto'
import { CompleteDoctorAppointmentDto } from './dto/complete-doctor-appointment.dto'
import { NutritionistProfile, NutritionistProfileDocument } from './schema/nutritionist-profile.schema'
import { DoctorProfile, DoctorProfileDocument } from './schema/doctor-profile.schema'
import { MailerService } from '../mailer/mailer.service'
import { createZoomMeeting } from 'src/utils/zoom'
import { ClientProxy } from '@nestjs/microservices'
import { AppointmentMQDto } from './dto/appointmentMQ.dto'
import { AppointmentCancellationDto } from './dto/appointment-cancellation.dto'
import { AppointmentUpdateDto } from './dto/appointment-update.dto'
import { CancelAppointmentDto, CancellationReason } from './dto/cancel-appointment.dto'

type DbRow = {
  id: string
  patient_id: string
  doctor_id: string
  date: string
  time: string
  status: string
  type: string
  notes: string | null
  report: string | null
  mode: string
  data_shared: boolean
  link: string | null
  created_at: string
  updated_at: string
}

type ApiRow = {
  id: string
  patientId: string
  doctorId: string
  date: string
  time: string
  status: AppointmentStatus
  type: AppointmentTypes
  notes?: string | null
  report?: string | null
  mode: AppointmentMode
  dataShared: boolean
  link?: string | null
  googleEventId?: string | null
  createdAt: string
  updatedAt: string
}


type AppointmentWithDietPlan ={
  id: string
  date: string
  time: string
  status: string
  type: string
  notes?: string
  report?: string
  mode: string
  data_shared: boolean
  created_at: string
  updated_at: string
  diet_plan_id?: string
  diet_plan?: {
    id: string
    daily_calories: string
    protein: string
    carbs: string
    fat: string
    deficiency: string
    notes?: string
    calories_burned: string
    exercise: string
    start_date?: string
    end_date?: string
    created_at: string
  }[]
}

type PrescriptionMedication = {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  time?: string
}

type PrescriptionRow = {
  id: string
  appointment_id: string
  patient_id: string
  doctor_id: string
  medications: PrescriptionMedication[]
  notes: string | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'completed'
  created_at: string
  updated_at: string
}

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(NutritionistProfile.name) private nut: Model<NutritionistProfileDocument>,
    @InjectModel(DoctorProfile.name) private doctorProfileModel: Model<DoctorProfileDocument>,
    @Inject('SCHEDULER_SERVICE') private readonly schedulerClient: ClientProxy,
    @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
    private readonly mailerService: MailerService,

  ) {}

  private toApi(r: DbRow): ApiRow {
    return {
      id: r.id,
      patientId: r.patient_id,
      doctorId: r.doctor_id,
      date: r.date,
      time: r.time,
      status: r.status as AppointmentStatus,
      type: r.type as AppointmentTypes,
      notes: r.notes,
      report: r.report,
      mode: r.mode as AppointmentMode,
      dataShared: r.data_shared,
      link: r.link,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  }

  private toDb(dto: Partial<CreateAppointmentDto>): Partial<DbRow> {
    return {
      patient_id: dto.patientId as string,
      doctor_id: dto.doctorId as string,
      date: dto.date as string,
      time: dto.time as string,
      status: dto.status as string,
      type: dto.type as string,
      notes: dto.notes ?? null,
      report: dto.report ?? null,
      mode: dto.mode as string,
      data_shared: dto.dataShared as boolean,
      link: dto.link ?? null,
    //  google_event_id: dto.googleEventId ?? null,
    } as Partial<DbRow>
  }

  private normalizeAppointmentType(type: string): AppointmentTypes {
    const normalized = (type ?? '').toString().trim().toLowerCase()

    const aliases: Record<string, AppointmentTypes> = {
      consultation: AppointmentTypes.Consultation,
      emergency: AppointmentTypes.Emergency,
      'follow-up': AppointmentTypes.FollowUp,
      followup: AppointmentTypes.FollowUp,
      follow_up: AppointmentTypes.FollowUp,
      'follow up': AppointmentTypes.FollowUp,
    }

    const resolved = aliases[normalized]
    if (!resolved) {
      throw new BadRequestException(
        `Invalid appointment type '${type}'. Allowed types: consultation, follow-up, emergency`,
      )
    }

    return resolved
  }

  async create(dto: CreateAppointmentDto): Promise<ApiRow> {
    this.logger("Appointment creation called for patient id="+dto.patientId)

    dto.type = this.normalizeAppointmentType(dto.type as unknown as string)
    
    // Generate Zoom link if appointment mode is online
    let meetLink: string | null = null
    if (dto.mode === AppointmentMode.Online) {
      // We'll generate the link after we have the appointment ID
      // For now, we'll set it to null and update it after creation
    }
    
    const payload = this.toDb(dto)
    
    const { data, error } = await this.supabase.from('appointments').insert(payload).select().single()
    if (error) {
      this.logger("APPOINTMENT CREATION ERROR OCCURED ERROR: "+error.message)
      throw new BadRequestException(error.message)
    }
    
    const appointmentData = data as DbRow
    
    // Generate Zoom link if appointment mode is online
    if (dto.mode === AppointmentMode.Online) {
      try {
        // Fetch patient and doctor details for Zoom link generation
        const patient = await this.profileModel.findOne({ id: dto.patientId }).lean()
        const doctor = await this.nut.findOne({ id: dto.doctorId }).lean()
        
        // Fetch patient and doctor emails from users table
        const { data: patientUser, error: patientUserError } = await this.supabase
          .from('users')
          .select('email')
          .eq('id', dto.patientId)
          .single()
        
        const { data: doctorUser, error: doctorUserError } = await this.supabase
          .from('users')
          .select('email')
          .eq('id', dto.doctorId)
          .single()
        
        if (patient && doctor && patientUser?.email && doctorUser?.email) {
        
          const meetResult = await createZoomMeeting({
            patientEmail: patientUser.email,
            nutritionistEmail: doctorUser.email,
            patientName: patient.name || 'Patient',
            nutritionistName: doctor.name || 'Doctor',
            appointmentDate: dto.date,
            appointmentTime: dto.time,
            appointmentId: appointmentData.id,
            notes: dto.notes
          })
          
          console.log("Meet Result=", meetResult.joinLink)
          console.log("Meet Result ID=", meetResult.meetingId)
          console.log("Meet Result Start Link=", meetResult.startLink)
          meetLink = meetResult.joinLink

          // Update the appointment with the meet link and Zoom meeting ID
          const { error: updateError } = await this.supabase
            .from('appointments')
            .update({ 
              link: meetLink,
              start_link: meetResult.startLink
            })
            .eq('id', appointmentData.id)
          
          if (updateError) {
            this.logger("ERROR UPDATING APPOINTMENT WITH MEET LINK: " + updateError.message)
          } else {
            appointmentData.link = meetLink
           
            this.logger("REAL ZOOM MEET LINK GENERATED AND STORED: " + meetLink)
            this.logger("ZOOM MEETING ID: " + meetResult.meetingId)
          }
        } else {
          this.logger("COULD NOT CREATE MEET LINK - MISSING PATIENT/DOCTOR DATA OR EMAILS")
          if (patientUserError) this.logger("PATIENT USER ERROR: " + patientUserError.message)
          if (doctorUserError) this.logger("DOCTOR USER ERROR: " + doctorUserError.message)
        }
      } catch (error) {
        this.logger("ERROR GENERATING REAL GOOGLE MEET LINK: " + error.message)
        // Don't throw error, just log it - appointment creation should still succeed
      }
    }
    



    // Send confirmation email to patient
    try {
      const patient = await this.profileModel.findOne({ id: dto.patientId }).lean()
      const doctor = await this.nut.findOne({ id: dto.doctorId }).lean()
      
      // Fetch patient email from users table
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', dto.patientId)
        .single()
      
      if (patient && doctor && userData?.email) {



        //rabbit mq - emit appointment created event for scheduling
        this.schedulerClient.emit('appointment_created', {
          appointment_id: appointmentData.id,
          patient_id: dto.patientId,
          doctor_id: dto.doctorId,
          patient_email: userData.email,
          patient_name: patient.name || 'Patient',
          doctor_name: doctor.name || 'Doctor',
          appointment_date: dto.date,
          appointment_time: dto.time,
          appointment_mode: dto.mode,
          appointment_link: meetLink || undefined,

        } as AppointmentMQDto);

        //rabbit mq - emit appointment created event for sending email
        this.mailerClient.emit('appointment_created', {
          appointment_id: appointmentData.id,
          patient_id: dto.patientId,
          doctor_id: dto.doctorId,
          patient_email: userData.email,
          patient_name: patient.name || 'Patient',
          doctor_name: doctor.name || 'Doctor',
          appointment_date: dto.date,
          appointment_time: dto.time,
          appointment_mode: dto.mode,
          appointment_link: meetLink || undefined,
        
        } as AppointmentMQDto );

        
      } else {
        this.logger("COULD NOT SEND EMAIL - MISSING PATIENT/DOCTOR DATA OR EMAIL")
        if (userError) {
          this.logger("ERROR FETCHING USER EMAIL: " + userError.message)
        }
      }
    } catch (error) {
      this.logger("ERROR SENDING APPOINTMENT CONFIRMATION EMAIL: " + error.message)
      // Don't throw error, just log it - appointment creation should still succeed
    }
    
    this.logger("APPOINTMENT CREATED FOR PATIENT ID= "+payload.patient_id +" doctor id= "+payload.doctor_id +" at "+data.created_at)  
    return this.toApi(appointmentData)
  }

async findAll(query: {
  patientId?: string
  doctorId?: string
  status?: AppointmentStatus
  type?: AppointmentTypes
  mode?: AppointmentMode
  from?: string
  to?: string
  limit?: number
  offset?: number
}): Promise<{ items: any[]; count: number }> {
  this.logger("APPOINTMENT QUERY CALLED, QUERY="+JSON.stringify(query,null,2))
  let q = this.supabase.from('appointments').select('*', { count: 'exact' })

  if (query.patientId) q = q.eq('patient_id', query.patientId)
  if (query.doctorId) q = q.eq('doctor_id', query.doctorId)
  if (query.status && query.status!='all') q = q.eq('status', query.status)
  if (query.type) q = q.eq('type', query.type)
  if (query.mode) q = q.eq('mode', query.mode)
  if (query.from) q = q.gte('date', query.from)
  if (query.to) q = q.lte('date', query.to)

  const limit = query.limit ?? 20
  const offset = query.offset ?? 0
  q = q.order('date', { ascending: true }).order('time', { ascending: true }).range(offset, offset + limit - 1)

  const { data, error, count } = await q
  if (error) throw new BadRequestException(error.message)
  if (!data || data.length === 0) return { items: [], count: 0 }

  console.log("Data=", data)

  // Fetch all patients in parallel
  const patientPromises = data.map(row => this.profileModel.findOne({ id: row.patient_id }).lean())
  const patients = await Promise.all(patientPromises)

  const items:any[] = data.map((row, i) => {
    const patient = patients[i]
    if (!patient) return null

    return {
      id: row.id,
      patient: patient as any,
      doctor: { id: row.doctor_id } as any, // plug doctor lookup later
      date: row.date,
      time: row.time,
      status: row.status as AppointmentStatus,
      type: row.type as AppointmentTypes,
      notes: row.notes ?? undefined,
      report: row.report ?? undefined,
      mode: row.mode as AppointmentMode,
      dataShared: row.data_shared,
      start_link: row.start_link ?? undefined,
    }
  }).filter(Boolean) as any[]

  this.logger("Total APPOINTMENT ITEMS RETURNED ARE " + (count ?? 0))
  return { items, count: count ?? 0 }
}



  async findOne(id: string): Promise<ApiRow> {
    this.logger(" FINDING APPOINTMENT FOR ID="+id)
    const { data, error } = await this.supabase.from('appointments').select('*').eq('id', id).single()
    if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
    if (error) throw new BadRequestException(error.message)
    this.logger(" APPOINTMENT FOR ID "+id+ " FOUND")  
    return this.toApi(data as DbRow)
  }

async update(id: string, dto: any): Promise<ApiRow> {
  this.logger("APPOINTMENT UPDATE CALLED FOR APPOINTMENT ID=" + id )

  // Fetch the current appointment to get previous values
  const { data: currentAppointment, error: fetchError } = await this.supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
  if (fetchError) throw new BadRequestException(fetchError.message)

  const payload = {
    patient_id: dto.patient?.id,
    doctor_id: dto.doctor?.id,
    date: dto.date,
    time: dto.time,
    status: dto.status,
    type: dto.type,
    notes: dto.notes,
    mode: dto.mode,
    data_shared: dto.dataShared
  }

  this.logger("APPOINTMENT UPDATE PAYLOAD= " + JSON.stringify(payload,null,2) )

  const { data, error } = await this.supabase
    .from('appointments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
  if (error) throw new BadRequestException(error.message)

  this.logger("APPOINTMENT UPDATED SUCCESSFULLY FOR=" + id)

  // Send appropriate email based on status change
  try {
    const patient = await this.profileModel.findOne({ id: data.patient_id }).lean()
    const doctor = await this.nut.findOne({ id: data.doctor_id }).lean()
    
    // Fetch patient email from users table
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', data.patient_id)
      .single()
    
    if (patient && doctor && userData?.email) {
      // Check if status changed to cancelled
      if (dto.status === 'cancelled' && currentAppointment.status !== 'cancelled') {
        const cancellationDate = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        
        const cancellationPayload = {
          appointment_id: id,
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          patient_email: userData.email,
          patient_name: patient.name || 'Patient',
          doctor_name: doctor.name || 'Doctor',
          appointment_date: data.date,
          appointment_time: data.time,
          appointment_mode: data.mode,
          appointment_link: data.link || undefined,
          cancellation_date: cancellationDate,
          cancellation_reason: 'patient-request',
          cancellation_notes: dto.notes || undefined,
        }
        
        // Send cancellation email to patient
        this.logger(`Sending cancellation email to ${userData.email}`)
        this.mailerClient.emit('appointment_cancelled', cancellationPayload)
        
        // Send in-app notifications to both patient and doctor via scheduler
        this.logger(`Sending cancellation notifications to scheduler`)
        this.schedulerClient.emit('appointment_cancelled', cancellationPayload)
      } 
      // Send update email for other changes
      else if (dto.status !== 'cancelled') {
        this.logger(`Sending update email to ${userData.email}`)
        this.mailerClient.emit('appointment_updated', {
          appointment_id: id,
          patient_id: data.patient_id,
          doctor_id: data.doctor_id,
          patient_email: userData.email,
          patient_name: patient.name || 'Patient',
          doctor_name: doctor.name || 'Doctor',
          appointment_date: data.date,
          appointment_time: data.time,
          appointment_mode: data.mode,
          appointment_link: data.link || undefined,
          previous_date: currentAppointment.date,
          previous_time: currentAppointment.time,
        } as AppointmentUpdateDto)
      }
    } else {
      this.logger("COULD NOT SEND EMAIL - MISSING PATIENT/DOCTOR DATA OR EMAIL")
      if (userError) {
        this.logger("ERROR FETCHING USER EMAIL: " + userError.message)
      }
    }
  } catch (error) {
    this.logger("ERROR SENDING APPOINTMENT UPDATE EMAIL: " + error.message)
    // Don't throw error, just log it - update should still succeed
  }

  return this.toApi(data as DbRow)
}


  async remove(id: string): Promise<{ id: string; cancelled: boolean }> {
    this.logger(" APPOINTMENT CANCEL CALLED FOR APPOINTMENT ID= "+id)
    
    // Fetch appointment details before cancelling
    const { data: appointment, error: fetchError } = await this.supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError?.message?.includes('No rows')) throw new NotFoundException('Appointment not found')
    if (fetchError) throw new BadRequestException(fetchError.message)
    
    // Update status to cancelled instead of deleting
    const { error } = await this.supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
    
    if (error) throw new BadRequestException(error.message)
    
    this.logger(" APPOINTMENT STATUS UPDATED TO CANCELLED FOR APPOINTMENT ID= "+id)
    
    // Send cancellation email
    try {
      const patient = await this.profileModel.findOne({ id: appointment.patient_id }).lean()
      const doctor = await this.nut.findOne({ id: appointment.doctor_id }).lean()
      
      // Fetch patient email from users table
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', appointment.patient_id)
        .single()
      
      if (patient && doctor && userData?.email) {
        const cancellationDate = new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        
        this.logger(`Sending cancellation email to ${userData.email}`)
        this.mailerClient.emit('appointment_cancelled', {
          appointment_id: id,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          patient_email: userData.email,
          patient_name: patient.name || 'Patient',
          doctor_name: doctor.name || 'Doctor',
          appointment_date: appointment.date,
          appointment_time: appointment.time,
          appointment_mode: appointment.mode,
          appointment_link: appointment.link || undefined,
          cancellation_date: cancellationDate,
        } as AppointmentCancellationDto)
      } else {
        this.logger("COULD NOT SEND CANCELLATION EMAIL - MISSING PATIENT/DOCTOR DATA OR EMAIL")
        if (userError) {
          this.logger("ERROR FETCHING USER EMAIL: " + userError.message)
        }
      }
    } catch (error) {
      this.logger("ERROR SENDING APPOINTMENT CANCELLATION EMAIL: " + error.message)
      // Don't throw error, just log it - cancellation should still succeed
    }
    
    return { id, cancelled: true }
  }


  /**
   * Cancel an appointment with reason and notes
   * Used by nutritionist portal for detailed cancellation
   */
  async cancelAppointment(
    id: string,
    dto: CancelAppointmentDto,
    nutritionistId: string
  ): Promise<{
    success: boolean
    message: string
    appointment: {
      id: string
      status: string
      cancellationReason: string
      cancellationNotes: string | null
      cancelledAt: string
      cancelledBy: string
    }
  }> {
    this.logger(`CANCEL APPOINTMENT CALLED FOR ID=${id} BY NUTRITIONIST=${nutritionistId}`)

    const VALID_REASONS: CancellationReason[] = [
      CancellationReason.Emergency,
      CancellationReason.Scheduling,
      CancellationReason.PatientRequest,
      CancellationReason.Unavailable,
      CancellationReason.Other,
    ]

    // Validate reason
    if (!dto.reason || !VALID_REASONS.includes(dto.reason)) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_REASON',
        message: 'A valid cancellation reason is required',
      })
    }

    // Find appointment
    const { data: appointment, error: fetchError } = await this.supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError?.message?.includes('No rows')) {
      throw new NotFoundException({
        success: false,
        error: 'NOT_FOUND',
        message: 'Appointment not found',
      })
    }
    if (fetchError) throw new BadRequestException(fetchError.message)

    // Check authorization - nutritionist must be assigned to this appointment
    if (appointment.doctor_id !== nutritionistId) {
      throw new ForbiddenException({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to cancel this appointment',
      })
    }

    // Check if appointment can be cancelled (only upcoming appointments)
    if (appointment.status !== 'upcoming') {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_STATUS',
        message: 'Cannot cancel an appointment that is already cancelled or completed',
      })
    }

    const cancelledAt = new Date().toISOString()

    // Combine reason and notes for storage
    const combinedCancellationReason = dto.notes 
      ? `${dto.reason}: ${dto.notes}` 
      : dto.reason

    // Update appointment with cancellation details
    const { data: updatedAppointment, error: updateError } = await this.supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: combinedCancellationReason,
        cancelled_by: dto.cancelledBy,
        updated_at: cancelledAt,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw new BadRequestException(updateError.message)

    this.logger(`APPOINTMENT ${id} CANCELLED SUCCESSFULLY`)

    // Send notifications (async - don't block response)
    this.sendCancellationNotifications(
      appointment,
      dto,
      nutritionistId,
      cancelledAt
    ).catch((err) => {
      this.logger(`ERROR SENDING CANCELLATION NOTIFICATIONS: ${err.message}`)
    })

    return {
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        cancellationReason: updatedAppointment.cancellation_reason,
        cancellationNotes: dto.notes || null,
        cancelledAt: cancelledAt,
        cancelledBy: dto.cancelledBy,
      },
    }
  }

  /**
   * Helper method to send cancellation notifications
   */
  private async sendCancellationNotifications(
    appointment: any,
    dto: CancelAppointmentDto,
    nutritionistId: string,
    cancelledAt: string
  ): Promise<void> {
    try {
      const patient = await this.profileModel.findOne({ id: appointment.patient_id }).lean()
      const doctor = await this.nut.findOne({ id: nutritionistId }).lean()

      // Fetch patient email from users table
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', appointment.patient_id)
        .single()

      if (patient && doctor && userData?.email) {
        const cancellationDate = new Date(cancelledAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })

        const cancellationPayload = {
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          patient_email: userData.email,
          patient_name: patient.name || 'Patient',
          doctor_name: doctor.name || 'Doctor',
          appointment_date: appointment.date,
          appointment_time: appointment.time,
          appointment_mode: appointment.mode,
          appointment_link: appointment.link || undefined,
          cancellation_date: cancellationDate,
          cancellation_reason: dto.reason,
          cancellation_notes: dto.notes,
        }

        // Send cancellation email via mailer service
        this.logger(`Sending cancellation email to ${userData.email}`)
        this.mailerClient.emit('appointment_cancelled', cancellationPayload)

        // Send in-app notifications to both patient and doctor via scheduler service
        this.logger(`Sending cancellation notifications via scheduler service`)
        this.schedulerClient.emit('appointment_cancelled', cancellationPayload)

        this.logger(`Cancellation notifications sent for appointment ${appointment.id}`)
      } else {
        this.logger('COULD NOT SEND CANCELLATION NOTIFICATIONS - MISSING PATIENT/DOCTOR DATA OR EMAIL')
        if (userError) {
          this.logger('ERROR FETCHING USER EMAIL: ' + userError.message)
        }
      }
    } catch (error) {
      this.logger('ERROR IN sendCancellationNotifications: ' + error.message)
      throw error
    }
  }


async completeNutritionistAppointment(
  id: string,
  dto: CompleteNutritionistAppointmentDto,
  nutritionistId: string
): Promise<ApiRow> {
  this.logger("COMPLETE NUTRITIONIST APPOINTMENT CALLED FOR NUTRITIONIST ID=" + nutritionistId)
  
  const { data: appointment, error } = await this.supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single()

  if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
  if (error) throw new BadRequestException(error.message)

  const appt = appointment as DbRow
  let dietPlanId: string | null = null

  const tasks: Promise<any>[] = []

  if (dto.referredTestIds?.length) {
    const inserts = dto.referredTestIds.map(testId => ({
      test_id: testId,
      patient_id: appt.patient_id,
      referrer_id: nutritionistId,
    }))
    this.logger("NUTRITIONIST REFERRED TOTAL " + inserts.length + " TEST(s)")
    tasks.push(this.supabase.from('referred_tests').insert(inserts).then(r => r) as any)
  }

  if (dto.dietPlan) {
    const dietInsert = await this.supabase
      .from('diet_plan')
      .insert({
        patient_id: appt.patient_id,
        nutritionist_id: nutritionistId,
        daily_calories: dto.dietPlan.dailyCalories,
        protein: dto.dietPlan.protein,
        carbs: dto.dietPlan.carbs,
        fat: dto.dietPlan.fat,
        deficiency: dto.dietPlan.deficiency,
        notes: dto.dietPlan.notes ?? null,
        calories_burned: dto.dietPlan.caloriesBurned,
        exercise: dto.dietPlan.exercise,
        start_date: dto.dietPlan.startDate ?? null,
        end_date: dto.dietPlan.endDate ?? null,
      })
      .select('id')
      .single()

    if (dietInsert.error) throw new BadRequestException(dietInsert.error.message)
    dietPlanId = dietInsert.data.id
  }

  if (tasks.length) {
    const results = await Promise.all(tasks)
    results.forEach((res) => {
      if (res.error) throw new BadRequestException(res.error.message)
    })
  }

  this.logger("REFERRED ALL TEST(s) AND/OR DIET PLAN ASSIGNED TO THE PATIENT")

  const { data: updated, error: updateErr } = await this.supabase
    .from('appointments')
    .update({
      status: 'completed',
      report: dto.report ?? appt.report,
      updated_at: new Date().toISOString(),
      diet_plan_id: dietPlanId ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateErr) throw new BadRequestException(updateErr.message)
  
  this.logger("APPOINTMENT STATUS UPDATED AND LINKED TO DIET PLAN (IF ANY)")

  return this.toApi(updated as DbRow)
}

async completeDoctorAppointment(
  id: string,
  dto: CompleteDoctorAppointmentDto,
  doctorId: string,
): Promise<ApiRow> {
  this.logger('COMPLETE DOCTOR APPOINTMENT CALLED FOR DOCTOR ID=' + doctorId)

  const { data: appointment, error } = await this.supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single()

  if (error?.message?.includes('No rows')) throw new NotFoundException('appointment not found')
  if (error) throw new BadRequestException(error.message)

  const appt = appointment as DbRow
  let prescriptionId: string | null = null

  if (appt.doctor_id !== doctorId) {
    throw new ForbiddenException('You are not authorized to complete this appointment')
  }

  const tasks: Promise<any>[] = []

  if (dto.referredTestIds?.length) {
    const inserts = dto.referredTestIds.map(testId => ({
      test_id: testId,
      patient_id: appt.patient_id,
      referrer_id: doctorId,
    }))
    this.logger('DOCTOR REFERRED TOTAL ' + inserts.length + ' TEST(s)')
    tasks.push(this.supabase.from('referred_tests').insert(inserts).then(r => r) as any)
  }

  if (dto.prescription?.medications?.length) {
    const status = dto.prescription.status ?? 'active'

    const prescriptionInsert = await this.supabase
      .from('prescriptions')
      .insert({
        appointment_id: appt.id,
        patient_id: appt.patient_id,
        doctor_id: doctorId,
        medications: dto.prescription.medications,
        notes: dto.prescription.notes ?? null,
        start_date: dto.prescription.startDate ?? null,
        end_date: dto.prescription.endDate ?? null,
        status,
      })
      .select('id')
      .single()

    if (prescriptionInsert.error) throw new BadRequestException(prescriptionInsert.error.message)
    prescriptionId = prescriptionInsert.data.id
    this.logger('PRESCRIPTION CREATED WITH ID=' + prescriptionInsert.data.id)
  }

  if (tasks.length) {
    const results = await Promise.all(tasks)
    results.forEach((res) => {
      if (res.error) throw new BadRequestException(res.error.message)
    })
  }

  const appointmentUpdatePayload: Record<string, any> = {
    status: 'completed',
    report: dto.report ?? appt.report,
    updated_at: new Date().toISOString(),
  }

  if (prescriptionId) {
    appointmentUpdatePayload.prescription_id = prescriptionId
  }

  const { data: updated, error: updateErr } = await this.supabase
    .from('appointments')
    .update(appointmentUpdatePayload)
    .eq('id', id)
    .select()
    .single()

  if (updateErr) throw new BadRequestException(updateErr.message)

  this.logger('APPOINTMENT COMPLETED BY DOCTOR FOR APPOINTMENT ID=' + id)

  return this.toApi(updated as DbRow)
}

async getAssignedPrescriptions(doctorId: string) {
  this.logger('FETCHING PRESCRIPTIONS FOR DOCTOR ID=' + doctorId)

  const { data, error } = await this.supabase
    .from('prescriptions')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false })

  if (error) throw new BadRequestException(error.message)
  if (!data) return []

  const enriched: any[] = []

  for (const row of data as PrescriptionRow[]) {
    const patient = await this.profileModel.findOne({ id: row.patient_id }).lean()
    enriched.push({
      ...row,
      patientName: patient?.name || '',
    })
  }

  this.logger('TOTAL ' + enriched.length + ' PRESCRIPTIONS FOUND FOR DOCTOR')
  return enriched
}

async getActivePrescriptionsForPatient(patientId: string) {
  this.logger('FETCHING ACTIVE PRESCRIPTIONS FOR PATIENT ID=' + patientId)

  const { data, error } = await this.supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (error) throw new BadRequestException(error.message)
  if (!data) return []

  const today = new Date().toISOString().split('T')[0]

  const active = (data as PrescriptionRow[]).filter((row) => {
    if (row.status !== 'active') return false
    const startsOk = !row.start_date || row.start_date <= today
    const endsOk = !row.end_date || row.end_date >= today
    return startsOk && endsOk
  })

  const enriched = await Promise.all(
    active.map(async (row) => {
      const doctor = await this.doctorProfileModel.findOne({ id: row.doctor_id }).lean()
      return {
        ...row,
        doctorName: doctor?.name || '',
      }
    }),
  )

  this.logger('TOTAL ' + enriched.length + ' ACTIVE PRESCRIPTIONS FOUND FOR PATIENT')
  return enriched
}

async updatePrescription(
  prescriptionId: string,
  doctorId: string,
  payload: Partial<{
    medications: PrescriptionMedication[]
    notes: string
    startDate: string
    endDate: string
    status: 'active' | 'completed'
  }>,
) {
  this.logger('UPDATING PRESCRIPTION ID=' + prescriptionId + ' FOR DOCTOR=' + doctorId)

  const { data: existing, error: fetchErr } = await this.supabase
    .from('prescriptions')
    .select('*')
    .eq('id', prescriptionId)
    .single()

  if (fetchErr?.message?.includes('No rows')) throw new NotFoundException('Prescription not found')
  if (fetchErr) throw new BadRequestException(fetchErr.message)

  if ((existing as PrescriptionRow).doctor_id !== doctorId) {
    throw new ForbiddenException('You are not allowed to update this prescription')
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.medications !== undefined) updates.medications = payload.medications
  if (payload.notes !== undefined) updates.notes = payload.notes
  if (payload.startDate !== undefined) updates.start_date = payload.startDate
  if (payload.endDate !== undefined) updates.end_date = payload.endDate
  if (payload.status !== undefined) updates.status = payload.status

  const { data, error } = await this.supabase
    .from('prescriptions')
    .update(updates)
    .eq('id', prescriptionId)
    .select('*')
    .single()

  if (error) throw new BadRequestException(error.message)

  return data
}

async getPreviousPrescriptionsForPatient(doctorId: string, patientId: string) {
  this.logger(`FETCHING PREVIOUS PRESCRIPTIONS FOR DOCTOR=${doctorId}, PATIENT=${patientId}`)

  const { data, error } = await this.supabase
    .from('prescriptions')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (error) throw new BadRequestException(error.message)
  if (!data) return []

  const result = await Promise.all(
    (data as PrescriptionRow[]).map(async (row) => {
      const { data: appointment } = await this.supabase
        .from('appointments')
        .select('id, date, time, status, type, mode, report')
        .eq('id', row.appointment_id)
        .single()

      return {
        ...row,
        appointment: appointment ?? null,
      }
    }),
  )

  this.logger(`FETCHED ${result.length} PREVIOUS PRESCRIPTION(S) FOR PATIENT=${patientId}`)
  return result
}



// Get all diet plans assigned by a nutritionist
async getAssignedDietPlans(nutritionistId: string) {
    this.logger("FETCHING DIET PLANS FOR NUTRITIONIST ID= "+nutritionistId)
  const { data, error } = await this.supabase
    .from('diet_plan')
    .select('*')
    .eq('nutritionist_id', nutritionistId)
    .order('created_at', { ascending: false })

  if (error) throw new BadRequestException(error.message)
  if (!data) return []

  const enrichedPlans:any = []

  for (const plan of data) {
    // lookup patient from MongoDB
    const patient = await this.profileModel.findOne({ id: plan.patient_id }).lean()

    enrichedPlans.push({
      ...plan,
      patientName: patient?.name || ""
    })
  }
  this.logger("TOTAL "+enrichedPlans.length+ " DIET PLANS FOUND FOR NUTRITIONIST")
  return enrichedPlans
}




async updateDietPlan(
  dietPlanId: string,
  payload: Partial<{
    dailyCalories: string
    protein: string
    carbs: string
    fat: string
    deficiency: string
    notes: string
    caloriesBurned: string
    exercise: string
    startDate: string
    endDate: string
    nutritionist_id: string
  }>
) {
  this.logger('--- updateDietPlan called ---')
  this.logger('dietPlanId:'+ dietPlanId)
  this.logger('payload:'+ payload)

  // first check ownership
  const { data: existing, error: fetchErr } = await this.supabase
    .from('diet_plan')
    .select('*')
    .eq('id', dietPlanId)
    .single()

  this.logger('existing diet plan:'+ existing)
  this.logger('fetchErr:'+ fetchErr)

  if (fetchErr?.message?.includes('No rows')) {
    console.error('Diet plan not found')
    throw new NotFoundException('Diet plan not found')
  }
  if (fetchErr) {
    console.error('Fetch error:', fetchErr)
    throw new BadRequestException(fetchErr.message)
  }
  if (existing.nutritionist_id !== payload.nutritionist_id) {
    console.error(
      'Ownership mismatch:',
      existing.nutritionist_id,
      'vs',
      payload.nutritionist_id,
    )
    throw new BadRequestException('You are not allowed to update this diet plan')
  }

  this.logger('Updating diet plan...')
  // update
  const { data, error } = await this.supabase
    .from('diet_plan')
    .update({
      ...payload,
    })
    .eq('id', dietPlanId)
    .select()
    .single()

  this.logger('update response data:'+ data)
  this.logger('update response error:'+ error)

  if (error) {
    console.error('Update failed:', error)
    throw new BadRequestException(error.message)
  }

  // fetch patient profile from MongoDB
  const patient = await this.profileModel.findOne({ id: data.patient_id }).lean()

  const result = {
    ...data,
    patientName: patient?.name || ""
  }

  this.logger('Diet plan updated successfully:'+ result)
  return result
}


// inside AppointmentsService

async getActiveDietPlansForPatient(patientId: string) {
  this.logger("FETCHING ACTIVE DIET PLANS FOR PATIENT ID= " + patientId)

  const today = new Date().toISOString().split("T")[0] // yyyy-mm-dd

  const { data, error } = await this.supabase
    .from("diet_plan")
    .select("*")
    .eq("patient_id", patientId)
    .or(`start_date.is.null,and(start_date.lte.${today})`)
    .or(`end_date.is.null,and(end_date.gte.${today})`)
    .order("created_at", { ascending: false })

  if (error) {
    this.logger("ERROR FETCHING ACTIVE DIET PLANS " + error.message)
    throw new BadRequestException(error.message)
  }

  if (!data) return []

  const enrichedPlans: any[] = []
  for (const plan of data) {
    const nutritionist = await this.profileModel.findOne({ id: plan.nutritionist_id }).lean()
    enrichedPlans.push({
      ...plan,
      nutritionistName: nutritionist?.name || "",
    })
  }

  this.logger("TOTAL " + enrichedPlans.length + " ACTIVE DIET PLANS FOUND FOR PATIENT")
  return enrichedPlans
}




async getAppointmentsForPatient(patientId: string) {
  this.logger("FETCHING APPOINTMENTS FOR PATIENT ID=" + patientId)

  const { data: appointments, error } = await this.supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) {
    this.logger("ERROR FETCHING APPOINTMENTS " + error.message)
    throw new BadRequestException(error.message)
  }

  if (!appointments || appointments.length === 0) return []

  // get all unique doctor IDs
  const doctorIds = [...new Set(appointments.map(a => a.doctor_id))]

  // batch fetch all doctor roles at once
  const { data: users, error: userErr } = await this.supabase
    .from('users')
    .select('id, role')
    .in('id', doctorIds)

  if (userErr) {
    this.logger("ERROR FETCHING USER ROLES " + userErr.message)
    throw new BadRequestException(userErr.message)
  }

  const userMap = new Map(users.map(u => [u.id, u]))

  // fetch doctorDetails in parallel for nutritionists and doctors
  const results = await Promise.all(
    appointments.map(async row => {
      const user = userMap.get(row.doctor_id)
      let doctorDetails: any = null
      let appointmentLocation: string | undefined = undefined

      if (user?.role === 'nutritionist') {
        doctorDetails = await this.nut.findOne({ id: user.id }).lean()
      } else if (user?.role === 'doctor') {
        doctorDetails = await this.doctorProfileModel.findOne({ id: user.id }).lean()
      }

      // Get location for physical appointments based on the appointment day
      if (row.mode === 'physical' && doctorDetails?.workingHours) {
        const appointmentDate = new Date(row.date)
        const dayOfWeek = appointmentDate.toLocaleString('en-US', { weekday: 'long' })
        const workingDay = doctorDetails.workingHours.find(
          (wh: any) => wh.day.toLowerCase() === dayOfWeek.toLowerCase()
        )
        appointmentLocation = workingDay?.location || 'Location not specified'
      }

      return {
        id: row.id,
        patientId: row.patient_id,
        doctorId: row.doctor_id,
        doctorRole: user?.role,
        doctorDetails,
        date: row.date,
        time: row.time,
        status: row.status,
        type: row.type,
        notes: row.notes ?? undefined,
        report: row.report ?? undefined,
        mode: row.mode,
        // Include location for physical appointments, link for online appointments
        location: row.mode === 'physical' ? appointmentLocation : undefined,
        link: row.mode !== 'physical' ? (row.link ?? undefined) : undefined,
        dataShared: row.data_shared,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    })
  )

  this.logger("TOTAL " + results.length + " APPOINTMENTS RETURNED FOR PATIENT")
  return results
}


async getPreviousAppointmentsForPatient(
  nutritionistId: string,
  patientId: string
): Promise<AppointmentWithDietPlan[]> {
  this.logger(`FETCHING PREVIOUS APPOINTMENTS FOR NUTRITIONIST=${nutritionistId}, PATIENT=${patientId}`)

  const { data: appointments, error: appointmentError } = await this.supabase
    .from('appointments')
    .select(`
      id,
      date,
      time,
      status,
      type,
      notes,
      report,
      mode,
      data_shared,
      created_at,
      updated_at,
      diet_plan_id
    `)
    .eq('doctor_id', nutritionistId)
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .order('date', { ascending: false })

  if (appointmentError) throw new BadRequestException(appointmentError.message)

  const filteredAppointments: AppointmentWithDietPlan[] = []

  for (const appt of appointments || []) {
    if (!appt.diet_plan_id) continue

    const { data: dietPlan, error: dietError } = await this.supabase
      .from('diet_plan')
      .select(`
        id,
        daily_calories,
        protein,
        carbs,
        fat,
        deficiency,
        notes,
        calories_burned,
        exercise,
        start_date,
        end_date,
        created_at
      `)
      .eq('id', appt.diet_plan_id)
      .single()

    if (dietError || !dietPlan) continue

    filteredAppointments.push({
      ...appt,
      diet_plan: [dietPlan]
    })
  }

  this.logger(`FETCHED ${filteredAppointments.length} APPOINTMENT(s) WITH DIET PLANS FOR PATIENT=${patientId}`)

  return filteredAppointments
}








async getAvailableSlots(providerId: string, role: string, date: string) {
  this.logger(`Fetching available slots for providerId=${providerId}, role=${role}, date=${date}`)

  // 1. Fetch provider profile based on role
  let profile: any = null

  if (role === 'nutritionist') {
    this.logger(`Looking up nutritionist profile for ${providerId}`)
    profile = await this.nut.findOne({ id: providerId }).lean()
  } else if (role === 'doctor') {
    this.logger(`Looking up doctor profile for ${providerId}`)
    profile = await this.doctorProfileModel.findOne({ id: providerId }).lean()
  }

  if (!profile) {
    this.logger(`No profile found for providerId=${providerId}, role=${role}`)
    throw new BadRequestException(`Profile not found for provider ${providerId} with role ${role}`)
  }

  // 2. Fetch booked appointments for this provider on the given date
  this.logger(`Fetching appointments for providerId=${providerId} on date=${date}`)
  const { data: appointments, error } = await this.supabase
    .from('appointments')
    .select('time')
    .eq('doctor_id', providerId)
    .eq('date', date)

  if (error) {
    this.logger(`Error fetching appointments: ${error.message}`)
    throw new BadRequestException(error.message)
  }

  const bookedTimes = (appointments ?? []).map(a => a.time)
  this.logger(`Booked times on ${date}: ${bookedTimes.join(', ') || 'none'}`)

  // 3. Find working hours for the given date
  const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' }) // e.g. "Monday"
  this.logger(`Resolved day of week: ${dayOfWeek}`)

  const workingDay = profile.workingHours.find(
    (d: any) => d.day.toLowerCase() === dayOfWeek.toLowerCase()
  )

  if (!workingDay) {
    this.logger(`Provider does not work on ${dayOfWeek}`)
    return { slots: [], message: `Provider does not work on ${dayOfWeek}` }
  }

  this.logger(`Working hours: ${workingDay.start} - ${workingDay.end}, Location: ${workingDay.location || 'Not specified'}`)

  // 4. Generate 1-hour slots between start and end
  const slots: { time: string; location: string }[] = []
  const startHour = parseInt(workingDay.start.split(':')[0], 10)
  const endHour = parseInt(workingDay.end.split(':')[0], 10)

  for (let hour = startHour; hour < endHour; hour++) {
    const slot = `${hour.toString().padStart(2, '0')}:00:00`
    if (!bookedTimes.includes(slot)) {
      slots.push({
        time: slot,
        location: workingDay.location || 'Not specified'
      })
    }
  }

  this.logger(`Available slots: ${slots.map(s => s.time).join(', ') || 'none'}`)

  return {
    providerId,
    role,
    date,
    location: workingDay.location || 'Not specified',
    availableSlots: slots,
  }
}







  logger(msg:string){
   console.log("[INFO APPOINTMENT SERVICE] "+msg)
  }


}
