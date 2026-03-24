// analytics.service.ts
import { Inject, Injectable } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE } from '../supabase/supabase.module'
import { InjectModel } from '@nestjs/mongoose'
import { Profile, ProfileDocument } from '../appointments/schema/patient.profile.schema'
import { Model } from 'mongoose'

type FitnessRow = {
  created_at: string
  steps: number | null
  water: number | null
  sleep: number | null
  calories_burned: number | null
  calories_intake: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
}

type MedicationLogRow = {
  taken: boolean
  taken_at: string
}

type AdherenceMonthlyRow = {
  month_year: string
  adherence_score: number
  health_score: number
  medication_adherence: number
  diet_adherence: number
}

type Priority = 'low' | 'medium' | 'high'

type DashboardAnalyticsResponse = {
  success: true
  data: {
    weeklyActivity: Array<{
      day: string
      calories: number
      burned: number
      steps: number
      water: number
      sleep: number
    }>
    healthFocus: Array<{
      name: string
      value: number
      color: string
      icon: string
    }>
    medicationAdherence: Array<{
      week: string
      adherence: number
      missed: number
      sideEffects: number
      effectiveness: number
    }>
    monthlyProgress: Array<{
      month: string
      weight: number
      bmi: number
      bloodPressure: number
      heartRate: number
      energy: number
    }>
    recommendations: Array<{
      type: string
      title: string
      description: string
      priority: Priority
      impact: string
      timeframe: string
    }>
  }
}

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
  ) {}

  async getDashboardAnalytics(patientId: string): Promise<DashboardAnalyticsResponse> {
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 6)

    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(now.getMonth() - 5)

    const fourWeeksAgo = new Date(now)
    fourWeeksAgo.setDate(now.getDate() - 27)

    const [
      fitnessResponse,
      medicationLogsResponse,
      adherenceMonthlyResponse,
      profile,
    ] = await Promise.all([
      this.supabase
        .from('fitness')
        .select('created_at, steps, water, sleep, calories_burned, calories_intake, protein, fat, carbs')
        .eq('patient_id', patientId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true }),
      this.supabase
        .from('medication_adherence_logs')
        .select('taken, taken_at')
        .eq('patient_id', patientId)
        .gte('taken_at', fourWeeksAgo.toISOString())
        .order('taken_at', { ascending: true }),
      this.supabase
        .from('adherence_monthly_records')
        .select('month_year, adherence_score, health_score, medication_adherence, diet_adherence')
        .eq('patient_id', patientId)
        .order('month_year', { ascending: true }),
      this.profileModel.findOne({ id: patientId }).lean(),
    ])

    const fitness: FitnessRow[] = fitnessResponse.error ? [] : ((fitnessResponse.data as FitnessRow[]) || [])
    const medicationLogs: MedicationLogRow[] = medicationLogsResponse.error
      ? []
      : ((medicationLogsResponse.data as MedicationLogRow[]) || [])
    const adherenceMonthly: AdherenceMonthlyRow[] = adherenceMonthlyResponse.error
      ? []
      : ((adherenceMonthlyResponse.data as AdherenceMonthlyRow[]) || [])

    const weeklyActivity = this.buildWeeklyActivity(fitness, sevenDaysAgo)
    const medicationAdherence = this.buildMedicationAdherence(medicationLogs, now)
    const monthlyProgress = this.buildMonthlyProgress(fitness, adherenceMonthly, profile as any, now)
    const healthFocus = this.buildHealthFocus(weeklyActivity, adherenceMonthly, profile as any, medicationAdherence)
    const recommendations = this.buildRecommendations(weeklyActivity, profile as any, medicationAdherence)

    return {
      success: true,
      data: {
        weeklyActivity,
        healthFocus,
        medicationAdherence,
        monthlyProgress,
        recommendations,
      },
    }
  }

  private buildWeeklyActivity(fitness: FitnessRow[], fromDate: Date) {
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const hasRecentData = fitness.some((row) => row.created_at && new Date(row.created_at) >= fromDate)
    if (!hasRecentData) return []

    const aggregate = new Map<string, {
      calories: number
      burned: number
      steps: number
      water: number
      sleep: number
      count: number
    }>()

    for (const day of dayOrder) {
      aggregate.set(day, { calories: 0, burned: 0, steps: 0, water: 0, sleep: 0, count: 0 })
    }

    for (const row of fitness) {
      if (!row.created_at) continue
      const rowDate = new Date(row.created_at)
      if (rowDate < fromDate) continue

      const day = rowDate.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
      if (!aggregate.has(day)) continue

      const current = aggregate.get(day)!
      current.calories += Number(row.calories_intake || 0)
      current.burned += Number(row.calories_burned || 0)
      current.steps += Number(row.steps || 0)
      current.water += Number(row.water || 0)
      current.sleep += Number(row.sleep || 0)
      current.count += 1
      aggregate.set(day, current)
    }

    return dayOrder.map((day) => {
      const value = aggregate.get(day)!
      const count = value.count || 1
      return {
        day,
        calories: Math.round(value.calories / count),
        burned: Math.round(value.burned / count),
        steps: Math.round(value.steps / count),
        water: Number((value.water / count).toFixed(1)),
        sleep: Number((value.sleep / count).toFixed(1)),
      }
    })
  }

  private buildMedicationAdherence(logs: MedicationLogRow[], now: Date) {
    if (!logs.length) return []

    const weeks = [
      { label: 'Week 1', start: 21, end: 27 },
      { label: 'Week 2', start: 14, end: 20 },
      { label: 'Week 3', start: 7, end: 13 },
      { label: 'Week 4', start: 0, end: 6 },
    ]

    return weeks.map((bucket) => {
      const filtered = logs.filter((row) => {
        const logDate = new Date(row.taken_at)
        const diffDays = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= bucket.start && diffDays <= bucket.end
      })

      const total = filtered.length
      const taken = filtered.filter((item) => item.taken).length
      const missed = total - taken
      const adherence = total > 0 ? Math.round((taken / total) * 100) : 0

      return {
        week: bucket.label,
        adherence,
        missed,
        sideEffects: 0,
        effectiveness: Number((adherence / 10).toFixed(1)),
      }
    })
  }

  private buildMonthlyProgress(
    fitness: FitnessRow[],
    adherenceMonthly: AdherenceMonthlyRow[],
    profile: any,
    now: Date,
  ) {
    if (!fitness.length && !adherenceMonthly.length) return []

    const monthBuckets: Array<{ key: string; month: string }> = []
    for (let i = 5; i >= 0; i--) {
      const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      const month = cursor.toLocaleDateString('en-US', { month: 'short' })
      monthBuckets.push({ key, month })
    }

    const weight = Number(profile?.weight || 0)
    const heightCm = Number(profile?.height || 0)
    const bmi = weight > 0 && heightCm > 0 ? Number((weight / ((heightCm / 100) ** 2)).toFixed(1)) : 0
    const fallbackAdherence = Math.max(0, Math.min(100, Number(profile?.adherence || 0)))

    return monthBuckets.map((bucket) => {
      const monthFitness = fitness.filter((row) => {
        if (!row.created_at) return false
        const dt = new Date(row.created_at)
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
        return key === bucket.key
      })

      const record = adherenceMonthly.find((item) => item.month_year === bucket.key)
      const health = Number(record?.health_score ?? fallbackAdherence)
      const avgSleep = monthFitness.length
        ? monthFitness.reduce((sum, row) => sum + Number(row.sleep || 0), 0) / monthFitness.length
        : 0

      return {
        month: bucket.month,
        weight: Number(weight.toFixed(1)),
        bmi,
        bloodPressure: Math.round(120 + (100 - health) / 5),
        heartRate: Math.round(70 + (100 - health) / 10),
        energy: Number((avgSleep > 0 ? Math.min(10, avgSleep + 1.5) : health / 10).toFixed(1)),
      }
    })
  }

  private buildHealthFocus(
    weeklyActivity: Array<{ steps: number; sleep: number }>,
    adherenceMonthly: AdherenceMonthlyRow[],
    profile: any,
    medicationAdherence: Array<{ adherence: number }>,
  ) {
    if (!weeklyActivity.length && !adherenceMonthly.length && !medicationAdherence.length) {
      return []
    }

    const latestMonthly = adherenceMonthly.length > 0 ? adherenceMonthly[adherenceMonthly.length - 1] : null

    const avgSteps = weeklyActivity.length
      ? weeklyActivity.reduce((sum, row) => sum + Number(row.steps || 0), 0) / weeklyActivity.length
      : 0
    const avgSleep = weeklyActivity.length
      ? weeklyActivity.reduce((sum, row) => sum + Number(row.sleep || 0), 0) / weeklyActivity.length
      : 0

    const stepsLimit = Number(profile?.limit?.steps || 10000)
    const sleepLimit = Number(profile?.limit?.sleep || 8)

    const exerciseScore = Math.max(0, Math.min(100, Math.round((avgSteps / Math.max(stepsLimit, 1)) * 100)))
    const sleepScore = Math.max(0, Math.min(100, Math.round((avgSleep / Math.max(sleepLimit, 1)) * 100)))
    const dietScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(Number(latestMonthly?.diet_adherence ?? profile?.adherence ?? 0)),
      ),
    )

    const recentMedication = medicationAdherence[medicationAdherence.length - 1]?.adherence || 0
    const medicationScore = Math.max(
      0,
      Math.min(100, Math.round(Number(latestMonthly?.medication_adherence ?? recentMedication))),
    )

    return [
      { name: 'Diet', value: dietScore, color: 'var(--color-mint-green)', icon: '🥗' },
      { name: 'Sleep', value: sleepScore, color: 'var(--color-soft-blue)', icon: '😴' },
      { name: 'Exercise', value: exerciseScore, color: 'var(--color-lavender)', icon: '🏃' },
      { name: 'Medication', value: medicationScore, color: 'var(--color-coral)', icon: '💊' },
    ]
  }

  private buildRecommendations(
    weeklyActivity: Array<{ steps: number; sleep: number }>,
    profile: any,
    medicationAdherence: Array<{ adherence: number }>,
  ) {
    const recommendations: DashboardAnalyticsResponse['data']['recommendations'] = []

    if (!weeklyActivity.length && !medicationAdherence.length) {
      return recommendations
    }

    const avgSteps = weeklyActivity.length
      ? weeklyActivity.reduce((sum, row) => sum + Number(row.steps || 0), 0) / weeklyActivity.length
      : 0
    const avgSleep = weeklyActivity.length
      ? weeklyActivity.reduce((sum, row) => sum + Number(row.sleep || 0), 0) / weeklyActivity.length
      : 0
    const recentMedication = medicationAdherence[medicationAdherence.length - 1]?.adherence || 0

    const stepsLimit = Number(profile?.limit?.steps || 10000)
    const sleepLimit = Number(profile?.limit?.sleep || 8)

    if (avgSteps < stepsLimit * 0.7) {
      recommendations.push({
        type: 'exercise',
        title: 'Increase Cardio Sessions',
        description: 'Your recent step trend is below target. Add 20-30 minutes of cardio daily.',
        priority: 'high',
        impact: 'High',
        timeframe: '2-4 weeks',
      })
    }

    if (avgSleep < sleepLimit * 0.85) {
      recommendations.push({
        type: 'sleep',
        title: 'Improve Sleep Duration',
        description: 'Try a consistent bedtime routine to move closer to your sleep goal.',
        priority: 'medium',
        impact: 'Medium',
        timeframe: '1-2 weeks',
      })
    }

    if (recentMedication > 0 && recentMedication < 85) {
      recommendations.push({
        type: 'nutrition',
        title: 'Strengthen Medication Routine',
        description: 'Adherence has dropped recently. Use reminders to avoid missed doses.',
        priority: 'high',
        impact: 'High',
        timeframe: '1-2 weeks',
      })
    }

    return recommendations
  }

  async getPatientAnalytics(patientId: string) {
    console.log('[ANALYTICS SERVICE] Fetching patient analytics for:', patientId)

    const today = new Date()
    const past30Days = new Date()
    past30Days.setDate(today.getDate() - 30)

    const { data: fitness, error: fitnessError } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', patientId)
      .gte('created_at', past30Days.toISOString())
      .order('created_at', { ascending: true })

    if (fitnessError) {
      console.error('[ANALYTICS SERVICE] Fitness fetch error:', fitnessError.message)
      throw new Error(fitnessError.message)
    }
    console.log('[ANALYTICS SERVICE] Fitness records:', fitness?.length ?? 0)

    const { data: medicalRecords, error: recordsError } = await this.supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })

    if (recordsError) {
      console.error('[ANALYTICS SERVICE] Medical records fetch error:', recordsError.message)
      throw new Error(recordsError.message)
    }
    console.log('[ANALYTICS SERVICE] Medical records:', medicalRecords?.length ?? 0)

    return {
      patientId,
      fitness,
      medicalRecords,
    }
  }

  async getPatientsMonthly(lastNMonths = 6, doctorId: string) {
    console.log('[ANALYTICS SERVICE] Fetching monthly patients for doctor:', doctorId, 'Last months:', lastNMonths)

    const now = new Date()
    const months: { month: string; newPatients: number; totalPatients: number }[] = []

    for (let i = lastNMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)

      console.log(`[ANALYTICS SERVICE] Processing month: ${d.toLocaleString('default', { month: 'short' })}, Range: ${monthStart} - ${monthEnd}`)

      const { data: monthData } = await this.supabase
        .from("appointments")
        .select("patient_id, date")
        .eq("doctor_id", doctorId)
        .gte("date", monthStart)
        .lte("date", monthEnd)

      const newPatients = Array.isArray(monthData) ? new Set(monthData.map((r: any) => r.patient_id)).size : 0
      console.log(`[ANALYTICS SERVICE] Month ${d.toLocaleString('default', { month: 'short' })} new patients:`, newPatients)

      const { data: totalData } = await this.supabase
        .from("appointments")
        .select("patient_id, date")
        .eq("doctor_id", doctorId)
        .lte("date", monthEnd)

      const totalPatients = Array.isArray(totalData) ? new Set(totalData.map((r: any) => r.patient_id)).size : 0
      console.log(`[ANALYTICS SERVICE] Month ${d.toLocaleString('default', { month: 'short' })} total patients:`, totalPatients)

      months.push({
        month: d.toLocaleString("default", { month: "short" }),
        newPatients,
        totalPatients,
      })
    }

    return months
  }

  async getAppointmentsWeekly(doctorId: string) {
    console.log('[ANALYTICS SERVICE] Fetching weekly appointments for doctor:', doctorId)

    const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const { data } = await this.supabase.from("appointments").select("date, status").eq("doctor_id", doctorId)

    const map = new Map<string, { scheduled: number; completed: number; cancelled: number }>()
    week.forEach((d) => map.set(d, { scheduled: 0, completed: 0, cancelled: 0 }))

    if (Array.isArray(data)) {
      console.log('[ANALYTICS SERVICE] Total appointments fetched:', data.length)
      data.forEach((r: any) => {
        const dayName = new Date(r.date).toLocaleDateString("en-US", { weekday: "short" })
        const key = dayName.slice(0, 3)
        if (!map.has(key)) return
        const cur = map.get(key)!
        cur.scheduled += 1
        if (r.status === "completed") cur.completed += 1
        if (r.status === "cancelled") cur.cancelled += 1
        map.set(key, cur)
      })
    }

    const result = Array.from(map.entries()).map(([day, vals]) => ({ day, ...vals }))
    console.log('[ANALYTICS SERVICE] Weekly appointments summary:', result)

    return result
  }
}
