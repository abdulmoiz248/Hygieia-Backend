import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class ProviderReportService {
  constructor(
    @Inject('APPOINTMENTS_SERVICE') private readonly appointmentsClient: ClientProxy,
    @Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy,
  ) {}

  async submitReport(payload: {
    patientId: string
    reportedProviderId: string
    reportedProviderRole: 'doctor' | 'nutritionist'
    reason: string
    description?: string
    images?: string[]
  }) {
    try {
      const response = await firstValueFrom(
        this.appointmentsClient.send({ cmd: 'report_provider' }, payload),
      )
      return {
        statusCode: 201,
        message: 'Report submitted successfully',
        success: true,
        data: response,
      }
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to submit report')
    }
  }

  async getProviderReports(reportedProviderId: string) {
    try {
      const response = await firstValueFrom(
        this.adminClient.send({ cmd: 'get_provider_reports' }, { reportedProviderId }),
      )
      return {
        statusCode: 200,
        message: 'Provider reports fetched successfully',
        success: true,
        data: response,
      }
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to fetch provider reports')
    }
  }

  async issueWarning(reportedProviderId: string, reportId: string, adminNotes?: string) {
    try {
      const response = await firstValueFrom(
        this.adminClient.send(
          { cmd: 'issue_provider_warning' },
          { reportedProviderId, reportId, adminNotes },
        ),
      )
      return {
        statusCode: 200,
        message: 'Warning issued successfully',
        success: true,
        data: response,
      }
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to issue warning')
    }
  }
}
