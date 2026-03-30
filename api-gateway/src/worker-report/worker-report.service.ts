import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WorkerReportService {
  constructor(@Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy) {}

  async getWorkerReport(workerId: string) {
    try {
      const response = await firstValueFrom(
        this.adminClient.send({ cmd: 'get_worker_report' }, { workerId }),
      );

      return {
        statusCode: 200,
        message: 'Worker report generated successfully',
        data: response,
        success: true,
      };
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Failed to generate worker report');
    }
  }
}
