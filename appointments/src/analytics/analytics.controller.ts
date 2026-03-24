// analytics.controller.ts
import { Controller, Get, Param } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { MessagePattern } from '@nestjs/microservices'

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @MessagePattern({ cmd: 'get_dashboard_analytics' })
  async getDashboardAnalytics(patientId: string) {
    return this.analyticsService.getDashboardAnalytics(patientId)
  }

   @MessagePattern({ cmd: 'getFitnessData' })
  async getFitnessData(patientId: string) {
    return this.analyticsService.getPatientAnalytics(patientId)
  }


  @MessagePattern({ cmd: "patients-monthly" })
  getPatientsMonthly(data: { doctorId: string; months: number }) {
    return this.analyticsService.getPatientsMonthly(data.months, data.doctorId)
  }

  @MessagePattern({ cmd: "appointments-weekly" })
  getAppointmentsWeekly(data: { doctorId: string }) {
    return this.analyticsService.getAppointmentsWeekly(data.doctorId)
  }
}
