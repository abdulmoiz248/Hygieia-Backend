import { Controller, UsePipes, ValidationPipe } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { ReportService } from './report.service'
import { ReportSubmittedDto } from './dto/report-submitted.dto'

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @MessagePattern('provider_report_submitted')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async handleReportSubmitted(@Payload() data: ReportSubmittedDto) {
    await this.reportService.handleReportSubmitted(data)
  }
}
