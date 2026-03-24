import { Controller, Post, UseGuards, HttpException, HttpStatus } from '@nestjs/common'
import { CronTestService } from './cron-test.service'

@Controller('admin/cron-test')
export class CronTestController {
  constructor(private readonly cronTestService: CronTestService) {}

  /**
   * Test endpoint: Run weekly nutrition summary
   * POST /admin/cron-test/nutrition-summary
   */
  @Post('nutrition-summary')
  async testNutritionSummary() {
    try {
      const result = await this.cronTestService.triggerNutritionSummary()
      return {
        success: true,
        message: 'Weekly nutrition summary cron job triggered successfully',
        data: result,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to trigger nutrition summary cron job',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Test endpoint: Run monthly adherence tracking
   * POST /admin/cron-test/monthly-adherence
   */
  @Post('monthly-adherence')
  async testMonthlyAdherence() {
    try {
      const result = await this.cronTestService.triggerMonthlyAdherence()
      return {
        success: true,
        message: 'Monthly adherence tracking cron job triggered successfully',
        data: result,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to trigger monthly adherence cron job',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Test endpoint: Run daily medicine reminders
   * POST /admin/cron-test/medicine-reminders
   */
  @Post('medicine-reminders')
  async testMedicineReminders() {
    try {
      const result = await this.cronTestService.triggerMedicineReminders()
      return {
        success: true,
        message: 'Daily medicine reminders cron job triggered successfully',
        data: result,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to trigger medicine reminders cron job',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  /**
   * Test endpoint: Run all cron jobs
   * POST /admin/cron-test/all
   */
  @Post('all')
  async testAllCronJobs() {
    try {
      const results = await this.cronTestService.triggerAllCronJobs()
      return {
        success: true,
        message: 'All cron jobs triggered successfully',
        data: results,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to trigger cron jobs',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
