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
import { ApiOperation, ApiResponse, ApiTags, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { GetWorkerReportDto } from './dto/get-worker-report.dto';
import { WorkerReportService } from './worker-report.service';

@ApiTags('Worker Report')
@ApiExtraModels()
@Controller('worker-report')
export class WorkerReportController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly workerReportService: WorkerReportService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Get comprehensive worker report with extensive analytics (Admin only)',
    description:
      'Returns complete role-aware in-depth analysis for a worker (doctor, nutritionist, or lab technician), including comprehensive worker details, performance metrics, engagement analytics, efficiency calculations, activity summary, recent records, actionable insights, and improvement recommendations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Worker report generated successfully with comprehensive analytics',
    schema: {
      example: {
        statusCode: 200,
        message: 'Worker report generated successfully',
        success: true,
        data: {
          reportGeneratedAt: '2024-05-01T10:30:00Z',
          reportRange: {
            monthlyTrendMonths: 12,
            newPatientTrendDays: 7,
          },
          workerDetails: {
            profile: {
              id: 'uuid-123',
              email: 'doctor@example.com',
              role: 'doctor',
              isVerified: true,
              personalEmail: 'personal@example.com',
              createdAt: '2023-01-15T00:00:00Z',
              updatedAt: '2024-05-01T10:00:00Z',
              name: 'Dr. John Smith',
              phone: '+1-555-0123',
              gender: 'male',
              dateofbirth: '1985-06-15',
              img: 'https://example.com/profile.jpg',
              specialization: 'Cardiology',
              licenseNumber: 'LIC-2023-123456',
              yearsOfExperience: 15,
              qualifications: 'MD, Board Certified in Cardiology',
              address: '123 Medical Center Dr',
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              bio: 'Experienced cardiologist with 15 years of practice',
            },
          },
          overview: {
            accountAgeDays: 475,
            accountStatus: 'established',
            registrationDate: '2023-01-15T00:00:00Z',
            lastActive: '2024-05-01T10:00:00Z',
            notifications: {
              total: 256,
              unread: 12,
              read: 244,
            },
            patients: {
              totalUniquePatients: 148,
              returningPatients: 89,
              newPatientsLast7Days: 3,
              newPatientsLast30Days: 12,
            },
            performanceLevel: 'excellent',
          },
          metrics: {
            core: {
              totalAppointments: 485,
              completedAppointments: 392,
              upcomingAppointments: 15,
              cancelledAppointments: 78,
              completionRate: 80.82,
              uniquePatients: 148,
              totalPrescriptions: 267,
              activePrescriptions: 45,
              completedPrescriptions: 222,
              totalReferrals: 89,
              dismissedReferrals: 34,
              pendingReferrals: 55,
              totalBlogPosts: 23,
              verifiedBlogPosts: 18,
              totalReviews: 142,
              averageRating: 4.6,
              lowRatingReviews: 8,
              returningPatients: 89,
              newPatientsLast7Days: 3,
              newPatientsLast30Days: 12,
            },
            engagement: {
              accountMaturity: 475,
              accountTier: 'established',
              totalInteractions: 841,
              monthlyActivityAverage: 70.08,
              patientEngagementRate: 0.3116,
            },
            efficiency: {
              appointmentsPerDay: 1.02,
              completionRatePercentage: 80.82,
              cancellationRatePercentage: 16.07,
              onlineVsPhysicalRatio: 0.45,
            },
          },
          analytics: {
            performance: {
              appointmentThroughput: 485,
              qualityScore: 85.41,
              patientRetentionRate: 60.14,
              growthMomentum: 'positive',
              prescriptionCompliance: 'active',
              referralEffectiveness: 38.2,
            },
            timeSeries: {
              appointmentsLast12Months: [
                {
                  month: '2023-05',
                  totalAppointments: 42,
                  completedAppointments: 34,
                  upcomingAppointments: 2,
                  cancelledAppointments: 6,
                  onlineAppointments: 18,
                  physicalAppointments: 24,
                  uniquePatients: 32,
                },
              ],
              prescriptionsLast12Months: [],
              referralsLast12Months: [],
              reviewsLast12Months: [],
            },
            patientTrends: {
              newPatientsLast7Days: [
                { date: '2024-04-25', newPatients: 1, cumulative: 1 },
              ],
              patientGrowthLast12Months: [
                { month: '2023-05', newPatients: 12, cumulativePatients: 12 },
              ],
            },
            quality: {
              averageRating: 4.6,
              lowRatingReviews: 8,
              lowRatingShare: 5.63,
            },
          },
          recentActivity: {
            notifications: [
              {
                id: 'notif-123',
                title: 'New Appointment Booked',
                notification_msg: 'Patient John Doe booked an appointment',
                is_read: false,
                created_at: '2024-05-01T09:30:00Z',
              },
            ],
            appointments: [],
            prescriptions: [],
            referredTests: [],
            blogPosts: [],
            reviews: [],
          },
          detailed: {
            nextUpcomingAppointment: {
              id: 'appt-456',
              date: '2024-05-05',
              time: '14:30:00',
              status: 'upcoming',
            },
          },
          insights: [
            '⭐ High completion performance observed - consider using this as a benchmark.',
            'Strong patient acquisition momentum in the last week.',
            '🎯 Strong patient retention rate - patients are returning regularly.',
          ],
          recommendations: [
            'Continue maintaining current service standards and consider mentoring peers.',
            'Focus on reducing referral backlog - establish systematic follow-up process.',
            'Leverage positive patient feedback in marketing materials.',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - only admin can access reports. User must have admin role to retrieve worker reports.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid worker ID, worker not found, or report generation failure. Worker ID must be valid UUID and user must have worker role.',
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
