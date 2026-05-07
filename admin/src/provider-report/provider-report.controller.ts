import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { ProviderReportService } from './provider-report.service'
import { GetProviderReportsDto } from './dto/get-provider-reports.dto'
import { IssueProviderWarningDto } from './dto/issue-provider-warning.dto'

@Controller('provider-report')
export class ProviderReportController {
  constructor(private readonly providerReportService: ProviderReportService) {}

  @MessagePattern({ cmd: 'get_provider_reports' })
  async getProviderReports(@Payload() payload: GetProviderReportsDto) {
    return this.providerReportService.getProviderReports(payload.reportedProviderId)
  }

  @MessagePattern({ cmd: 'issue_provider_warning' })
  async issueWarning(@Payload() payload: IssueProviderWarningDto) {
    return this.providerReportService.issueWarning(
      payload.reportedProviderId,
      payload.reportId,
      payload.adminNotes,
    )
  }
}
