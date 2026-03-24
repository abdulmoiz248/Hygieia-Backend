import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { createClient } from '@supabase/supabase-js'
import { ClientProxy } from '@nestjs/microservices/client/client-proxy'
import { NutritionSummaryDto, MonthlyAdherenceDto, MedicineReminderDto } from '../dto/nutrition-summary.dto'

type PrescriptionRecord = {
  id: string
  patient_id: string
  medications: any[]
  start_date: string | null
  end_date: string | null
  status: string
}

type FailureRecord = {
  id: string
  patient_id: string
  month_year: string
  health_score: number
  adherence_score: number
  medication_adherence: number
  diet_adherence: number
  notes: string
}

type MedicationAdherenceRecord = {
  prescription_id: string
  medication_id: string
  scheduled_time: string
  medicationName: string
  dosage: string
  frequency: string
}

type PatientRecord = {
  id: string
  email: string
  personal_email?: string
}

type FitnessRecord = {
  created_at: string
  steps: number | null
  water: number | null
  sleep: number | null
  calories_burned: number | null
  calories_intake: number | null
}

type WeekRange = {
  previousWeekStart: Date
  previousWeekEnd: Date
  previousWeekStartISO: string
  previousWeekEndISO: string
  priorWeekStartISO: string
  priorWeekEndISO: string
  label: string
}

@Injectable()
export class NutritionAndAdherenceService {
  private readonly logger = new Logger(NutritionAndAdherenceService.name)
  private readonly supabase

  constructor(@Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy) {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  }

  /**
   * Runs every Monday at 9:00 AM UTC
   * Sends weekly nutrition summary emails to patients
   */
  @Cron('0 9 * * 1', {
    name: 'weekly-nutrition-summary',
    timeZone: 'UTC',
  })
  async sendWeeklyNutritionSummary() {
    this.logger.log('Starting weekly nutrition summary job...')

    
    try {
      const weekRange = this.getPreviousWeekRange()

      const { data: weeklyFitnessRows, error: weeklyFitnessError } = await this.supabase
        .from('fitness')
        .select('patient_id')
        .not('patient_id', 'is', null)
        .gte('created_at', `${weekRange.previousWeekStartISO}T00:00:00.000Z`)
        .lte('created_at', `${weekRange.previousWeekEndISO}T23:59:59.999Z`)

      if (weeklyFitnessError) {
        this.logger.error(`Failed to fetch weekly fitness records: ${weeklyFitnessError.message}`)
        return
      }

      if (!weeklyFitnessRows || weeklyFitnessRows.length === 0) {
        this.logger.log(`No fitness data found for previous week (${weekRange.label})`)
        return
      }

      const uniquePatientIds = [
        ...new Set(
          weeklyFitnessRows
            .map((row: { patient_id: string | null }) => row.patient_id)
            .filter((patientId): patientId is string => Boolean(patientId)),
        ),
      ]

      if (uniquePatientIds.length === 0) {
        this.logger.log(`No patients found for previous week (${weekRange.label})`)
        return
      }

      let sentCount = 0

      for (const patientId of uniquePatientIds) {
        try {
          await this.processNutritionSummaryForPatient(patientId as string, weekRange)
          sentCount++
        } catch (error: any) {
          this.logger.error(`Failed to send nutrition summary for patient ${patientId}: ${error?.message || error}`)
        }
      }

      this.logger.log(`Completed sending ${sentCount} nutrition summary emails`)
    } catch (error: any) {
      this.logger.error(`Weekly nutrition summary job failed: ${error?.message || error}`)
    }
  }

  /**
   * Runs at the beginning of each month (00:00 UTC on 1st)
   * Stores adherence and health score for the previous month
   */
  @Cron('0 0 1 * *', {
    name: 'monthly-adherence-tracking',
    timeZone: 'UTC',
  })
  async trackMonthlyAdherence() {
    this.logger.log('Starting monthly adherence tracking job...')

    try {
      // Get the previous month
      const now = new Date()
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const monthYearStr = previousMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

      const startDate = previousMonth.toISOString().split('T')[0]
      const endDate = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0]

      // Get all patients with prescriptions
      const { data: prescriptions, error: prescriptionsError } = await this.supabase
        .from('prescriptions')
        .select('patient_id, medications, start_date, end_date')

      if (prescriptionsError) {
        this.logger.error(`Failed to fetch prescriptions: ${prescriptionsError.message}`)
        return
      }

      if (!prescriptions || prescriptions.length === 0) {
        this.logger.log('No prescriptions found')
        return
      }

      const uniquePatientIds = [...new Set(prescriptions.map((p: any) => p.patient_id))]

      let storedCount = 0

      for (const patientId of uniquePatientIds) {
        try {
          await this.processMonthlyAdherenceForPatient(patientId as string, startDate, endDate, monthYearStr)
          storedCount++
        } catch (error: any) {
          this.logger.error(`Failed to track adherence for patient ${patientId}: ${error?.message || error}`)
        }
      }

      this.logger.log(`Completed storing adherence data for ${storedCount} patients`)
    } catch (error: any) {
      this.logger.error(`Monthly adherence tracking job failed: ${error?.message || error}`)
    }
  }

  /**
   * Runs daily at 05:00 UTC
   * Adds medicine reminders to BullMQ for all patients with active prescriptions
   * Emails will be sent 10 minutes before scheduled medicine time
   */
  @Cron('0 5 * * *', {
    name: 'daily-medicine-reminders',
    timeZone: 'UTC',
  })
  async scheduleDailyMedicineReminders() {
    this.logger.log('Starting daily medicine reminder scheduling job...')

    try {
      // Get all active prescriptions for today
      const today = new Date().toISOString().split('T')[0]

      const { data: prescriptions, error: prescriptionsError } = await this.supabase
        .from('prescriptions')
        .select('id, patient_id, medications, start_date, end_date, status')

      if (prescriptionsError) {
        this.logger.error(`Failed to fetch prescriptions: ${prescriptionsError.message}`)
        return
      }

      if (!prescriptions || prescriptions.length === 0) {
        this.logger.log('No prescriptions found')
        return
      }

      // Filter active prescriptions
      const activePrescriptions = prescriptions.filter((p: any) => {
        const startDate = p.start_date ? new Date(p.start_date) : new Date(0)
        const endDate = p.end_date ? new Date(p.end_date) : new Date(8640000000000000)
        const todayDate = new Date(today)

        return p.status === 'active' && startDate <= todayDate && endDate >= todayDate
      })

      if (activePrescriptions.length === 0) {
        this.logger.log('No active prescriptions for today')
        return
      }

      let reminderCount = 0

      for (const prescription of activePrescriptions) {
        try {
          await this.processDailyMedicineRemindersForPrescription(prescription, today)
          reminderCount++
        } catch (error: any) {
          this.logger.error(
            `Failed to process medicine reminders for prescription ${prescription.id}: ${error?.message || error}`,
          )
        }
      }

      this.logger.log(`Scheduled ${reminderCount} medicine reminder(s)`)
    } catch (error: any) {
      this.logger.error(`Daily medicine reminder scheduling job failed: ${error?.message || error}`)
    }
  }

  private async processNutritionSummaryForPatient(patientId: string, weekRange: WeekRange) {
    // Get patient info
    const { data: patientUser, error: patientError } = await this.supabase
      .from('users')
      .select('id, email, personal_email')
      .eq('id', patientId)
      .single()

    if (patientError || !patientUser) {
      this.logger.error(`Failed to fetch patient ${patientId}: ${patientError?.message}`)
      return
    }

    // Get patient profile for name
    const { data: patientProfile } = await this.supabase
      .from('patient_profiles')
      .select('name')
      .eq('user_id', patientId)
      .single()

    const patientName = patientProfile?.name || 'Patient'
    const patientEmail = patientUser.personal_email || patientUser.email

    const { data: fitnessData, error: fitnessError } = await this.supabase
      .from('fitness')
      .select('created_at, steps, water, sleep, calories_burned, calories_intake')
      .eq('patient_id', patientId)
      .gte('created_at', `${weekRange.priorWeekStartISO}T00:00:00.000Z`)
      .lte('created_at', `${weekRange.previousWeekEndISO}T23:59:59.999Z`)
      .order('created_at', { ascending: true })

    if (fitnessError) {
      this.logger.error(`Failed to fetch fitness data for patient ${patientId}: ${fitnessError.message}`)
      return
    }

    const rows = (fitnessData || []) as FitnessRecord[]
    const previousWeekData = rows.filter((row) => {
      const day = row.created_at.split('T')[0]
      return day >= weekRange.previousWeekStartISO && day <= weekRange.previousWeekEndISO
    })

    const priorWeekData = rows.filter((row) => {
      const day = row.created_at.split('T')[0]
      return day >= weekRange.priorWeekStartISO && day <= weekRange.priorWeekEndISO
    })

    const weeklyStats = this.calculateWeeklyFitnessStats(previousWeekData)
    const priorWeekStats = this.calculateWeeklyFitnessStats(priorWeekData)
    const weekOverWeek = this.calculateWeekOverWeekDelta(weeklyStats, priorWeekStats)
    const dailyStats = this.buildDailyFitnessStats(previousWeekData)

    if (dailyStats.length === 0) {
      this.logger.log(`No previous-week fitness rows available for patient ${patientId}`)
      return
    }

    const nutritionSummaryDto: NutritionSummaryDto = {
      patientId,
      patientName,
      patientEmail,
      weekRange: {
        label: weekRange.label,
        startDate: weekRange.previousWeekStartISO,
        endDate: weekRange.previousWeekEndISO,
      },
      weeklyStats,
      weekOverWeek,
      dailyStats,
    }

    // Send email via mailer service
    this.mailerClient.emit('send_nutrition_summary', nutritionSummaryDto)
    this.logger.log(`Emitted nutrition summary email for patient ${patientId}`)
  }

  private async processMonthlyAdherenceForPatient(patientId: string, startDate: string, endDate: string, monthYear: string) {
    // Get patient prescriptions for the month
    const { data: prescriptions, error: prescriptionsError } = await this.supabase
      .from('prescriptions')
      .select('id, medications')
      .eq('patient_id', patientId)

    if (prescriptionsError) {
      this.logger.error(`Failed to fetch prescriptions for patient ${patientId}: ${prescriptionsError.message}`)
      return
    }

    if (!prescriptions || prescriptions.length === 0) {
      return
    }

    const prescriptionIds = prescriptions.map((p) => p.id)

    // Get medication adherence logs for the month
    const { data: adherenceLogs, error: adherenceError } = await this.supabase
      .from('medication_adherence_logs')
      .select('taken, taken_date')
      .eq('patient_id', patientId)
      .in('prescription_id', prescriptionIds)
      .gte('taken_date', startDate)
      .lte('taken_date', endDate)

    if (adherenceError) {
      this.logger.error(
        `Failed to fetch adherence logs for patient ${patientId}: ${adherenceError.message}`,
      )
      return
    }

    // Calculate metrics
    const totalDays = this.getDaysBetween(startDate, endDate)
    const expectedDoses = prescriptions.length * totalDays * 2 // Assuming 2 doses per day
    const dosesTaken = (adherenceLogs || []).filter((log) => log.taken).length
    const medicationAdherence = ((dosesTaken / expectedDoses) * 100) || 0

    // Get diet adherence
    const { data: dietHistory } = await this.supabase
      .from('fitness')
      .select('created_at')
      .eq('patient_id', patientId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const dietTrackedDays = new Set((dietHistory || []).map((d) => d.created_at.split('T')[0])).size
    const dietAdherence = ((dietTrackedDays / totalDays) * 100) || 0

    // Calculate health score (weighted average)
    const healthScore = Math.round((medicationAdherence * 0.6 + dietAdherence * 0.4) || 0)

    // Store in database
    const { error: insertError } = await this.supabase.from('adherence_monthly_records').insert([
      {
        patient_id: patientId,
        month_year: monthYear,
        adherence_score: Math.round(medicationAdherence),
        health_score: healthScore,
        medication_adherence: Math.round(medicationAdherence),
        diet_adherence: Math.round(dietAdherence),
        total_days: totalDays,
        notes: `Tracked ${dietTrackedDays} diet days. Took ${dosesTaken}/${expectedDoses} doses.`,
        recorded_at: new Date().toISOString(),
      },
    ])

    if (insertError) {
      this.logger.error(`Failed to store adherence data for patient ${patientId}: ${insertError.message}`)
      return
    }

    this.logger.log(`Stored monthly adherence for patient ${patientId} - Health Score: ${healthScore}`)
  }

  private async processDailyMedicineRemindersForPrescription(prescription: any, date: string) {
    // Get patient info
    const { data: patientUser, error: patientError } = await this.supabase
      .from('users')
      .select('id, email, personal_email')
      .eq('id', prescription.patient_id)
      .single()

    if (patientError || !patientUser) {
      this.logger.error(`Failed to fetch patient ${prescription.patient_id}: ${patientError?.message}`)
      return
    }

    // Get patient profile
    const { data: patientProfile } = await this.supabase
      .from('patient_profiles')
      .select('name')
      .eq('user_id', prescription.patient_id)
      .single()

    const patientName = patientProfile?.name || 'Patient'
    const patientEmail = patientUser.personal_email || patientUser.email

    // Parse medications from prescription
    const medications = prescription.medications || []

    if (medications.length === 0) {
      return
    }

    // For each medication, create a reminder
    for (const med of medications) {
      try {
        const medicineReminderDto: MedicineReminderDto = {
          patientId: prescription.patient_id,
          patientName,
          patientEmail,
          prescriptionId: prescription.id,
          medications: [
            {
              name: med.name || 'Medication',
              dosage: med.dosage || 'As prescribed',
              frequency: med.frequency || 'Twice daily',
              medicationId: med.medicationId || med.id,
            },
          ],
          scheduledTime: '09:00 AM', // Default time - can be customized per prescription
          reminderTime: '08:50 AM', // 10 minutes before
          reminderType: 'email',
          medicationDate: date,
          reminderMessage: `Time to take your ${med.name || 'medication'}!`,
        }

        // Emit to mailer service
        this.mailerClient.emit('send_medicine_reminder', medicineReminderDto)
        this.logger.log(
          `Emitted medicine reminder for patient ${prescription.patient_id} - ${med.name || 'Medication'}`,
        )
      } catch (error: any) {
        this.logger.error(`Failed to create reminder for medication: ${error?.message || error}`)
      }
    }
  }

  private getPreviousWeekRange(): WeekRange {
    const now = new Date()
    const utcDay = now.getUTCDay()
    const diffToMonday = (utcDay + 6) % 7

    const currentWeekMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    currentWeekMonday.setUTCDate(currentWeekMonday.getUTCDate() - diffToMonday)

    const previousWeekStart = new Date(currentWeekMonday)
    previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)

    const previousWeekEnd = new Date(currentWeekMonday)
    previousWeekEnd.setUTCDate(previousWeekEnd.getUTCDate() - 1)

    const priorWeekStart = new Date(previousWeekStart)
    priorWeekStart.setUTCDate(priorWeekStart.getUTCDate() - 7)

    const priorWeekEnd = new Date(previousWeekStart)
    priorWeekEnd.setUTCDate(priorWeekEnd.getUTCDate() - 1)

    const previousWeekStartISO = previousWeekStart.toISOString().split('T')[0]
    const previousWeekEndISO = previousWeekEnd.toISOString().split('T')[0]
    const priorWeekStartISO = priorWeekStart.toISOString().split('T')[0]
    const priorWeekEndISO = priorWeekEnd.toISOString().split('T')[0]

    const label = `${this.formatMonthDay(previousWeekStart)} - ${this.formatMonthDay(previousWeekEnd)}`

    return {
      previousWeekStart,
      previousWeekEnd,
      previousWeekStartISO,
      previousWeekEndISO,
      priorWeekStartISO,
      priorWeekEndISO,
      label,
    }
  }

  private formatMonthDay(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }

  private buildDailyFitnessStats(fitnessData: FitnessRecord[]) {
    const byDay = new Map<string, FitnessRecord[]>()

    for (const entry of fitnessData) {
      const day = entry.created_at.split('T')[0]
      if (!byDay.has(day)) {
        byDay.set(day, [])
      }
      byDay.get(day)!.push(entry)
    }

    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => {
        const daySteps = entries.reduce((sum, row) => sum + (row.steps || 0), 0)
        const avgWater = this.roundTo(entries.reduce((sum, row) => sum + Number(row.water || 0), 0) / entries.length, 2)
        const avgSleep = this.roundTo(entries.reduce((sum, row) => sum + Number(row.sleep || 0), 0) / entries.length, 1)
        const avgCaloriesBurned = Math.round(entries.reduce((sum, row) => sum + (row.calories_burned || 0), 0) / entries.length)
        const avgCaloriesIntake = Math.round(entries.reduce((sum, row) => sum + (row.calories_intake || 0), 0) / entries.length)

        return {
          date,
          dayLabel: new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', {
            weekday: 'short',
            timeZone: 'UTC',
          }),
          steps: daySteps,
          estimatedMiles: this.roundTo(this.estimateMilesFromSteps(daySteps), 2),
          caloriesBurned: avgCaloriesBurned,
          caloriesIntake: avgCaloriesIntake,
          waterIntake: avgWater,
          sleepHours: avgSleep,
        }
      })
  }

  private calculateWeeklyFitnessStats(fitnessData: FitnessRecord[]) {
    if (fitnessData.length === 0) {
      return {
        totalSteps: 0,
        avgStepsPerDay: 0,
        bestDay: {
          date: 'No data',
          steps: 0,
        },
        totalEstimatedMiles: 0,
        avgDailyCaloriesBurned: 0,
        avgDailyWaterIntake: 0,
        avgDailySleepHours: 0,
        avgDailyCaloriesIntake: 0,
      }
    }

    const dailyStats = this.buildDailyFitnessStats(fitnessData)
    const totalSteps = dailyStats.reduce((sum, day) => sum + day.steps, 0)
    const bestDay = dailyStats.reduce((best, day) => (day.steps > best.steps ? day : best), dailyStats[0])

    const avgStepsPerDay = Math.round(totalSteps / dailyStats.length)
    const totalEstimatedMiles = this.roundTo(this.estimateMilesFromSteps(totalSteps), 2)
    const avgDailyCaloriesBurned = Math.round(
      dailyStats.reduce((sum, day) => sum + day.caloriesBurned, 0) / dailyStats.length,
    )
    const avgDailyWaterIntake = this.roundTo(
      dailyStats.reduce((sum, day) => sum + day.waterIntake, 0) / dailyStats.length,
      2,
    )
    const avgDailySleepHours = this.roundTo(
      dailyStats.reduce((sum, day) => sum + day.sleepHours, 0) / dailyStats.length,
      1,
    )
    const avgDailyCaloriesIntake = Math.round(
      dailyStats.reduce((sum, day) => sum + day.caloriesIntake, 0) / dailyStats.length,
    )

    return {
      totalSteps,
      avgStepsPerDay,
      bestDay: {
        date: `${bestDay.dayLabel} (${this.formatMonthDay(new Date(`${bestDay.date}T00:00:00.000Z`))})`,
        steps: bestDay.steps,
      },
      totalEstimatedMiles,
      avgDailyCaloriesBurned,
      avgDailyWaterIntake,
      avgDailySleepHours,
      avgDailyCaloriesIntake,
    }
  }

  private calculateWeekOverWeekDelta(
    current: ReturnType<NutritionAndAdherenceService['calculateWeeklyFitnessStats']>,
    previous: ReturnType<NutritionAndAdherenceService['calculateWeeklyFitnessStats']>,
  ) {
    return {
      stepsDelta: current.totalSteps - previous.totalSteps,
      milesDelta: this.roundTo(current.totalEstimatedMiles - previous.totalEstimatedMiles, 2),
      caloriesBurnedDelta: current.avgDailyCaloriesBurned - previous.avgDailyCaloriesBurned,
      waterDelta: this.roundTo(current.avgDailyWaterIntake - previous.avgDailyWaterIntake, 2),
      sleepDelta: this.roundTo(current.avgDailySleepHours - previous.avgDailySleepHours, 1),
      caloriesIntakeDelta: current.avgDailyCaloriesIntake - previous.avgDailyCaloriesIntake,
    }
  }

  private estimateMilesFromSteps(steps: number): number {
    return steps * 0.0005
  }

  private roundTo(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals)
    return Math.round(value * factor) / factor
  }

  private getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }
}
