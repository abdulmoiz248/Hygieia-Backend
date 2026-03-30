import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GetWorkerReportDto } from './dto/get-worker-report.dto';
import { WorkerReportService } from './worker-report.service';

@Controller('worker-report')
export class WorkerReportController {
  constructor(private readonly workerReportService: WorkerReportService) {}

  @MessagePattern({ cmd: 'get_worker_report' })
  async getWorkerReport(@Payload() payload: GetWorkerReportDto) {
    return this.workerReportService.getWorkerReport(payload.workerId);
  }
}
