import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Controller('dashboard')
export class DashboardController {
  constructor(@Inject('APPOINTMENTS_SERVICE') private readonly client: ClientProxy) {}

  @Get('analytics')
  async getDashboardAnalytics(@Query('patientId') patientId: string) {
    if (!patientId) {
      throw new BadRequestException({
        success: false,
        message: 'patientId is required',
      })
    }

    try {
      return await firstValueFrom(this.client.send({ cmd: 'get_dashboard_analytics' }, patientId))
    } catch (error: any) {
      const message = error?.message || error?.error || 'Failed to fetch dashboard analytics'
      throw new BadRequestException({
        success: false,
        message,
      })
    }
  }
}
