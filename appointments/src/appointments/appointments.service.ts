import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE } from '../supabase/supabase.module'
import { CreateAppointmentDto } from './dto/create-appointment.dto'
import { UpdateAppointmentDto } from './dto/update-appointment.dto'
import { AppointmentMode, AppointmentStatus, AppointmentTypes } from './appointment.enums'
import { InjectModel } from '@nestjs/mongoose'
import { Profile, ProfileDocument } from './schema/patient.profile.schema'
import { Model } from 'mongoose'
import { randomUUID } from 'crypto'
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
import { MedicationTakenDto } from './dto/medication-taken.dto'
import { MedicationLogsQueryDto } from './dto/medication-logs-query.dto'
import { SubmitAppointmentReviewDto } from './dto/submit-appointment-review.dto'
import { GetProviderReviewsDto } from './dto/get-provider-reviews.dto'
import { ReportProviderDto } from './dto/report-provider.dto'
import { v2 as cloudinary } from 'cloudinary'
import { ConfigService } from '@nestjs/config'
import { Readable } from 'stream'

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
  start_link?: string | null
  diet_plan_id?: string | null
  prescription_id?: string | null
  created_at: string
  updated_at: string
}

type ProviderRole = 'doctor' | 'nutritionist'

type AppointmentReviewDbRow = {
  id: string
  appointment_id: string
  patient_id: string
  provider_id: string
  provider_role: ProviderRole
  rating: number
  review_text: string
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
  id?: string
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

type MedicationAdherenceRow = {
  id: string
  patient_id: string
  prescription_id: string
  medication_id: string
  taken: boolean
  taken_at: string
  scheduled_time: string | null
  source: string | null
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
    private readonly configService: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    })
  }

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

  private getReviewBaseUrl(): string {
    return (
      process.env.REVIEW_FRONTEND_URL ||
      process.env.FRONTEND_URL ||
      'https://hygieia-frontend.vercel.app'
    )
  }

  private buildReviewLink(appointmentId: string, providerRole: ProviderRole): string {
    const base = this.getReviewBaseUrl().replace(/\/$/, '')
    return `${base}/appointments/${appointmentId}/review?providerRole=${providerRole}`
  }

  private async createNotification(userId: string, message: string, title: string) {
    const { error } = await this.supabase.from('notifications').insert([
      {
        user_id: userId,
        notification_msg: message,
        action: null,
        title,
      },
    ])

    if (error) {
      this.logger(`FAILED TO CREATE NOTIFICATION FOR USER=${userId}, ERROR=${error.message}`)
    }
  }

  private async resolveProviderRole(providerId: string): Promise<ProviderRole> {
    const { data, error } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', providerId)
      .single()

    if (error || !data?.role) {
      return 'doctor'
    }

    return data.role === 'nutritionist' ? 'nutritionist' : 'doctor'
  }

  private async resolveProviderName(providerId: string, providerRole: ProviderRole): Promise<string> {
    if (providerRole === 'nutritionist') {
      const nutritionist = await this.nut.findOne({ id: providerId }).lean()
      return nutritionist?.name || 'Nutritionist'
    }

    const doctor = await this.doctorProfileModel.findOne({ id: providerId }).lean()
    return doctor?.name || 'Doctor'
  }

  private async resolveAppointmentProvider(providerId: string): Promise<{
    providerRole: ProviderRole
    provider: any
    providerName: string
  }> {
    const providerRole = await this.resolveProviderRole(providerId)

    if (providerRole === 'nutritionist') {
      const provider = await this.nut.findOne({ id: providerId }).lean()
      return {
        providerRole,
        provider,
        providerName: provider?.name || 'Nutritionist',
      }
    }

    const provider = await this.doctorProfileModel.findOne({ id: providerId }).lean()
    return {
      providerRole,
      provider,
      providerName: provider?.name || 'Doctor',
    }
  }

  private async sendReviewRequestAfterCompletion(params: {
    appointmentId: string
    patientId: string
    providerId: string
    providerRole: ProviderRole
    appointmentDate: string
    appointmentTime: string
    appointmentMode: string
  }) {
    const {
      appointmentId,
      patientId,
      providerId,
      providerRole,
      appointmentDate,
      appointmentTime,
      appointmentMode,
    } = params

    const patient = await this.profileModel.findOne({ id: patientId }).lean()
    const providerName = await this.resolveProviderName(providerId, providerRole)

    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', patientId)
      .single()

    const reviewLink = this.buildReviewLink(appointmentId, providerRole)

    await this.createNotification(
      patientId,
      `Your appointment is completed. Please share your review for ${providerName}.`,
      'Share Appointment Review',
    )

    if (userError || !userData?.email) {
      this.logger(`SKIPPING REVIEW REQUEST EMAIL FOR APPOINTMENT=${appointmentId}, EMAIL NOT FOUND`)
      return
    }

    this.mailerClient.emit('appointment_review_request', {
      appointment_id: appointmentId,
      patient_id: patientId,
      provider_id: providerId,
      provider_role: providerRole,
      patient_email: userData.email,
      patient_name: patient?.name || 'Patient',
      provider_name: providerName,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_mode: appointmentMode,
      review_link: reviewLink,
    })
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

  private normalizePrescriptionMedications(medications: PrescriptionMedication[]): PrescriptionMedication[] {
    return (medications || []).map((medication) => ({
      ...medication,
      id: medication?.id || randomUUID(),
    }))
  }

  private parseMedicationDurationInDays(duration: string | undefined): number | null {
    const normalized = (duration || '').toString().trim().toLowerCase()
    if (!normalized) return null

    if (/^\d+$/.test(normalized)) {
      return Number(normalized)
    }

    const match = normalized.match(/(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months)/)
    if (!match) return null

    const value = Number(match[1])
    const unit = match[2]

    if (!Number.isFinite(value) || value <= 0) return null
    if (unit.startsWith('day')) return Math.ceil(value)
    if (unit.startsWith('week')) return Math.ceil(value * 7)
    if (unit.startsWith('month')) return Math.ceil(value * 30)

    return null
  }

  private addDaysToDateOnly(dateOnly: string, daysToAdd: number): string {
    const date = new Date(`${dateOnly}T00:00:00.000Z`)
    date.setUTCDate(date.getUTCDate() + daysToAdd)
    return this.getUtcDateOnly(date)
  }

  private resolvePrescriptionStartDate(row: PrescriptionRow, fallbackDate: string): string {
    if (row.start_date) return row.start_date

    const createdAt = row.created_at ? new Date(row.created_at) : null
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      return this.getUtcDateOnly(createdAt)
    }

    return fallbackDate
  }

  private isMedicationDurationCompleted(
    medication: PrescriptionMedication,
    prescriptionStartDate: string,
    todayDate: string,
  ): boolean {
    const durationDays = this.parseMedicationDurationInDays(medication.duration)
    if (durationDays === null) return false

    const medicationEndDate = this.addDaysToDateOnly(prescriptionStartDate, Math.max(0, durationDays - 1))
    return medicationEndDate < todayDate
  }

  private shouldAutoCompletePrescription(row: PrescriptionRow, todayDate: string): boolean {
    if (row.status !== 'active') return false

    if (row.end_date && row.end_date < todayDate) {
      return true
    }

    const medications = Array.isArray(row.medications) ? row.medications : []
    if (medications.length === 0) return false

    const startDate = this.resolvePrescriptionStartDate(row, todayDate)
    return medications.every((medication) => this.isMedicationDurationCompleted(medication, startDate, todayDate))
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
        const { provider, providerName } = await this.resolveAppointmentProvider(dto.doctorId)
        
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
        
        if (patient && provider && patientUser?.email && doctorUser?.email) {
        
          const meetResult = await createZoomMeeting({
            patientEmail: patientUser.email,
            nutritionistEmail: doctorUser.email,
            patientName: patient.name || 'Patient',
            nutritionistName: providerName,
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
      } catch (error:any) {
        this.logger("ERROR GENERATING REAL GOOGLE MEET LINK: " + error.message)
        // Don't throw error, just log it - appointment creation should still succeed
      }
    }
    



    // Send confirmation email to patient
    try {
      const patient = await this.profileModel.findOne({ id: dto.patientId }).lean()
      const { provider, providerName } = await this.resolveAppointmentProvider(dto.doctorId)
      
      // Fetch patient email from users table
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', dto.patientId)
        .single()
      
      if (patient && provider && userData?.email) {



        //rabbit mq - emit appointment created event for scheduling
        this.schedulerClient.emit('appointment_created', {
          appointment_id: appointmentData.id,
          patient_id: dto.patientId,
          doctor_id: dto.doctorId,
          patient_email: userData.email,
          patient_name: patient.name || 'Patient',
          doctor_name: providerName,
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
          doctor_name: providerName,
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
    } catch (error:any) {
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
  } catch (error:any) {
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
    } catch (error:any) {
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
    } catch (error:any) {
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

  if (appt.doctor_id !== nutritionistId) {
    throw new ForbiddenException('You are not authorized to complete this appointment')
  }

  if (appt.status === 'completed') {
    throw new BadRequestException('Appointment is already completed')
  }

  const tasks: Promise<any>[] = []

  if (dto.referredTestIds?.length) {
    const inserts = dto.referredTestIds.map(testId => ({
      test_id: testId,
      patient_id: appt.patient_id,
      referrer_id: nutritionistId,
    }))
    this.logger("NUTRITIONIST REFERRED TOTAL " + inserts.length + " TEST(s)")
    tasks.push(this.supabase.from('referred_tests').insert(inserts).then(r => r) as any)

    // Send in-app notification to patient about referred tests
    this.sendReferredTestNotifications(appt.patient_id, dto.referredTestIds, nutritionistId, 'nutritionist')
      .catch(err => this.logger(`FAILED TO SEND REFERRAL NOTIFICATIONS: ${err?.message}`))
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

  try {
    await this.sendReviewRequestAfterCompletion({
      appointmentId: id,
      patientId: appt.patient_id,
      providerId: nutritionistId,
      providerRole: 'nutritionist',
      appointmentDate: appt.date,
      appointmentTime: appt.time,
      appointmentMode: appt.mode,
    })
  } catch (error: any) {
    this.logger(`FAILED TO SEND REVIEW REQUEST FOR APPOINTMENT=${id}: ${error?.message || error}`)
  }

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

  if (appt.status === 'completed') {
    throw new BadRequestException('Appointment is already completed')
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

    // Send in-app notification to patient about referred tests
    this.sendReferredTestNotifications(appt.patient_id, dto.referredTestIds, doctorId, 'doctor')
      .catch(err => this.logger(`FAILED TO SEND REFERRAL NOTIFICATIONS: ${err?.message}`))
  }

  if (dto.prescription?.medications?.length) {
    const status = dto.prescription.status ?? 'active'
    const normalizedMedications = this.normalizePrescriptionMedications(dto.prescription.medications)

    const prescriptionInsert = await this.supabase
      .from('prescriptions')
      .insert({
        appointment_id: appt.id,
        patient_id: appt.patient_id,
        doctor_id: doctorId,
        medications: normalizedMedications,
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

  try {
    await this.sendReviewRequestAfterCompletion({
      appointmentId: id,
      patientId: appt.patient_id,
      providerId: doctorId,
      providerRole: 'doctor',
      appointmentDate: appt.date,
      appointmentTime: appt.time,
      appointmentMode: appt.mode,
    })
  } catch (error: any) {
    this.logger(`FAILED TO SEND REVIEW REQUEST FOR APPOINTMENT=${id}: ${error?.message || error}`)
  }

  return this.toApi(updated as DbRow)
}

async submitAppointmentReview(payload: SubmitAppointmentReviewDto) {
  const { appointmentId, patientId } = payload
  const rating = Number(payload.rating)
  const reviewText = payload.review?.trim()

  if (!reviewText) {
    throw new BadRequestException('Review text is required')
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new BadRequestException('Rating must be an integer between 1 and 5')
  }

  const { data: appointment, error: appointmentError } = await this.supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (appointmentError?.message?.includes('No rows')) {
    throw new NotFoundException('Appointment not found')
  }
  if (appointmentError) {
    throw new BadRequestException(appointmentError.message)
  }

  const appt = appointment as DbRow

  if (appt.patient_id !== patientId) {
    throw new ForbiddenException('You are not allowed to review this appointment')
  }

  if (appt.status !== 'completed') {
    throw new BadRequestException('Only completed appointments can be reviewed')
  }

  const providerId = appt.doctor_id
  const providerRole: ProviderRole = appt.diet_plan_id
    ? 'nutritionist'
    : appt.prescription_id
      ? 'doctor'
      : await this.resolveProviderRole(providerId)

  const { data: existing, error: existingError } = await this.supabase
    .from('appointment_reviews')
    .select('id')
    .eq('appointment_id', appointmentId)
    .maybeSingle()

  if (existingError) {
    throw new BadRequestException(existingError.message)
  }

  if (existing) {
    throw new BadRequestException('This appointment has already been reviewed')
  }

  const { data: createdReview, error: insertError } = await this.supabase
    .from('appointment_reviews')
    .insert({
      appointment_id: appointmentId,
      patient_id: patientId,
      provider_id: providerId,
      provider_role: providerRole,
      rating,
      review_text: reviewText,
    })
    .select('*')
    .single()

  if (insertError?.message?.toLowerCase().includes('duplicate')) {
    throw new BadRequestException('This appointment has already been reviewed')
  }
  if (insertError) {
    throw new BadRequestException(insertError.message)
  }

  const { data: providerReviews, error: listError } = await this.supabase
    .from('appointment_reviews')
    .select('rating')
    .eq('provider_id', providerId)
    .eq('provider_role', providerRole)

  if (listError) {
    throw new BadRequestException(listError.message)
  }

  const ratings = (providerReviews || []).map((r: any) => Number(r.rating)).filter((r: number) => Number.isFinite(r))
  const avgRating = ratings.length > 0 ? Number((ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length).toFixed(2)) : 0

  if (providerRole === 'nutritionist') {
    await this.nut.updateOne({ id: providerId }, { $set: { rating: avgRating } }, { upsert: false })
  } else {
    await this.doctorProfileModel.updateOne({ id: providerId }, { $set: { rating: avgRating } }, { upsert: false })
  }

  const patient = await this.profileModel.findOne({ id: patientId }).lean()
  const providerName = await this.resolveProviderName(providerId, providerRole)

  const { data: patientUser } = await this.supabase
    .from('users')
    .select('email')
    .eq('id', patientId)
    .single()

  await this.createNotification(
    patientId,
    `Thanks for your review. You rated ${providerName} ${rating}/5.`,
    'Review Submitted',
  )

  await this.createNotification(
    providerId,
    `You received a new ${rating}/5 review from a patient.`,
    'New Appointment Review',
  )

  if (patientUser?.email) {
    this.mailerClient.emit('appointment_review_submitted', {
      appointment_id: appointmentId,
      patient_id: patientId,
      provider_id: providerId,
      provider_role: providerRole,
      patient_email: patientUser.email,
      patient_name: patient?.name || 'Patient',
      provider_name: providerName,
      appointment_date: appt.date,
      appointment_time: appt.time,
      appointment_mode: appt.mode,
      rating,
      review_text: reviewText,
    })
  }

  const review = createdReview as AppointmentReviewDbRow

  return {
    success: true,
    message: 'Review submitted successfully',
    data: {
      id: review.id,
      appointmentId: review.appointment_id,
      patientId: review.patient_id,
      providerId: review.provider_id,
      providerRole: review.provider_role,
      rating: review.rating,
      review: review.review_text,
      createdAt: review.created_at,
    },
    provider: {
      id: providerId,
      role: providerRole,
      rating: avgRating,
      totalReviews: ratings.length,
    },
  }
}

async getProviderReviews(query: GetProviderReviewsDto) {
  if (!query.providerId) {
    throw new BadRequestException('providerId is required')
  }

  const limit = Number(query.limit ?? 20)
  const offset = Number(query.offset ?? 0)

  if (!Number.isFinite(limit) || limit < 1) {
    throw new BadRequestException('limit must be greater than or equal to 1')
  }

  if (!Number.isFinite(offset) || offset < 0) {
    throw new BadRequestException('offset must be greater than or equal to 0')
  }

  let dbQuery = this.supabase
    .from('appointment_reviews')
    .select('*', { count: 'exact' })
    .eq('provider_id', query.providerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (query.role) {
    dbQuery = dbQuery.eq('provider_role', query.role)
  }

  const { data, error, count } = await dbQuery

  if (error) {
    throw new BadRequestException(error.message)
  }

  const rows = (data || []) as AppointmentReviewDbRow[]

  const items = await Promise.all(
    rows.map(async (row) => {
      const patient = await this.profileModel.findOne({ id: row.patient_id }).lean()
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        patientId: row.patient_id,
        patientName: patient?.name || 'Patient',
        providerId: row.provider_id,
        providerRole: row.provider_role,
        rating: row.rating,
        review: row.review_text,
        createdAt: row.created_at,
      }
    }),
  )

  return {
    items,
    count: count ?? 0,
    limit,
    offset,
  }
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
  this.logger('FETCHING PRESCRIPTIONS FOR PATIENT ID=' + patientId)

  const { data, error } = await this.supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (error) throw new BadRequestException(error.message)
  if (!data) return []

  const prescriptions = (data as PrescriptionRow[]) || []

  const pakistanDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const prescriptionIdsToComplete = prescriptions
    .filter((row) => this.shouldAutoCompletePrescription(row, pakistanDate))
    .map((row) => row.id)

  if (prescriptionIdsToComplete.length > 0) {
    const updatedAt = new Date().toISOString()
    const { error: completionError } = await this.supabase
      .from('prescriptions')
      .update({ status: 'completed', updated_at: updatedAt })
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .in('id', prescriptionIdsToComplete)

    if (completionError) throw new BadRequestException(completionError.message)

    const completedIdSet = new Set(prescriptionIdsToComplete)
    for (const row of prescriptions) {
      if (!completedIdSet.has(row.id)) continue
      row.status = 'completed'
      row.updated_at = updatedAt
    }

    this.logger(
      `AUTO-COMPLETED ${prescriptionIdsToComplete.length} PRESCRIPTION(S) FOR PATIENT=${patientId}`,
    )
  }

  const todayPkStartUtc = new Date(`${pakistanDate}T00:00:00+05:00`).toISOString()
  const todayPkEndUtc = new Date(`${pakistanDate}T23:59:59.999+05:00`).toISOString()

  const { data: todayTakenLogs, error: todayTakenLogsError } = await this.supabase
    .from('medication_adherence_logs')
    .select('prescription_id, medication_id')
    .eq('patient_id', patientId)
    .eq('taken', true)
    .gte('taken_at', todayPkStartUtc)
    .lte('taken_at', todayPkEndUtc)

  if (todayTakenLogsError) {
    throw new BadRequestException(todayTakenLogsError.message)
  }

  const todayTakenKeys = new Set(
    ((todayTakenLogs as Array<{ prescription_id: string; medication_id: string }>) || []).map((log) =>
      `${log.prescription_id}|${(log.medication_id || '').toString().trim()}`,
    ),
  )

  this.logger(
    `ACTIVE PRESCRIPTIONS TAKEN-FLAG patient=${patientId} pakistanDate=${pakistanDate} takenTodayCount=${todayTakenKeys.size}`,
  )

  const enriched = await Promise.all(
    prescriptions.map(async (row) => {
      const doctor = await this.doctorProfileModel.findOne({ id: row.doctor_id }).lean()
      const medications = Array.isArray(row.medications) ? row.medications : []
      const medicationsWithTakenFlag = medications.map((medication) => {
        const medicationId = this.getMedicationIdentifier(medication)
        if (!medicationId) return { ...medication, taken: false }
        const takenKey = `${row.id}|${medicationId}`
        return {
          ...medication,
          taken: todayTakenKeys.has(takenKey),
        }
      })

      return {
        ...row,
        medications: medicationsWithTakenFlag,
        doctorName: doctor?.name || '',
      }
    }),
  )

  const statusOrder = { active: 0, completed: 1 }
  const sorted = enriched.sort((a: any, b: any) => {
    const left = statusOrder[(a.status as 'active' | 'completed')] ?? 99
    const right = statusOrder[(b.status as 'active' | 'completed')] ?? 99
    if (left !== right) return left - right
    const aDate = new Date(a.created_at || 0).getTime()
    const bDate = new Date(b.created_at || 0).getTime()
    return bDate - aDate
  })

  this.logger('TOTAL ' + sorted.length + ' PRESCRIPTIONS FOUND FOR PATIENT')
  return sorted
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

  if (payload.medications !== undefined) {
    updates.medications = this.normalizePrescriptionMedications(payload.medications)
  }
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

async saveMedicationTaken(payload: MedicationTakenDto) {
  this.logger(
    `SAVE MEDICATION TAKEN CALLED patient=${payload.patientId} prescription=${payload.prescriptionId} medication=${payload.medicationId}`,
  )

  if (!payload.patientId || !payload.prescriptionId || !payload.medicationId) {
    throw new BadRequestException('patientId, prescriptionId and medicationId are required')
  }

  if (payload.taken !== true) {
    throw new BadRequestException('Only taken=true is supported for medication tracking')
  }

  const medicationId = payload.medicationId.toString().trim()
  if (!medicationId) {
    throw new BadRequestException('medicationId is required')
  }

  const resolvedTakenAt = payload.takenAt ?? new Date().toISOString()
  const takenAtDate = new Date(resolvedTakenAt)
  if (Number.isNaN(takenAtDate.getTime())) {
    this.logger(
      `SAVE MEDICATION TAKEN INVALID_TIMESTAMP patient=${payload.patientId} prescription=${payload.prescriptionId} medication=${medicationId} takenAt=${resolvedTakenAt}`,
    )
    throw new BadRequestException('Invalid takenAt timestamp')
  }

  const { data: prescription, error: prescriptionError } = await this.supabase
    .from('prescriptions')
    .select('*')
    .eq('id', payload.prescriptionId)
    .eq('patient_id', payload.patientId)
    .single()

  if (prescriptionError?.message?.includes('No rows')) {
    this.logger(
      `SAVE MEDICATION TAKEN PRESCRIPTION_NOT_FOUND patient=${payload.patientId} prescription=${payload.prescriptionId}`,
    )
    throw new NotFoundException('Prescription not found for patient')
  }
  if (prescriptionError) {
    this.logger(`SAVE MEDICATION TAKEN PRESCRIPTION_QUERY_FAILED reason=${prescriptionError.message}`)
    throw new BadRequestException(prescriptionError.message)
  }

  const prescriptionRow = prescription as PrescriptionRow
  const medications = Array.isArray(prescriptionRow.medications) ? prescriptionRow.medications : []

  const medicationExists = medications.some((med: any) => {
    if (!med) return false
    const idCandidates = [med.id, med.medicationId, med.medication_id, med.name]
      .filter(Boolean)
      .map((value: any) => value.toString())
    return idCandidates.includes(medicationId)
  })

  if (!medicationExists) {
    this.logger(
      `SAVE MEDICATION TAKEN MEDICATION_NOT_FOUND patient=${payload.patientId} prescription=${payload.prescriptionId} medication=${medicationId}`,
    )
    throw new NotFoundException('Medication not found in prescription')
  }

  const dateKey = takenAtDate.toISOString().split('T')[0]

  const upsertPayload = {
    patient_id: payload.patientId,
    prescription_id: payload.prescriptionId,
    medication_id: medicationId,
    taken: payload.taken,
    taken_at: takenAtDate.toISOString(),
    scheduled_time: payload.scheduledTime ?? null,
    source: payload.source ?? 'patient-web',
    updated_at: new Date().toISOString(),
  }

  const { data: savedRow, error: insertError } = await this.supabase
    .from('medication_adherence_logs')
    .upsert(upsertPayload, {
      onConflict: 'patient_id,prescription_id,medication_id,taken_date',
    })
    .select('*')
    .single()

  if (insertError) {
    this.logger(
      `SAVE MEDICATION TAKEN UPSERT_FAILED patient=${payload.patientId} prescription=${payload.prescriptionId} medication=${medicationId} reason=${insertError.message}`,
    )
    throw new BadRequestException(insertError.message)
  }
  const saved = savedRow as MedicationAdherenceRow

  try {
    await this.refreshPatientAdherenceMetrics(payload.patientId)
  } catch (error: any) {
    this.logger(`FAILED TO REFRESH ADHERENCE METRICS FOR PATIENT=${payload.patientId}: ${error?.message || error}`)
  }

  return {
    success: true,
    message: 'Medication status saved',
    data: {
      id: saved.id,
      patientId: saved.patient_id,
      prescriptionId: saved.prescription_id,
      medicationId: saved.medication_id,
      taken: saved.taken,
      takenAt: saved.taken_at,
      scheduledTime: saved.scheduled_time,
      source: saved.source,
      date: dateKey,
    },
  }
}

private async refreshPatientAdherenceMetrics(patientId: string) {
  const today = this.getUtcDateOnly(new Date())

  const { data: allPrescriptions, error: prescriptionsError } = await this.supabase
    .from('prescriptions')
    .select('id, patient_id, medications, start_date, end_date, status')
    .eq('patient_id', patientId)

  if (prescriptionsError) throw new BadRequestException(prescriptionsError.message)

  const activePrescriptions = ((allPrescriptions as PrescriptionRow[]) || []).filter((row) => {
    if (row.status !== 'active') return false
    const startsOk = !row.start_date || row.start_date <= today
    const endsOk = !row.end_date || row.end_date >= today
    return startsOk && endsOk
  })

  const prescriptionIds = activePrescriptions.map((item) => item.id)

  // If no active prescriptions and no active diet plan, skip update
  // to preserve existing adherence score from the last active period
  const { data: dietPlans, error: dietPlansError } = await this.supabase
    .from('diet_plan')
    .select('start_date, end_date')
    .eq('patient_id', patientId)

  if (dietPlansError) throw new BadRequestException(dietPlansError.message)

  const hasActiveDietPlan = (dietPlans || []).some((plan: any) => {
    const startsOk = !plan.start_date || plan.start_date <= today
    const endsOk = !plan.end_date || plan.end_date >= today
    return startsOk && endsOk
  })

  if (prescriptionIds.length === 0 && !hasActiveDietPlan) {
    return // preserve existing adherence values
  }

  let medicationLogs: MedicationAdherenceRow[] = []
  if (prescriptionIds.length > 0) {
    const { data: logs, error: logsError } = await this.supabase
      .from('medication_adherence_logs')
      .select('id, patient_id, prescription_id, medication_id, taken, taken_at, scheduled_time, source, created_at, updated_at')
      .eq('patient_id', patientId)
      .in('prescription_id', prescriptionIds)

    if (logsError) throw new BadRequestException(logsError.message)
    medicationLogs = (logs as MedicationAdherenceRow[]) || []
  }

  const stats = this.calculateMedicationStatsForPatient(activePrescriptions, medicationLogs, today, hasActiveDietPlan)

  await this.profileModel.findOneAndUpdate(
    { id: patientId },
    {
      $set: {
        healthscore: Math.round(stats.adherence),
        adherence: stats.adherence.toString(),
        doses_taken: stats.dosesTaken.toString(),
        missed_doses: stats.missedDoses.toString(),
      },
    },
    { new: true, upsert: true },
  )
}

private calculateMedicationStatsForPatient(
  prescriptions: PrescriptionRow[],
  medicationLogs: MedicationAdherenceRow[],
  today: string,
  hasActiveDietPlan: boolean,
): { adherence: number; dosesTaken: number; missedDoses: number; expectedDoses: number } {
  const expectedDoseKeys = this.buildExpectedDoseKeysForPatient(prescriptions, today)
  const expectedDoses = expectedDoseKeys.size

  const takenByExpectedKey = new Map<string, boolean>()

  for (const log of medicationLogs) {
    if (!this.isLogOnOrBeforeDate(log.taken_at, today)) continue

    const logDate = this.getUtcDateOnly(new Date(log.taken_at))
    const logMedicationId = (log.medication_id || '').toString().trim()
    const expectedKey = `${log.prescription_id}|${logMedicationId}|${logDate}`

    if (!expectedDoseKeys.has(expectedKey)) continue

    const alreadyTaken = takenByExpectedKey.get(expectedKey) || false
    takenByExpectedKey.set(expectedKey, alreadyTaken || !!log.taken)
  }

  let dosesTaken = 0
  let missedDoses = 0

  for (const expectedKey of expectedDoseKeys) {
    if (takenByExpectedKey.get(expectedKey)) {
      dosesTaken += 1
    } else {
      missedDoses += 1
    }
  }

  const adherenceRaw =
    expectedDoses > 0
      ? (dosesTaken / expectedDoses) * 100
      : hasActiveDietPlan
        ? 100
        : 0

  const adherence = Math.max(0, Math.min(100, Number(adherenceRaw.toFixed(2))))

  return {
    adherence,
    dosesTaken,
    missedDoses,
    expectedDoses,
  }
}

private buildExpectedDoseKeysForPatient(prescriptions: PrescriptionRow[], today: string): Set<string> {
  const expectedDoseKeys = new Set<string>()

  for (const prescription of prescriptions) {
    const medications = Array.isArray(prescription.medications) ? prescription.medications : []
    if (medications.length === 0) continue

    const startDate = prescription.start_date || today
    const endDate = prescription.end_date && prescription.end_date < today ? prescription.end_date : today
    if (endDate < startDate) continue

    const dates = this.listDatesInclusive(startDate, endDate)

    for (const date of dates) {
      for (const medication of medications) {
        const medicationId = this.getMedicationIdentifier(medication)
        if (!medicationId) continue
        expectedDoseKeys.add(`${prescription.id}|${medicationId}|${date}`)
      }
    }
  }

  return expectedDoseKeys
}

private getMedicationIdentifier(medication: PrescriptionMedication): string {
  const medAny = medication as any
  return (medAny?.id || medAny?.medicationId || medAny?.medication_id || medAny?.name || '').toString().trim()
}

private listDatesInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)

  while (cursor.getTime() <= end.getTime()) {
    dates.push(this.getUtcDateOnly(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

private isLogOnOrBeforeDate(takenAt: string, dateOnly: string): boolean {
  if (!takenAt) return false
  const logDate = this.getUtcDateOnly(new Date(takenAt))
  return logDate <= dateOnly
}

private getUtcDateOnly(date: Date): string {
  return date.toISOString().split('T')[0]
}

async getMedicationLogs(query: MedicationLogsQueryDto) {
  this.logger(`GET MEDICATION LOGS CALLED FOR PATIENT=${query.patientId}`)

  if (!query.patientId) {
    throw new BadRequestException('patientId is required')
  }

  let dbQuery = this.supabase
    .from('medication_adherence_logs')
    .select('*')
    .eq('patient_id', query.patientId)
    .order('taken_at', { ascending: false })

  if (query.from) {
    dbQuery = dbQuery.gte('taken_at', `${query.from}T00:00:00.000Z`)
  }

  if (query.to) {
    const toDate = new Date(`${query.to}T00:00:00.000Z`)
    toDate.setUTCDate(toDate.getUTCDate() + 1)
    dbQuery = dbQuery.lt('taken_at', toDate.toISOString())
  }

  const { data, error } = await dbQuery

  if (error) throw new BadRequestException(error.message)

  const logs = ((data as MedicationAdherenceRow[]) || []).map((row) => ({
    id: row.id,
    patientId: row.patient_id,
    prescriptionId: row.prescription_id,
    medicationId: row.medication_id,
    taken: row.taken,
    takenAt: row.taken_at,
    scheduledTime: row.scheduled_time,
    date: row.taken_at ? row.taken_at.split('T')[0] : null,
    source: row.source,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  return {
    success: true,
    data: logs,
  }
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







  // ──────────────────────────────────────────────────────────────────────────
  //  REPORT PROVIDER (Doctor / Nutritionist)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Upload a single base64 image to Cloudinary.
   * Returns the secure_url on success.
   */
  private async uploadBase64ToCloudinary(base64: string, index: number): Promise<string> {
    // Strip data-URI prefix if present
    const raw = base64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(raw, 'base64')

    return new Promise<string>((resolve, reject) => {
      const publicId = `report_${Date.now()}_${index}`
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'provider_reports',
          resource_type: 'image',
          public_id: publicId,
        },
        (error, result) => {
          if (error) {
            this.logger(`Cloudinary upload failed for image ${index}: ${error.message}`)
            reject(error)
          } else {
            this.logger(`Cloudinary upload success for image ${index}: ${result?.secure_url}`)
            resolve(result!.secure_url)
          }
        },
      )
      const readable = new Readable()
      readable.push(buffer)
      readable.push(null)
      readable.pipe(stream)
    })
  }

  async reportProvider(dto: ReportProviderDto) {
    this.logger(`REPORT PROVIDER called by patient=${dto.patientId} against provider=${dto.reportedProviderId}`)

    // 1. Verify the caller is a patient
    const { data: caller, error: callerErr } = await this.supabase
      .from('users')
      .select('id, email, role')
      .eq('id', dto.patientId)
      .single()

    if (callerErr || !caller) {
      throw new BadRequestException('Patient not found')
    }
    if (caller.role !== 'patient') {
      throw new ForbiddenException('Only patients can report a provider')
    }

    // 2. Verify the provider exists with correct role
    const { data: provider, error: providerErr } = await this.supabase
      .from('users')
      .select('id, role')
      .eq('id', dto.reportedProviderId)
      .single()

    if (providerErr || !provider) {
      throw new BadRequestException('Provider not found')
    }
    if (provider.role !== dto.reportedProviderRole) {
      throw new BadRequestException(
        `Provider role mismatch: expected ${dto.reportedProviderRole}, found ${provider.role}`,
      )
    }

    // 3. Upload images to Cloudinary (if provided, max 3)
    let evidenceUrls: string[] = []
    if (dto.images && dto.images.length > 0) {
      if (dto.images.length > 3) {
        throw new BadRequestException('Maximum 3 images allowed as evidence')
      }
      this.logger(`Uploading ${dto.images.length} evidence images to Cloudinary`)
      evidenceUrls = await Promise.all(
        dto.images.map((img, i) => this.uploadBase64ToCloudinary(img, i)),
      )
      this.logger(`All evidence images uploaded successfully`)
    }

    // 4. Insert report into Supabase
    const { data: report, error: insertErr } = await this.supabase
      .from('provider_reports')
      .insert({
        patient_id: dto.patientId,
        reported_provider_id: dto.reportedProviderId,
        reported_provider_role: dto.reportedProviderRole,
        reason: dto.reason,
        description: dto.description || null,
        evidence_urls: evidenceUrls,
        status: 'pending',
        warning_issued: false,
      })
      .select()
      .single()

    if (insertErr) {
      this.logger(`Failed to insert provider report: ${insertErr.message}`)
      throw new BadRequestException('Failed to submit report: ' + insertErr.message)
    }

    this.logger(`Provider report created with id=${report.id}`)

    // 5. Get patient name for the email
    const patient = await this.profileModel.findOne({ id: dto.patientId }).lean()

    // 6. Emit event to mailer service for patient acknowledgement email
    this.mailerClient.emit('provider_report_submitted', {
      patient_email: caller.email,
      patient_name: patient?.name || 'Patient',
      reported_provider_role: dto.reportedProviderRole,
      report_id: report.id,
    })
    this.logger(`Emitted provider_report_submitted event for patient=${caller.email}`)

    return {
      success: true,
      message: 'Report submitted successfully. We will investigate this matter.',
      reportId: report.id,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  REFERRED TESTS — Notifications + Patient Endpoints
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Fire-and-forget: create in-app notifications for each referred test.
   */
  private async sendReferredTestNotifications(
    patientId: string,
    testIds: string[],
    referrerId: string,
    referrerRole: 'doctor' | 'nutritionist',
  ) {
    // Resolve referrer name
    const referrerName = await this.resolveProviderName(referrerId, referrerRole)
    const roleLabel = referrerRole === 'nutritionist' ? 'Nutritionist' : 'Dr.'

    // Fetch test names in bulk
    const { data: tests } = await this.supabase
      .from('lab_tests')
      .select('id, name')
      .in('id', testIds)

    const testMap = new Map((tests || []).map(t => [t.id, t.name]))

    // Create one notification per referred test
    const notifications = testIds.map(testId => ({
      user_id: patientId,
      title: '🔬 Lab Test Referred',
      notification_msg: `${roleLabel} ${referrerName} has referred you for "${testMap.get(testId) || 'a lab test'}". You can book this test in the app.`,
      action: null,
    }))

    const { error } = await this.supabase.from('notifications').insert(notifications)
    if (error) {
      this.logger(`FAILED TO INSERT REFERRAL NOTIFICATIONS: ${error.message}`)
    } else {
      this.logger(`SENT ${notifications.length} REFERRAL NOTIFICATION(s) TO PATIENT=${patientId}`)
    }
  }

  /**
   * Get all referred tests for a patient, joined with lab test details.
   */
  async getReferredTestsForPatient(patientId: string) {
    this.logger(`GET REFERRED TESTS FOR PATIENT=${patientId}`)

    const { data: referrals, error } = await this.supabase
      .from('referred_tests')
      .select('id, test_id, referrer_id, dismissed, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) throw new BadRequestException('Failed to fetch referred tests: ' + error.message)
    if (!referrals || referrals.length === 0) return []

    // Fetch lab test details for all referred test IDs
    const testIds = [...new Set(referrals.map(r => r.test_id))]
    const referrerIds = [...new Set(referrals.map(r => r.referrer_id))]

    const [testsRes, referrersRes] = await Promise.all([
      this.supabase
        .from('lab_tests')
        .select('id, name, description, category, price, duration, preparation_instructions, record_type')
        .in('id', testIds),
      this.supabase
        .from('users')
        .select('id, role')
        .in('id', referrerIds),
    ])

    const testMap = new Map((testsRes.data || []).map(t => [t.id, t]))
    const referrerRoles = new Map((referrersRes.data || []).map(r => [r.id, r.role as ProviderRole]))

    // Resolve referrer names in parallel
    const namePromises = referrerIds.map(async rid => {
      const role = referrerRoles.get(rid) || 'doctor'
      const name = await this.resolveProviderName(rid, role)
      return { id: rid, name, role }
    })
    const referrerInfos = await Promise.all(namePromises)
    const referrerMap = new Map(referrerInfos.map(r => [r.id, r]))

    // Check which tests are already booked by matching test_id + patient_id in booked_lab_tests
    const { data: bookedTests } = await this.supabase
      .from('booked_lab_tests')
      .select('test_id, status')
      .eq('patient_id', patientId)
      .in('test_id', testIds)

    const bookedMap = new Map((bookedTests || []).map(b => [b.test_id, b.status]))

    return referrals.map(r => {
      const test = testMap.get(r.test_id)
      const referrer = referrerMap.get(r.referrer_id)
      const bookedStatus = bookedMap.get(r.test_id)

      let status: string = 'pending'
      if (r.dismissed) status = 'dismissed'
      else if (bookedStatus) status = bookedStatus // 'pending', 'completed', etc.

      return {
        id: r.id,
        testId: r.test_id,
        test: test || null,
        referrer: referrer ? { name: referrer.name, role: referrer.role } : null,
        status,
        dismissed: r.dismissed,
        createdAt: r.created_at,
      }
    })
  }

  /**
   * Dismiss a referred test (patient chose not to book).
   */
  async dismissReferredTest(referralId: string, patientId: string) {
    this.logger(`DISMISS REFERRED TEST=${referralId} BY PATIENT=${patientId}`)

    // Verify ownership
    const { data: referral, error: fetchErr } = await this.supabase
      .from('referred_tests')
      .select('id, patient_id, dismissed')
      .eq('id', referralId)
      .single()

    if (fetchErr || !referral) throw new BadRequestException('Referred test not found')
    if (referral.patient_id !== patientId) throw new ForbiddenException('Not authorized')
    if (referral.dismissed) throw new BadRequestException('Already dismissed')

    const { error: updateErr } = await this.supabase
      .from('referred_tests')
      .update({ dismissed: true })
      .eq('id', referralId)

    if (updateErr) throw new BadRequestException('Failed to dismiss: ' + updateErr.message)

    return { success: true, message: 'Referred test dismissed successfully' }
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  FOLLOW-UP APPOINTMENT REQUESTS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Provider requests a follow-up appointment with a patient.
   */
  async requestFollowUp(dto: {
    patientId: string
    providerId: string
    providerRole: 'doctor' | 'nutritionist'
    reason?: string
    suggestedDate?: string
  }) {
    this.logger(`FOLLOW-UP REQUEST BY PROVIDER=${dto.providerId} FOR PATIENT=${dto.patientId}`)

    const { data: request, error } = await this.supabase
      .from('follow_up_requests')
      .insert({
        patient_id: dto.patientId,
        provider_id: dto.providerId,
        provider_role: dto.providerRole,
        reason: dto.reason || null,
        suggested_date: dto.suggestedDate || null,
      })
      .select('id')
      .single()

    if (error) throw new BadRequestException('Failed to create follow-up request: ' + error.message)

    // Fire-and-forget notification to patient
    this.resolveProviderName(dto.providerId, dto.providerRole).then((providerName) => {
      const roleLabel = dto.providerRole === 'nutritionist' ? 'Nutritionist' : 'Dr.'
      const notificationMsg = `${roleLabel} ${providerName} has requested a follow-up appointment with you.`
      
      this.supabase.from('notifications').insert({
        user_id: dto.patientId,
        title: '📅 Follow-up Requested',
        notification_msg: notificationMsg,
      }).then(({ error: notifErr }) => {
        if (notifErr) this.logger(`FAILED TO SEND FOLLOW-UP NOTIFICATION: ${notifErr.message}`)
        else this.logger(`SENT FOLLOW-UP NOTIFICATION TO PATIENT=${dto.patientId}`)
      })
    })

    return {
      success: true,
      message: 'Follow-up request sent to patient',
      requestId: request.id,
    }
  }

  /**
   * Patient gets their pending follow-up requests.
   */
  async getFollowUpRequestsForPatient(patientId: string) {
    this.logger(`GET FOLLOW-UP REQUESTS FOR PATIENT=${patientId}`)

    const { data: requests, error } = await this.supabase
      .from('follow_up_requests')
      .select('id, provider_id, provider_role, reason, suggested_date, status, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) throw new BadRequestException('Failed to fetch follow-up requests: ' + error.message)
    if (!requests || requests.length === 0) return []

    // Enhance with provider names
    const providerPromises = requests.map(async (req) => {
      const name = await this.resolveProviderName(req.provider_id, req.provider_role as 'doctor' | 'nutritionist')
      return {
        ...req,
        provider: { id: req.provider_id, name, role: req.provider_role },
      }
    })

    return await Promise.all(providerPromises)
  }

  /**
   * Patient dismisses a follow-up request.
   */
  async dismissFollowUpRequest(requestId: string, patientId: string) {
    this.logger(`DISMISS FOLLOW-UP REQUEST=${requestId} BY PATIENT=${patientId}`)

    const { data: request, error: fetchErr } = await this.supabase
      .from('follow_up_requests')
      .select('id, patient_id, status')
      .eq('id', requestId)
      .single()

    if (fetchErr || !request) throw new BadRequestException('Follow-up request not found')
    if (request.patient_id !== patientId) throw new ForbiddenException('Not authorized')
    if (request.status !== 'pending') throw new BadRequestException(`Request is already ${request.status}`)

    const { error: updateErr } = await this.supabase
      .from('follow_up_requests')
      .update({ status: 'dismissed' })
      .eq('id', requestId)

    if (updateErr) throw new BadRequestException('Failed to dismiss: ' + updateErr.message)

    return { success: true, message: 'Follow-up request dismissed' }
  }

  logger(msg:string){
   console.log("[INFO APPOINTMENT SERVICE] "+msg)
  }


}
