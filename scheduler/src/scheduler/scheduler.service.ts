import { Inject, Injectable, Logger } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { AppointmentDto } from 'src/dto/appointment.dto'
import { LabBookingConfirmationDto } from 'src/dto/lab-booking-confirmation.dto'
import { AppointmentCancellationDto } from 'src/dto/appointment-cancellation.dto'
import { ClientProxy } from '@nestjs/microservices/client/client-proxy'
import { Cron } from '@nestjs/schedule'
import { firstValueFrom } from 'rxjs'

// Format date as "25 Nov 2025" format
function formatDateForNotification(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  let date: Date
  
  // Handle different date formats
  if (dateStr.includes('/')) {
    // Format: DD/MM/YYYY
    const [day, month, year] = dateStr.split('/')
    date = new Date(`${year}-${month}-${day}`)
  } else {
    // Format: YYYY-MM-DD or ISO string
    date = new Date(dateStr.split('T')[0])
  }
  
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// Map reason codes to display labels
const REASON_LABELS: Record<string, string> = {
  'emergency': 'Personal Emergency',
  'scheduling': 'Scheduling Conflict',
  'patient-request': 'Patient Requested',
  'unavailable': 'Unavailable at Scheduled Time',
  'other': 'Other',
}

type PrescriptionMedicationRecord = {
  id?: string
  medicationId?: string
  medication_id?: string
  name?: string
}

type PrescriptionRecord = {
  id: string
  patient_id: string
  medications: PrescriptionMedicationRecord[]
  start_date: string | null
  end_date: string | null
  status: string
}

type DietPlanRecord = {
  patient_id: string
  start_date: string | null
  end_date: string | null
}

type MedicationAdherenceLogRecord = {
  prescription_id: string
  medication_id: string
  taken: boolean
  taken_at: string
}

type MedicationStats = {
  expectedDoses: number
  dosesTaken: number
  missedDoses: number
  adherencePercent: number
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name)
  private readonly supabase

  constructor(
    @InjectQueue('appointment-schedules') private appointmentQueue: Queue,
    @InjectQueue('lab-schedules') private labQueue: Queue,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }

  @Cron('*/10 * * * *', {
    name: 'patient-adherence-sync',
    timeZone: 'UTC',
  })
  async syncPatientAdherenceMetrics() {
    this.logger.log('Starting 10-minute patient adherence sync...')

    const today = this.getUtcDateOnly(new Date())

    const { data: allPrescriptions, error: prescriptionsError } = await this.supabase
      .from('prescriptions')
      .select('id, patient_id, medications, start_date, end_date, status')

    if (prescriptionsError) {
      this.logger.error(`Failed to fetch prescriptions: ${prescriptionsError.message}`)
      return
    }

    const { data: allDietPlans, error: dietPlansError } = await this.supabase
      .from('diet_plan')
      .select('patient_id, start_date, end_date')

    if (dietPlansError) {
      this.logger.error(`Failed to fetch diet plans: ${dietPlansError.message}`)
      return
    }

    const prescriptions = (allPrescriptions || []) as PrescriptionRecord[]
    const dietPlans = (allDietPlans || []) as DietPlanRecord[]

    const patientIds = new Set<string>()

    for (const row of prescriptions) {
      if (row?.patient_id) patientIds.add(row.patient_id)
    }

    for (const plan of dietPlans) {
      if (plan?.patient_id) patientIds.add(plan.patient_id)
    }

    if (patientIds.size === 0) {
      this.logger.log('No patients found with assigned prescriptions or diet plans')
      return
    }

    let updatedPatients = 0

    for (const patientId of patientIds) {
      try {
        const patientPrescriptions = prescriptions.filter(
          (row) => row.patient_id === patientId && this.isRangeActiveOnDate(row.start_date, row.end_date, today),
        )

        const prescriptionIds = patientPrescriptions.map((item) => item.id)
        const activeDietPlanAssigned = dietPlans.some(
          (plan) => plan.patient_id === patientId && this.isRangeActiveOnDate(plan.start_date, plan.end_date, today),
        )

        // If no active prescriptions and no active diet plan, skip this patient
        // to preserve their existing adherence score from the last active period
        if (prescriptionIds.length === 0 && !activeDietPlanAssigned) {
          this.logger.debug(
            `Skipping patient ${patientId}: no active prescriptions or diet plans. Adherence preserved.`,
          )
          continue
        }

        let medicationLogs: MedicationAdherenceLogRecord[] = []

        if (prescriptionIds.length > 0) {
          const { data: logs, error: logsError } = await this.supabase
            .from('medication_adherence_logs')
            .select('prescription_id, medication_id, taken, taken_at')
            .eq('patient_id', patientId)
            .in('prescription_id', prescriptionIds)

          if (logsError) {
            this.logger.error(`Failed to fetch medication logs for patient ${patientId}: ${logsError.message}`)
            continue
          }

          medicationLogs = (logs || []) as MedicationAdherenceLogRecord[]
        }

        const stats = this.calculateMedicationStats(patientPrescriptions, medicationLogs, today, activeDietPlanAssigned)

        await this.updatePatientProfileMetrics(patientId, stats)
        updatedPatients += 1
      } catch (error: any) {
        this.logger.error(`Failed adherence update for patient ${patientId}: ${error?.message || error}`)
      }
    }

    this.logger.log(`Completed adherence sync. Updated ${updatedPatients} patient profile(s).`)
  }




async removeScheduledJobs(appointmentId: string, queueType: 'appointment' | 'lab') {
  try {
    const queue = queueType === 'appointment' ? this.appointmentQueue : this.labQueue
    
    const jobs = await queue.getJobs(['delayed', 'waiting'])
    const jobsToRemove = jobs.filter(job => job.data.appointment_id === appointmentId)
    
    for (const job of jobsToRemove) {
      await job.remove()
      this.logger.log(`Removed job ${job.id} for ${queueType} ${appointmentId}`)
    }
    
    return jobsToRemove.length
  } catch (error) {
    this.logger.error(`Failed to remove scheduled jobs for ${appointmentId}`, error)
    throw error
  }
}

async handleAppointmentReschedule(data: AppointmentDto) {
  const appointmentId = data.appointment_id
  
  // Remove all existing scheduled reminders for this appointment
  const removedCount = await this.removeScheduledJobs(appointmentId, 'appointment')
  this.logger.log(`Removed ${removedCount} scheduled jobs for rescheduled appointment ${appointmentId}`)
  
  // Schedule new reminders with updated time
  await this.handleAppointment(data)
  
  // Send reschedule notifications
  const { patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time } = data
  await this.createNotification(
    patient_id,
    `Your appointment with ${doctor_name} has been rescheduled to ${formatDateForNotification(appointment_date)} at ${appointment_time}`,
    'Appointment Rescheduled'
  )
  await this.createNotification(
    doctor_id,
    `Appointment with ${patient_name} has been rescheduled to ${formatDateForNotification(appointment_date)} at ${appointment_time}`,
    'Appointment Rescheduled'
  )
}

async handleAppointment(data:AppointmentDto) {
  const { patient_id, doctor_id, patient_name, doctor_name, appointment_date, appointment_time } = data

  // ✅ Combine and treat as UTC
  console.log('Appointment Data:', data)
    const appointmentDateTime = new Date(`${appointment_date.split('T')[0]}T${appointment_time}Z`)
    console.log('Appointment DateTime (UTC):', appointmentDateTime.toISOString())

    const now =  new Date(
  Date.now() + (5 * 60 * 60 * 1000) // add +5 hours (karachi time)
)
    const oneDayBefore = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000)
    const thirtyMinBefore = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000)

    console.log('30-min Reminder (UTC):', thirtyMinBefore.toISOString())
    console.log('1-day Reminder (UTC):', oneDayBefore.toISOString())
    const delayForOneDay = oneDayBefore.getTime() - now.getTime()
    const delayForThirtyMin = thirtyMinBefore.getTime() - now.getTime()

    console.log('1-day reminder with delay:', delayForOneDay)
    console.log('30-min reminder with delay:', delayForThirtyMin)


    if (delayForOneDay > 0) {
      await this.appointmentQueue.add('oneDayReminder', data, { delay: delayForOneDay })
    }

    if (delayForThirtyMin > 0) {
      console.log('Scheduling 30-min reminder with delay:', delayForThirtyMin)
      await this.appointmentQueue.add('thirtyMinReminder', data, { delay: delayForThirtyMin })
    }




  await this.createNotification(patient_id, `Your appointment with ${doctor_name} is booked for ${formatDateForNotification(appointment_date)} at ${appointment_time}`,'New Appointment Booked' )
  await this.createNotification(doctor_id, `New appointment scheduled with ${patient_name} on ${formatDateForNotification(appointment_date)} at ${appointment_time}`,'New Appointment Booked' )
}


async handleLabBookingReschedule(data: LabBookingConfirmationDto) {
  const bookingId = data.booking_id
  
  // Remove all existing scheduled reminders for this lab booking
  const removedCount = await this.removeScheduledJobs(bookingId, 'lab')
  this.logger.log(`Removed ${removedCount} scheduled jobs for rescheduled lab booking ${bookingId}`)
  
  // Schedule new reminders with updated time
  await this.handleLabBooking(data)
  
  // Send reschedule notifications
  const { patient_id, technician_id, patient_name, scheduled_date, scheduled_time, test_name, location } = data
  await this.createNotification(
    patient_id,
    `Your Lab test: ${test_name} has been rescheduled to ${formatDateForNotification(scheduled_date)} at ${scheduled_time}. Location: ${location}`,
    'Lab Test Rescheduled'
  )
  await this.createNotification(
    technician_id,
    `Lab Test: ${test_name} with ${patient_name} has been rescheduled to ${formatDateForNotification(scheduled_date)} at ${scheduled_time}`,
    'Lab Test Rescheduled'
  )
}

async handleLabBooking(data:LabBookingConfirmationDto) {
  const { patient_id,  patient_name, technician_id, location,scheduled_time,scheduled_date,patient_email,test_name} = data

 const [day, month, year] = scheduled_date.split('/')

const isoDate = `${year}-${month}-${day}`

const appointmentDateTime = new Date(`${isoDate}T${scheduled_time}:00Z`)

console.log('lab DateTime (UTC):', appointmentDateTime.toISOString())

    const now =  new Date(
  Date.now() + (5 * 60 * 60 * 1000) // add +5 hours (karachi time)
)
    const oneDayBefore = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000)
    const thirtyMinBefore = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000)

    console.log('30-min Reminder (UTC):', thirtyMinBefore.toISOString())
    console.log('1-day Reminder (UTC):', oneDayBefore.toISOString())
    const delayForOneDay = oneDayBefore.getTime() - now.getTime()
    const delayForThirtyMin = thirtyMinBefore.getTime() - now.getTime()

    console.log('1-day reminder with delay:', delayForOneDay)
    console.log('30-min reminder with delay:', delayForThirtyMin)


    if (delayForOneDay > 0) {
      await this.labQueue.add('oneDayReminder', data, { delay: delayForOneDay })
    }

    if (delayForThirtyMin > 0) {
      console.log('Scheduling 30-min reminder with delay:', delayForThirtyMin)
      await this.labQueue.add('thirtyMinReminder', data, { delay: delayForThirtyMin })
    }




  await this.createNotification(patient_id, `Your Lab test: ${test_name} booked for ${formatDateForNotification(scheduled_date)} at ${scheduled_time}  Location: ${location}`,'New Lab Test Booked' )
  await this.createNotification(technician_id, `New Lab Test: ${test_name} scheduled with ${patient_name} on ${formatDateForNotification(scheduled_date)} at ${scheduled_time}`,'New Lab Test Booked' )
}


async handleAppointmentCancellation(data: AppointmentCancellationDto) {
  const { 
    appointment_id, 
    patient_id, 
    doctor_id, 
    patient_name, 
    doctor_name, 
    appointment_date, 
    appointment_time,
    cancellation_reason,
    cancellation_notes 
  } = data

  this.logger.log(`Handling appointment cancellation for ${appointment_id}`)

  // Remove any scheduled reminders for this appointment
  const removedCount = await this.removeScheduledJobs(appointment_id, 'appointment')
  this.logger.log(`Removed ${removedCount} scheduled reminder jobs for cancelled appointment ${appointment_id}`)

  // Get display label for reason
  const reasonDisplay = cancellation_reason ? (REASON_LABELS[cancellation_reason] || cancellation_reason) : 'Not specified'
  const notesText = cancellation_notes ? ` Notes: ${cancellation_notes}` : ''

  // Send notification to patient
  await this.createNotification(
    patient_id,
    `Your appointment with ${doctor_name} scheduled for ${formatDateForNotification(appointment_date)} at ${appointment_time} has been cancelled. Reason: ${reasonDisplay}.${notesText}`,
    'Appointment Cancelled'
  )

  // Send notification to doctor/nutritionist
  await this.createNotification(
    doctor_id,
    `Appointment with ${patient_name} scheduled for ${formatDateForNotification(appointment_date)} at ${appointment_time} has been cancelled. Reason: ${reasonDisplay}.${notesText}`,
    'Appointment Cancelled'
  )

  this.logger.log(`Cancellation notifications sent for appointment ${appointment_id}`)
}

  private async createNotification(userId: string, message: string,title?: string) {
    const { error } = await this.supabase.from('notifications').insert([
      {
        user_id: userId,
        notification_msg: message,
        action: null,
        title: title || 'Appointment Reminder',

      },
    ])

    if (error) {
      this.logger.error('Failed to insert notification', error)
    } else {
      this.logger.log(`Notification inserted for user: ${userId}`)
    }
  }

  private calculateMedicationStats(
    prescriptions: PrescriptionRecord[],
    medicationLogs: MedicationAdherenceLogRecord[],
    today: string,
    activeDietPlanAssigned: boolean,
  ): MedicationStats {
    const expectedDoseKeys = this.buildExpectedDoseKeys(prescriptions, today)
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

    const adherencePercentRaw =
      expectedDoses > 0
        ? (dosesTaken / expectedDoses) * 100
        : activeDietPlanAssigned
          ? 100
          : 0

    const adherencePercent = Math.max(0, Math.min(100, Number(adherencePercentRaw.toFixed(2))))

    return {
      expectedDoses,
      dosesTaken,
      missedDoses,
      adherencePercent,
    }
  }

  private buildExpectedDoseKeys(prescriptions: PrescriptionRecord[], today: string): Set<string> {
    const expectedDoseKeys = new Set<string>()

    for (const prescription of prescriptions) {
      const medications = Array.isArray(prescription.medications) ? prescription.medications : []
      if (medications.length === 0) continue

      const startDate = prescription.start_date || today
      const effectiveEndDate = this.minDate(prescription.end_date || today, today)

      if (effectiveEndDate < startDate) continue

      const days = this.daysBetweenInclusive(startDate, effectiveEndDate)
      if (days <= 0) continue

      const dates = this.listDatesInclusive(startDate, effectiveEndDate)

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

  private getMedicationIdentifier(medication: PrescriptionMedicationRecord): string {
    return (
      medication?.id || medication?.medicationId || medication?.medication_id || medication?.name || ''
    )
      .toString()
      .trim()
  }

  private isLogOnOrBeforeDate(takenAt: string, dateOnly: string): boolean {
    if (!takenAt) return false
    const logDate = this.getUtcDateOnly(new Date(takenAt))
    return logDate <= dateOnly
  }

  private isRangeActiveOnDate(startDate: string | null, endDate: string | null, date: string): boolean {
    const start = startDate || date
    const end = endDate || date
    return start <= date && end >= date
  }

  private minDate(firstDate: string, secondDate: string): string {
    return firstDate <= secondDate ? firstDate : secondDate
  }

  private daysBetweenInclusive(startDate: string, endDate: string): number {
    const start = new Date(`${startDate}T00:00:00.000Z`)
    const end = new Date(`${endDate}T00:00:00.000Z`)

    const millisecondsDiff = end.getTime() - start.getTime()
    return Math.floor(millisecondsDiff / (24 * 60 * 60 * 1000)) + 1
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

  private getUtcDateOnly(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  private async updatePatientProfileMetrics(patientId: string, stats: MedicationStats) {
    const profilePayload = {
      id: patientId,
      healthscore: Math.round(stats.adherencePercent),
      adherence: stats.adherencePercent.toString(),
      doses_taken: stats.dosesTaken.toString(),
      missed_doses: stats.missedDoses.toString(),
    }

    await firstValueFrom(
      this.authClient.send(
        { cmd: 'upsert-user-profile' },
        {
          role: 'patient',
          profileData: {
            profileData: profilePayload,
          },
        },
      ),
    )
  }
}
