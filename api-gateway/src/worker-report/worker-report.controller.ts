import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { GetWorkerReportDto } from './dto/get-worker-report.dto';
import { WorkerReportService } from './worker-report.service';

@ApiTags('Worker Report')
@Controller('worker-report')
export class WorkerReportController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly workerReportService: WorkerReportService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Get in-depth worker report (Admin only)',
    description:
      'Returns complete role-aware analysis for a worker (doctor, nutritionist, or pathologist/lab technician), including account, performance metrics, activity summary, and recent records.',
  })
  @ApiResponse({
    status: 200,
    description: 'Worker report generated successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Worker report generated successfully',
        success: true,
        data: {
          worker: { id: '...', role: 'doctor', email: 'doctor@example.com' },
          overview: { accountAgeDays: 320, unreadNotifications: 4 },
          metrics: { totalAppointments: 180, completionRate: 74.4 },
          insights: ['Strong completion trend in last 30 days'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - only admin can access reports',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid worker ID or report generation failure',
  })
  async getWorkerReport(@Body() dto: GetWorkerReportDto) {
    try {
      await this.verifyAdmin(dto.userId);
      return await this.workerReportService.getWorkerReport(dto.workerId);
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Failed to generate worker report');
    }
  }

  private async verifyAdmin(userId: string): Promise<void> {
    try {
      const userResult = await firstValueFrom(
        this.authClient.send({ cmd: 'user-data' }, { id: userId, role: 'admin' }),
      );

      if (!userResult?.data?.role || userResult.data.role !== 'admin') {
        throw new UnauthorizedException('Only admins can perform this action');
      }
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Only admins can perform this action');
    }
  }
}
