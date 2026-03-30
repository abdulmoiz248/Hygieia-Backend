import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

type WorkerRole = 'doctor' | 'nutritionist' | 'lab_technician';

type WorkerUser = {
  id: string;
  email: string;
  role: WorkerRole | 'patient' | 'admin';
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  personal_email?: string | null;
};

@Injectable()
export class WorkerReportService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getWorkerReport(workerId: string) {
    if (!workerId) {
      throw new BadRequestException('workerId is required');
    }

    const supabase = this.supabaseService.getClient();

    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('id, email, role, created_at, updated_at, is_verified, personal_email')
      .eq('id', workerId)
      .single();

    if (workerError || !worker) {
      throw new BadRequestException('Worker not found');
    }

    if (!this.isWorkerRole(worker.role)) {
      throw new BadRequestException('Provided user is not a worker');
    }

    const [notificationsSummary, roleData] = await Promise.all([
      this.getNotificationSummary(workerId),
      this.getRoleSpecificData(workerId, worker.role),
    ]);

    const accountAgeDays = this.getAccountAgeDays(worker.created_at);

    return {
      reportGeneratedAt: new Date().toISOString(),
      worker: {
        id: worker.id,
        email: worker.email,
        role: worker.role,
        isVerified: worker.is_verified,
        personalEmail: worker.personal_email || null,
        createdAt: worker.created_at,
        updatedAt: worker.updated_at,
      },
      overview: {
        accountAgeDays,
        notifications: notificationsSummary.counts,
      },
      metrics: roleData.metrics,
      recentActivity: {
        notifications: notificationsSummary.recent,
        ...roleData.recent,
      },
      detailed: roleData.detailed,
      insights: this.buildInsights(worker.role, roleData.metrics, notificationsSummary.counts.unread),
    };
  }

  private isWorkerRole(role: string): role is WorkerRole {
    return role === 'doctor' || role === 'nutritionist' || role === 'lab_technician';
  }

  private getAccountAgeDays(createdAt: string): number {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
  }

  private async getNotificationSummary(workerId: string) {
    const supabase = this.supabaseService.getClient();

    const [{ count: totalCount }, { count: unreadCount }, { data: recent, error: recentError }] =
      await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', workerId),
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', workerId)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .select('id, title, notification_msg, is_read, created_at')
          .eq('user_id', workerId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

    if (recentError) {
      throw new InternalServerErrorException('Failed to fetch worker notifications');
    }

    return {
      counts: {
        total: totalCount || 0,
        unread: unreadCount || 0,
        read: Math.max(0, (totalCount || 0) - (unreadCount || 0)),
      },
      recent: recent || [],
    };
  }

  private async getRoleSpecificData(workerId: string, role: WorkerRole) {
    if (role === 'lab_technician') {
      return this.getLabTechnicianReport(workerId);
    }

    if (role === 'nutritionist') {
      return this.getNutritionistReport(workerId);
    }

    return this.getDoctorReport(workerId);
  }

  private async getDoctorReport(workerId: string) {
    const supabase = this.supabaseService.getClient();
    const today = new Date().toISOString().split('T')[0];

    const [appointmentsRes, prescriptionsRes, referredTestsRes, blogpostsRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, patient_id, date, time, status, mode, type, created_at, cancelled_by, cancellation_reason')
        .eq('doctor_id', workerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('prescriptions')
        .select('id, patient_id, appointment_id, status, start_date, end_date, created_at')
        .eq('doctor_id', workerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('referred_tests')
        .select('id, test_id, patient_id, dismissed, created_at')
        .eq('referrer_id', workerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('blogpost')
        .select('id, title, category, verified, publishedat')
        .eq('doctorId', workerId)
        .order('publishedat', { ascending: false }),
    ]);

    if (appointmentsRes.error || prescriptionsRes.error || referredTestsRes.error || blogpostsRes.error) {
      throw new InternalServerErrorException('Failed to build doctor report');
    }

    const appointments = appointmentsRes.data || [];
    const prescriptions = prescriptionsRes.data || [];
    const referredTests = referredTestsRes.data || [];
    const blogposts = blogpostsRes.data || [];

    const completedAppointments = appointments.filter((a) => a.status === 'completed').length;
    const upcomingAppointments = appointments.filter((a) => a.status === 'upcoming').length;
    const cancelledAppointments = appointments.filter((a) => a.status === 'cancelled').length;
    const onlineAppointments = appointments.filter((a) => a.mode === 'online').length;
    const physicalAppointments = appointments.filter((a) => a.mode === 'physical').length;

    const completionRate =
      appointments.length > 0
        ? Number(((completedAppointments / appointments.length) * 100).toFixed(2))
        : 0;

    const activePrescriptions = prescriptions.filter((p) => p.status === 'active').length;
    const completedPrescriptions = prescriptions.filter((p) => p.status === 'completed').length;
    const activePatients = new Set(appointments.map((a) => a.patient_id)).size;

    const referralsDismissed = referredTests.filter((r) => r.dismissed).length;
    const referralsPending = referredTests.length - referralsDismissed;

    const nextUpcomingAppointment = appointments
      .filter((a) => a.status === 'upcoming' && a.date >= today)
      .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`))[0] || null;

    return {
      metrics: {
        totalAppointments: appointments.length,
        completedAppointments,
        upcomingAppointments,
        cancelledAppointments,
        onlineAppointments,
        physicalAppointments,
        completionRate,
        uniquePatients: activePatients,
        totalPrescriptions: prescriptions.length,
        activePrescriptions,
        completedPrescriptions,
        totalReferrals: referredTests.length,
        dismissedReferrals: referralsDismissed,
        pendingReferrals: referralsPending,
        totalBlogPosts: blogposts.length,
        verifiedBlogPosts: blogposts.filter((b) => !!b.verified).length,
      },
      recent: {
        appointments: appointments.slice(0, 10),
        prescriptions: prescriptions.slice(0, 10),
        referredTests: referredTests.slice(0, 10),
        blogPosts: blogposts.slice(0, 10),
      },
      detailed: {
        nextUpcomingAppointment,
      },
    };
  }

  private async getNutritionistReport(workerId: string) {
    const supabase = this.supabaseService.getClient();
    const today = new Date().toISOString().split('T')[0];

    const [appointmentsRes, dietPlansRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, patient_id, date, time, status, mode, type, created_at')
        .eq('doctor_id', workerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('diet_plan')
        .select('id, patient_id, start_date, end_date, daily_calories, protein, carbs, fat, created_at')
        .eq('nutritionist_id', workerId)
        .order('created_at', { ascending: false }),
    ]);

    if (appointmentsRes.error || dietPlansRes.error) {
      throw new InternalServerErrorException('Failed to build nutritionist report');
    }

    const appointments = appointmentsRes.data || [];
    const dietPlans = dietPlansRes.data || [];

    const completedAppointments = appointments.filter((a) => a.status === 'completed').length;
    const upcomingAppointments = appointments.filter((a) => a.status === 'upcoming').length;
    const cancelledAppointments = appointments.filter((a) => a.status === 'cancelled').length;
    const completionRate =
      appointments.length > 0
        ? Number(((completedAppointments / appointments.length) * 100).toFixed(2))
        : 0;

    const activeDietPlans = dietPlans.filter((plan) => {
      if (!plan.start_date || !plan.end_date) return false;
      return plan.start_date <= today && plan.end_date >= today;
    }).length;

    const uniqueDietPlanPatients = new Set(dietPlans.map((d) => d.patient_id)).size;

    return {
      metrics: {
        totalAppointments: appointments.length,
        completedAppointments,
        upcomingAppointments,
        cancelledAppointments,
        completionRate,
        totalDietPlans: dietPlans.length,
        activeDietPlans,
        uniqueDietPlanPatients,
      },
      recent: {
        appointments: appointments.slice(0, 10),
        dietPlans: dietPlans.slice(0, 10),
      },
      detailed: {
        nextUpcomingAppointment:
          appointments
            .filter((a) => a.status === 'upcoming' && a.date >= today)
            .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`))[0] ||
          null,
      },
    };
  }

  private async getLabTechnicianReport(workerId: string) {
    const supabase = this.supabaseService.getClient();
    const today = new Date().toISOString().split('T')[0];

    const [profileRes, bookingsRes] = await Promise.all([
      supabase
        .from('lab_technician_profiles')
        .select('id, name, phone, img, gender, dateofbirth, personal_email')
        .eq('id', workerId)
        .single(),
      supabase
        .from('booked_lab_tests')
        .select('id, test_id, patient_id, scheduled_date, scheduled_time, status, booked_at, location')
        .eq('lab_technician_id', workerId)
        .order('booked_at', { ascending: false }),
    ]);

    if (bookingsRes.error) {
      throw new InternalServerErrorException('Failed to build lab technician report');
    }

    const profile = profileRes.error ? null : profileRes.data;
    const bookings = bookingsRes.data || [];

    const completedBookings = bookings.filter((b) => b.status === 'completed').length;
    const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;
    const completionRate =
      bookings.length > 0 ? Number(((completedBookings / bookings.length) * 100).toFixed(2)) : 0;

    const uniquePatients = new Set(bookings.map((b) => b.patient_id)).size;

    return {
      metrics: {
        totalLabBookings: bookings.length,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        completionRate,
        uniquePatients,
      },
      recent: {
        labBookings: bookings.slice(0, 10),
      },
      detailed: {
        profile,
        nextScheduledBooking:
          bookings
            .filter((b) => b.status === 'pending' && b.scheduled_date >= today)
            .sort((left, right) => `${left.scheduled_date} ${left.scheduled_time}`.localeCompare(`${right.scheduled_date} ${right.scheduled_time}`))[0] ||
          null,
      },
    };
  }

  private buildInsights(role: WorkerRole, metrics: Record<string, any>, unreadNotifications: number): string[] {
    const insights: string[] = [];

    if (typeof metrics.completionRate === 'number') {
      if (metrics.completionRate >= 80) {
        insights.push('High completion performance observed.');
      } else if (metrics.completionRate < 50) {
        insights.push('Completion rate is low and may need follow-up.');
      }
    }

    if (unreadNotifications > 20) {
      insights.push('Large unread notification backlog detected.');
    }

    if (role === 'doctor' && metrics.pendingReferrals > metrics.dismissedReferrals) {
      insights.push('More pending referrals than dismissed referrals.');
    }

    if (role === 'nutritionist' && metrics.activeDietPlans === 0 && metrics.totalDietPlans > 0) {
      insights.push('No active diet plans currently running.');
    }

    if (role === 'lab_technician' && metrics.pendingBookings > metrics.completedBookings) {
      insights.push('Pending lab workload is currently higher than completed tests.');
    }

    if (insights.length === 0) {
      insights.push('Worker activity appears stable based on current records.');
    }

    return insights;
  }
}
