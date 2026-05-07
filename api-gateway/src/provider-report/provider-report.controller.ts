import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Inject,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { firstValueFrom } from 'rxjs'
import { ProviderReportService } from './provider-report.service'
import {
  SubmitProviderReportDto,
  GetProviderReportsDto,
  IssueProviderWarningDto,
} from './dto/provider-report.dto'

@ApiTags('Provider Reports')
@Controller('provider-report')
export class ProviderReportController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    private readonly providerReportService: ProviderReportService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  //  SUBMIT REPORT (Patient only)
  // ─────────────────────────────────────────────────────────────

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Submit a report against a doctor or nutritionist (Patient only)',
    description:
      'Allows a patient to report a doctor or nutritionist with a reason, optional detailed description, and up to 3 image proofs. Images are uploaded to Cloudinary. The patient receives an acknowledgement email. Only users with role "patient" can file reports.',
  })
  @ApiBody({ type: SubmitProviderReportDto })
  @ApiResponse({
    status: 201,
    description: 'Report submitted successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Report submitted successfully',
        success: true,
        data: {
          success: true,
          message: 'Report submitted successfully. We will investigate this matter.',
          reportId: 'c3d4e5f6-a1b2-7890-fedc-ba0987654321',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload, patient/provider not found, or role mismatch',
  })
  @ApiResponse({
    status: 403,
    description: 'Only patients can file a report',
  })
  async submitReport(@Body() dto: SubmitProviderReportDto) {
    try {
      return await this.providerReportService.submitReport({
        patientId: dto.patientId,
        reportedProviderId: dto.reportedProviderId,
        reportedProviderRole: dto.reportedProviderRole,
        reason: dto.reason,
        description: dto.description,
        images: dto.images,
      })
    } catch (error: any) {
      if (error instanceof ForbiddenException) {
        throw error
      }
      throw new BadRequestException(error?.message || 'Failed to submit report')
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  VIEW REPORTS (Admin only)
  // ─────────────────────────────────────────────────────────────

  @Post('list')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Get all reports against a provider (Admin only)',
    description:
      'Returns all reports filed against a specific doctor or nutritionist. Patient identity is hidden. Includes total warning count. Only accessible by admin users.',
  })
  @ApiBody({ type: GetProviderReportsDto })
  @ApiResponse({
    status: 200,
    description: 'Provider reports fetched successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Provider reports fetched successfully',
        success: true,
        data: {
          provider: {
            id: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
            email: 'doctor@example.com',
            role: 'doctor',
          },
          totalReports: 3,
          totalWarningsIssued: 1,
          reports: [
            {
              id: 'c3d4e5f6-a1b2-7890-fedc-ba0987654321',
              reported_provider_id: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
              reported_provider_role: 'doctor',
              reason: 'Unprofessional behavior',
              description: 'Details about the incident...',
              evidence_urls: ['https://res.cloudinary.com/...'],
              status: 'pending',
              admin_notes: null,
              warning_issued: false,
              created_at: '2026-05-07T10:30:00Z',
              updated_at: '2026-05-07T10:30:00Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — only admin users can access this endpoint',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid provider ID or provider not found',
  })
  async getProviderReports(@Body() dto: GetProviderReportsDto) {
    try {
      await this.verifyAdmin(dto.userId)
      return await this.providerReportService.getProviderReports(dto.reportedProviderId)
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new BadRequestException(error?.message || 'Failed to fetch provider reports')
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  ISSUE WARNING (Admin only)
  // ─────────────────────────────────────────────────────────────

  @Post('warn')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({
    summary: 'Issue an official warning to a provider (Admin only)',
    description:
      'Issues a formal warning to a doctor or nutritionist for a specific report. A formatted notification is sent to the provider (without revealing the complainant). The warning count is tracked and included in the response. Only accessible by admin users.',
  })
  @ApiBody({ type: IssueProviderWarningDto })
  @ApiResponse({
    status: 200,
    description: 'Warning issued successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Warning issued successfully',
        success: true,
        data: {
          success: true,
          message: 'Warning #2 issued successfully',
          totalWarnings: 2,
          reportId: 'c3d4e5f6-a1b2-7890-fedc-ba0987654321',
          reportedProviderId: 'f9e8d7c6-b5a4-3210-fedc-ba0987654321',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — only admin users can issue warnings',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid report/provider ID, report not found, or warning already issued for this report',
  })
  async issueWarning(@Body() dto: IssueProviderWarningDto) {
    try {
      await this.verifyAdmin(dto.userId)
      return await this.providerReportService.issueWarning(
        dto.reportedProviderId,
        dto.reportId,
        dto.adminNotes,
      )
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new BadRequestException(error?.message || 'Failed to issue warning')
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  ADMIN VERIFICATION
  // ─────────────────────────────────────────────────────────────

  private async verifyAdmin(userId: string): Promise<void> {
    try {
      const userResult = await firstValueFrom(
        this.authClient.send({ cmd: 'user-data' }, { id: userId, role: 'admin' }),
      )
      if (!userResult?.data?.role || userResult.data.role !== 'admin') {
        throw new UnauthorizedException('Only admins can perform this action')
      }
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('Only admins can perform this action')
    }
  }
}
