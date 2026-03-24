import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class CronTestService {
  private readonly logger = new Logger(CronTestService.name)
  private schedulerServiceUrl: string

  constructor() {
    // Support both Docker and local development
    // In Docker: use service name (scheduler)
    // In local dev: use localhost
    const host = process.env.SCHEDULER_MS_HOST || 'localhost'
    const port = process.env.SCHEDULER_PORT || '4009'
    this.schedulerServiceUrl = `http://${host}:${port}`
    this.logger.debug(`Scheduler service URL: ${this.schedulerServiceUrl}`)
  }

  /**
   * Trigger weekly nutrition summary cron job via scheduler service
   */
  async triggerNutritionSummary() {
    try {
      const url = `${this.schedulerServiceUrl}/scheduler/trigger-nutrition-summary`
      this.logger.log(`Triggering nutrition summary at ${url}`)
      const response = await axios.post(url, {}, { timeout: 10000 })
      return response.data
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message
      this.logger.error(`Failed to trigger nutrition summary: ${errorMsg}`)
      throw new Error(`Scheduler service error: ${errorMsg}`)
    }
  }

  /**
   * Trigger monthly adherence tracking cron job via scheduler service
   */
  async triggerMonthlyAdherence() {
    try {
      const url = `${this.schedulerServiceUrl}/scheduler/trigger-monthly-adherence`
      this.logger.log(`Triggering monthly adherence at ${url}`)
      const response = await axios.post(url, {}, { timeout: 10000 })
      return response.data
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message
      this.logger.error(`Failed to trigger monthly adherence: ${errorMsg}`)
      throw new Error(`Scheduler service error: ${errorMsg}`)
    }
  }

  /**
   * Trigger daily medicine reminders cron job via scheduler service
   */
  async triggerMedicineReminders() {
    try {
      const url = `${this.schedulerServiceUrl}/scheduler/trigger-medicine-reminders`
      this.logger.log(`Triggering medicine reminders at ${url}`)
      const response = await axios.post(url, {}, { timeout: 10000 })
      return response.data
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message
      this.logger.error(`Failed to trigger medicine reminders: ${errorMsg}`)
      throw new Error(`Scheduler service error: ${errorMsg}`)
    }
  }

  /**
   * Trigger all cron jobs
   */
  async triggerAllCronJobs() {
    this.logger.log(`Triggering all cron jobs from ${this.schedulerServiceUrl}`)
    const results: any = {
      nutritionSummary: null,
      monthlyAdherence: null,
      medicineReminders: null,
    }

    try {
      results.nutritionSummary = await this.triggerNutritionSummary()
      this.logger.log('✓ Nutrition summary triggered successfully')
    } catch (error: any) {
      this.logger.error(`✗ Nutrition summary failed: ${error.message}`)
      results.nutritionSummary = { error: error.message }
    }

    try {
      results.monthlyAdherence = await this.triggerMonthlyAdherence()
      this.logger.log('✓ Monthly adherence triggered successfully')
    } catch (error: any) {
      this.logger.error(`✗ Monthly adherence failed: ${error.message}`)
      results.monthlyAdherence = { error: error.message }
    }

    try {
      results.medicineReminders = await this.triggerMedicineReminders()
      this.logger.log('✓ Medicine reminders triggered successfully')
    } catch (error: any) {
      this.logger.error(`✗ Medicine reminders failed: ${error.message}`)
      results.medicineReminders = { error: error.message }
    }

    return results
  }
}
