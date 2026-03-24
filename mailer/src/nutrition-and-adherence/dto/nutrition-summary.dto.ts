export class NutritionSummaryDto {
  patientId: string
  patientName: string
  patientEmail: string
  weekRange: {
    label: string
    startDate: string
    endDate: string
  }
  weeklyStats: {
    totalSteps: number
    avgStepsPerDay: number
    bestDay: {
      date: string
      steps: number
    }
    totalEstimatedMiles: number
    avgDailyCaloriesBurned: number
    avgDailyWaterIntake: number
    avgDailySleepHours: number
    avgDailyCaloriesIntake: number
  }
  weekOverWeek: {
    stepsDelta: number
    milesDelta: number
    caloriesBurnedDelta: number
    waterDelta: number
    sleepDelta: number
    caloriesIntakeDelta: number
  }
  dailyStats: Array<{
    date: string
    dayLabel: string
    steps: number
    estimatedMiles: number
    caloriesBurned: number
    caloriesIntake: number
    waterIntake: number
    sleepHours: number
  }>
}

export class MonthlyAdherenceDto {
  patientId: string
  patientName: string
  month: string
  year: number
  adherenceScore: number
  healthScore: number
  medicationAdherence: {
    expectedDoses: number
    dosesTaken: number
    missedDoses: number
    adherencePercent: number
  }
  dietAdherence: {
    daysTracked: number
    daysAdhered: number
    adherencePercent: number
  }
  totalDays: number
  notes?: string
}

export class MedicineReminderDto {
  patientId: string
  patientName: string
  patientEmail: string
  prescriptionId: string
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    medicationId?: string
  }>
  scheduledTime: string
  reminderTime: string
  reminderType: 'email' | 'notification' | 'both'
  medicationDate: string
  reminderMessage?: string
}
