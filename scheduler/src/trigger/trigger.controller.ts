import { Controller, Post } from '@nestjs/common'
import { NutritionAndAdherenceService } from '../nutrition-and-adherence/nutrition-and-adherence.service'

@Controller('scheduler')
export class TriggerController {
  constructor(private readonly nutritionAndAdherenceService: NutritionAndAdherenceService) {}

  /**
   * Manually trigger the weekly nutrition summary cron job
   * POST /scheduler/trigger-nutrition-summary
   */
  @Post('trigger-nutrition-summary')
  async triggerNutritionSummary() {
    try {
      await this.nutritionAndAdherenceService.sendWeeklyNutritionSummary()
      return {
        success: true,
        message: 'Weekly nutrition summary cron job executed successfully',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute nutrition summary',
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Manually trigger the monthly adherence tracking cron job
   * POST /scheduler/trigger-monthly-adherence
   */
  @Post('trigger-monthly-adherence')
  async triggerMonthlyAdherence() {
    try {
      await this.nutritionAndAdherenceService.trackMonthlyAdherence()
      return {
        success: true,
        message: 'Monthly adherence tracking cron job executed successfully',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute monthly adherence tracking',
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Manually trigger the daily medicine reminders cron job
   * POST /scheduler/trigger-medicine-reminders
   */
  @Post('trigger-medicine-reminders')
  async triggerMedicineReminders() {
    try {
      await this.nutritionAndAdherenceService.scheduleDailyMedicineReminders()
      return {
        success: true,
        message: 'Daily medicine reminders cron job executed successfully',
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute medicine reminders',
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }
}
