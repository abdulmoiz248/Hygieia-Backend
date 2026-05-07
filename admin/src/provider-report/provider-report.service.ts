import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { SupabaseService } from 'src/supabase/supabase.service'

@Injectable()
export class ProviderReportService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Fetch all reports against a specific provider.
   * Patient identity (name, email) is NOT included to preserve anonymity.
   */
  async getProviderReports(reportedProviderId: string) {
    if (!reportedProviderId) {
      throw new BadRequestException('reportedProviderId is required')
    }

    const supabase = this.supabaseService.getClient()

    // Fetch provider info to include in response
    const { data: provider, error: providerErr } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', reportedProviderId)
      .single()

    if (providerErr || !provider) {
      throw new BadRequestException('Provider not found')
    }

    if (provider.role !== 'doctor' && provider.role !== 'nutritionist') {
      throw new BadRequestException('Provided user is not a doctor or nutritionist')
    }

    // Fetch all reports against this provider
    const { data: reports, error: reportsErr } = await supabase
      .from('provider_reports')
      .select('id, reported_provider_id, reported_provider_role, reason, description, evidence_urls, status, admin_notes, warning_issued, created_at, updated_at')
      .eq('reported_provider_id', reportedProviderId)
      .order('created_at', { ascending: false })

    if (reportsErr) {
      throw new InternalServerErrorException('Failed to fetch reports: ' + reportsErr.message)
    }

    // Count total warnings issued for this provider
    const { count: warningCount, error: countErr } = await supabase
      .from('provider_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_provider_id', reportedProviderId)
      .eq('warning_issued', true)

    if (countErr) {
      throw new InternalServerErrorException('Failed to count warnings: ' + countErr.message)
    }

    return {
      provider: {
        id: provider.id,
        email: provider.email,
        role: provider.role,
      },
      totalReports: reports?.length || 0,
      totalWarningsIssued: warningCount || 0,
      reports: reports || [],
    }
  }

  /**
   * Issue a warning to a provider for a specific report.
   * Creates a notification for the provider without revealing the complainant.
   */
  async issueWarning(reportedProviderId: string, reportId: string, adminNotes?: string) {
    if (!reportedProviderId || !reportId) {
      throw new BadRequestException('reportedProviderId and reportId are required')
    }

    const supabase = this.supabaseService.getClient()

    // Verify the report exists and belongs to this provider
    const { data: report, error: reportErr } = await supabase
      .from('provider_reports')
      .select('*')
      .eq('id', reportId)
      .eq('reported_provider_id', reportedProviderId)
      .single()

    if (reportErr || !report) {
      throw new BadRequestException('Report not found or does not belong to this provider')
    }

    if (report.warning_issued) {
      throw new BadRequestException('Warning has already been issued for this report')
    }

    // Update the report: mark warning as issued
    const { error: updateErr } = await supabase
      .from('provider_reports')
      .update({
        warning_issued: true,
        status: 'reviewed',
        admin_notes: adminNotes || report.admin_notes || null,
      })
      .eq('id', reportId)

    if (updateErr) {
      throw new InternalServerErrorException('Failed to update report: ' + updateErr.message)
    }

    // Count total warnings for this provider (after this one)
    const { count: warningCount, error: countErr } = await supabase
      .from('provider_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_provider_id', reportedProviderId)
      .eq('warning_issued', true)

    if (countErr) {
      throw new InternalServerErrorException('Failed to count warnings: ' + countErr.message)
    }

    const totalWarnings = warningCount || 0

    // Get provider role for notification formatting
    const providerRole = report.reported_provider_role === 'nutritionist' ? 'Nutritionist' : 'Doctor'

    // Create a formatted notification for the provider (NO complainant info)
    const warningTitle = `⚠️ Official Warning #${totalWarnings}`
    const warningMsg = [
      `Dear ${providerRole},`,
      ``,
      `This is an official warning issued by the Hygieia administration team.`,
      `A concern has been raised regarding your professional conduct.`,
      ``,
      `Reason: ${report.reason}`,
      adminNotes ? `Admin Notes: ${adminNotes}` : '',
      ``,
      `This is warning #${totalWarnings} on your record.`,
      totalWarnings >= 3
        ? `⛔ You have reached ${totalWarnings} warnings. Further issues may result in account suspension.`
        : `Please ensure that your conduct meets Hygieia's professional standards going forward.`,
      ``,
      `— Hygieia Administration`,
    ]
      .filter(Boolean)
      .join('\n')

    const { error: notifErr } = await supabase.from('notifications').insert([
      {
        user_id: reportedProviderId,
        title: warningTitle,
        notification_msg: warningMsg,
        action: null,
      },
    ])

    if (notifErr) {
      console.error(`Failed to create warning notification: ${notifErr.message}`)
      // Don't throw - the warning was still issued successfully
    }

    return {
      success: true,
      message: `Warning #${totalWarnings} issued successfully`,
      totalWarnings,
      reportId,
      reportedProviderId,
    }
  }
}
