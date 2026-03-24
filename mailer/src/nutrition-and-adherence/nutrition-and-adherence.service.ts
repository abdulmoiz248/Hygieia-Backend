import { Injectable } from '@nestjs/common'
import { MailService } from '../mail/mail.service'
import { generateNutritionSummaryEmail } from '../helpers/generateNutritionSummaryEmail'
import { generateMedicineReminderEmail } from '../helpers/generateMedicineReminderEmail'
import { NutritionSummaryDto } from './dto/nutrition-summary.dto'
import { MedicineReminderDto } from './dto/nutrition-summary.dto'

@Injectable()
export class NutritionAndAdherenceService {
  constructor(private readonly mailService: MailService) {}

  async handleNutritionSummary(data: NutritionSummaryDto) {
    try {
      const html = generateNutritionSummaryEmail({
        patientName: data.patientName,
        email: data.patientEmail,
        weekRange: data.weekRange,
        weeklyStats: data.weeklyStats,
        weekOverWeek: data.weekOverWeek,
        dailyStats: data.dailyStats,
      })

      await this.mailService.sendMail(
        data.patientEmail,
        '📊 Your Weekly Nutrition Summary - Hygieia',
        html,
      )

      console.log(`Nutrition summary email sent to ${data.patientEmail}`)
    } catch (error) {
      console.error(`Failed to send nutrition summary email: ${error}`)
      throw error
    }
  }

  async handleMedicineReminder(data: MedicineReminderDto) {
    try {
      const html = generateMedicineReminderEmail({
        patientName: data.patientName,
        email: data.patientEmail,
        medications: data.medications,
        scheduledTime: data.scheduledTime,
        reminderMessage: data.reminderMessage,
      })

      await this.mailService.sendMail(
        data.patientEmail,
        '💊 Medicine Reminder - Hygieia',
        html,
      )

      console.log(`Medicine reminder email sent to ${data.patientEmail}`)
    } catch (error) {
      console.error(`Failed to send medicine reminder email: ${error}`)
      throw error
    }
  }
}
