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

type DateLike = string | Date | null | undefined;

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
      reportRange: {
        monthlyTrendMonths: 12,
        newPatientTrendDays: 7,
      },
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
        patients: roleData.patientsOverview,
      },
      metrics: roleData.metrics,
      analytics: roleData.analytics,
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

  private toMonthKey(value: DateLike): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}`;
  }

  private toDateKey(value: DateLike): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}-${day}`;
  }

  private getLastNMonthKeys(months: number): string[] {
    const now = new Date();
    const keys: string[] = [];

    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      keys.push(`${d.getUTCFullYear()}-${month}`);
    }

    return keys;
  }

  private getLastNDates(days: number): string[] {
    const now = new Date();
    const dates: string[] = [];

    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      dates.push(`${d.getUTCFullYear()}-${month}-${day}`);
    }

    return dates;
  }

  private buildPatientFirstSeen(
    rows: Array<{ patient_id?: string | null; created_at?: string | null }>,
  ): Map<string, string> {
    const firstSeen = new Map<string, string>();

    rows.forEach((row) => {
      if (!row.patient_id || !row.created_at) return;

      const existing = firstSeen.get(row.patient_id);
      if (!existing || new Date(row.created_at).getTime() < new Date(existing).getTime()) {
        firstSeen.set(row.patient_id, row.created_at);
      }
    });

    return firstSeen;
  }

  private buildNewPatientsSeries(firstSeenByPatient: Map<string, string>, days: number) {
    const dateKeys = this.getLastNDates(days);
    const dateSet = new Set(dateKeys);
    const newPatientsByDate: Record<string, number> = {};

    firstSeenByPatient.forEach((seenAt) => {
      const key = this.toDateKey(seenAt);
      if (!key || !dateSet.has(key)) return;
      newPatientsByDate[key] = (newPatientsByDate[key] || 0) + 1;
    });

    let cumulative = 0;
    return dateKeys.map((date) => {
      const newPatients = newPatientsByDate[date] || 0;
      cumulative += newPatients;
      return {
        date,
        newPatients,
        cumulative,
      };
    });
  }

  private buildMonthlyPatientGrowth(firstSeenByPatient: Map<string, string>, months = 12) {
    const monthKeys = this.getLastNMonthKeys(months);
    const monthSet = new Set(monthKeys);
    const newPatientsByMonth: Record<string, number> = {};

    firstSeenByPatient.forEach((seenAt) => {
      const key = this.toMonthKey(seenAt);
      if (!key || !monthSet.has(key)) return;
      newPatientsByMonth[key] = (newPatientsByMonth[key] || 0) + 1;
    });

    let cumulativePatients = 0;
    return monthKeys.map((month) => {
      const newPatients = newPatientsByMonth[month] || 0;
      cumulativePatients += newPatients;
      return {
        month,
        newPatients,
        cumulativePatients,
      };
    });
  }

  private countNewPatientsInLastDays(firstSeenByPatient: Map<string, string>, days: number): number {
    const dateSet = new Set(this.getLastNDates(days));
    let total = 0;

    firstSeenByPatient.forEach((seenAt) => {
      const key = this.toDateKey(seenAt);
      if (key && dateSet.has(key)) {
        total += 1;
      }
    });

    return total;
  }

  private buildAppointmentsMonthlySeries(
    rows: Array<{ created_at?: string | null; status?: string | null; mode?: string | null; patient_id?: string | null }>,
    months = 12,
  ) {
    const monthKeys = this.getLastNMonthKeys(months);
    const monthSet = new Set(monthKeys);

    const monthlyStats: Record<
      string,
      {
        total: number;
        completed: number;
        upcoming: number;
        cancelled: number;
        online: number;
        physical: number;
        patients: Set<string>;
      }
    > = {};

    monthKeys.forEach((month) => {
      monthlyStats[month] = {
        total: 0,
        completed: 0,
        upcoming: 0,
        cancelled: 0,
        online: 0,
        physical: 0,
        patients: new Set<string>(),
      };
    });

    rows.forEach((row) => {
      const month = this.toMonthKey(row.created_at);
      if (!month || !monthSet.has(month)) return;

      const item = monthlyStats[month];
      item.total += 1;

      if (row.status === 'completed') item.completed += 1;
      if (row.status === 'upcoming') item.upcoming += 1;
      if (row.status === 'cancelled') item.cancelled += 1;
      if (row.mode === 'online') item.online += 1;
      if (row.mode === 'physical') item.physical += 1;
      if (row.patient_id) item.patients.add(row.patient_id);
    });

    return monthKeys.map((month) => ({
      month,
      totalAppointments: monthlyStats[month].total,
      completedAppointments: monthlyStats[month].completed,
      upcomingAppointments: monthlyStats[month].upcoming,
      cancelledAppointments: monthlyStats[month].cancelled,
      onlineAppointments: monthlyStats[month].online,
      physicalAppointments: monthlyStats[month].physical,
      uniquePatients: monthlyStats[month].patients.size,
    }));
  }

  private buildSimpleMonthlySeries(
    rows: Array<{ created_at?: string | null; status?: string | null }>,
    config: {
      totalLabel: string;
      statusLabels?: Record<string, string>;
    },
    months = 12,
  ) {
    const monthKeys = this.getLastNMonthKeys(months);
    const monthSet = new Set(monthKeys);
    const monthly: Record<string, Record<string, number>> = {};

    monthKeys.forEach((month) => {
      monthly[month] = {
        [config.totalLabel]: 0,
      };

      if (config.statusLabels) {
        Object.values(config.statusLabels).forEach((label) => {
          monthly[month][label] = 0;
        });
      }
    });

    rows.forEach((row) => {
      const month = this.toMonthKey(row.created_at);
      if (!month || !monthSet.has(month)) return;

      monthly[month][config.totalLabel] += 1;
      if (config.statusLabels && row.status && config.statusLabels[row.status]) {
        monthly[month][config.statusLabels[row.status]] += 1;
      }
    });

    return monthKeys.map((month) => ({
      month,
      ...monthly[month],
    }));
  }

  private buildReviewsMonthlySeries(
    reviews: Array<{ created_at?: string | null; rating?: number | null }>,
    months = 12,
  ) {
    const monthKeys = this.getLastNMonthKeys(months);
    const monthSet = new Set(monthKeys);

    const monthly: Record<string, { total: number; ratingSum: number; lowRatings: number }> = {};
    monthKeys.forEach((month) => {
      monthly[month] = {
        total: 0,
        ratingSum: 0,
        lowRatings: 0,
      };
    });

    reviews.forEach((review) => {
      const month = this.toMonthKey(review.created_at);
      if (!month || !monthSet.has(month)) return;

      monthly[month].total += 1;
      if (typeof review.rating === 'number') {
        monthly[month].ratingSum += review.rating;
        if (review.rating <= 2) {
          monthly[month].lowRatings += 1;
        }
      }
    });

    return monthKeys.map((month) => {
      const total = monthly[month].total;
      return {
        month,
        totalReviews: total,
        averageRating: total > 0 ? Number((monthly[month].ratingSum / total).toFixed(2)) : 0,
        lowRatings: monthly[month].lowRatings,
      };
    });
  }

  private countReturningPatients(rows: Array<{ patient_id?: string | null }>) {
    const patientVisits = new Map<string, number>();
    rows.forEach((row) => {
      if (!row.patient_id) return;
      patientVisits.set(row.patient_id, (patientVisits.get(row.patient_id) || 0) + 1);
    });

    let returningPatients = 0;
    patientVisits.forEach((count) => {
      if (count > 1) returningPatients += 1;
    });

    return returningPatients;
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

    const [appointmentsRes, prescriptionsRes, referredTestsRes, blogpostsRes, reviewsRes] = await Promise.all([
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
      supabase
        .from('appointment_reviews')
        .select('id, patient_id, rating, created_at')
        .eq('provider_id', workerId)
        .eq('provider_role', 'doctor')
        .order('created_at', { ascending: false }),
    ]);

    if (
      appointmentsRes.error ||
      prescriptionsRes.error ||
      referredTestsRes.error ||
      blogpostsRes.error ||
      reviewsRes.error
    ) {
      throw new InternalServerErrorException('Failed to build doctor report');
    }

    const appointments = appointmentsRes.data || [];
    const prescriptions = prescriptionsRes.data || [];
    const referredTests = referredTestsRes.data || [];
    const blogposts = blogpostsRes.data || [];
    const reviews = reviewsRes.data || [];

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
    const returningPatients = this.countReturningPatients(appointments);

    const referralsDismissed = referredTests.filter((r) => r.dismissed).length;
    const referralsPending = referredTests.length - referralsDismissed;
    const averageRating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((sum, item) => sum + (typeof item.rating === 'number' ? item.rating : 0), 0) /
              reviews.length
            ).toFixed(2),
          )
        : 0;
    const lowRatingReviews = reviews.filter((review) => typeof review.rating === 'number' && review.rating <= 2).length;

    const firstSeenByPatient = this.buildPatientFirstSeen(
      appointments.map((appointment) => ({
        patient_id: appointment.patient_id,
        created_at: appointment.created_at,
      })),
    );

    const newPatientsLast7Days = this.countNewPatientsInLastDays(firstSeenByPatient, 7);
    const newPatientsLast30Days = this.countNewPatientsInLastDays(firstSeenByPatient, 30);

    const monthlyAppointments = this.buildAppointmentsMonthlySeries(appointments, 12);
    const monthlyPrescriptions = this.buildSimpleMonthlySeries(
      prescriptions,
      {
        totalLabel: 'totalPrescriptions',
        statusLabels: {
          active: 'activePrescriptions',
          completed: 'completedPrescriptions',
          stopped: 'stoppedPrescriptions',
        },
      },
      12,
    );
    const monthlyReferrals = this.buildSimpleMonthlySeries(
      referredTests.map((ref) => ({
        ...ref,
        status: ref.dismissed ? 'dismissed' : 'pending',
      })),
      {
        totalLabel: 'totalReferrals',
        statusLabels: {
          dismissed: 'dismissedReferrals',
          pending: 'pendingReferrals',
        },
      },
      12,
    );
    const monthlyReviews = this.buildReviewsMonthlySeries(reviews, 12);
    const monthlyPatientGrowth = this.buildMonthlyPatientGrowth(firstSeenByPatient, 12);
    const dailyNewPatients = this.buildNewPatientsSeries(firstSeenByPatient, 7);

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
        totalReviews: reviews.length,
        averageRating,
        lowRatingReviews,
        returningPatients,
        newPatientsLast7Days,
        newPatientsLast30Days,
      },
      patientsOverview: {
        totalUniquePatients: activePatients,
        returningPatients,
        newPatientsLast7Days,
        newPatientsLast30Days,
      },
      analytics: {
        timeSeries: {
          appointmentsLast12Months: monthlyAppointments,
          prescriptionsLast12Months: monthlyPrescriptions,
          referralsLast12Months: monthlyReferrals,
          reviewsLast12Months: monthlyReviews,
        },
        patientTrends: {
          newPatientsLast7Days: dailyNewPatients,
          patientGrowthLast12Months: monthlyPatientGrowth,
        },
        quality: {
          averageRating,
          lowRatingReviews,
          lowRatingShare:
            reviews.length > 0 ? Number(((lowRatingReviews / reviews.length) * 100).toFixed(2)) : 0,
        },
      },
      recent: {
        appointments: appointments.slice(0, 10),
        prescriptions: prescriptions.slice(0, 10),
        referredTests: referredTests.slice(0, 10),
        blogPosts: blogposts.slice(0, 10),
        reviews: reviews.slice(0, 10),
      },
      detailed: {
        nextUpcomingAppointment,
      },
    };
  }

  private async getNutritionistReport(workerId: string) {
    const supabase = this.supabaseService.getClient();
    const today = new Date().toISOString().split('T')[0];

    const [appointmentsRes, dietPlansRes, reviewsRes] = await Promise.all([
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
      supabase
        .from('appointment_reviews')
        .select('id, patient_id, rating, created_at')
        .eq('provider_id', workerId)
        .eq('provider_role', 'nutritionist')
        .order('created_at', { ascending: false }),
    ]);

    if (appointmentsRes.error || dietPlansRes.error || reviewsRes.error) {
      throw new InternalServerErrorException('Failed to build nutritionist report');
    }

    const appointments = appointmentsRes.data || [];
    const dietPlans = dietPlansRes.data || [];
    const reviews = reviewsRes.data || [];

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
    const uniqueAppointmentPatients = new Set(appointments.map((a) => a.patient_id)).size;
    const uniquePatients = new Set([...appointments.map((a) => a.patient_id), ...dietPlans.map((d) => d.patient_id)]).size;
    const returningPatients = this.countReturningPatients(appointments);

    const averageRating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((sum, item) => sum + (typeof item.rating === 'number' ? item.rating : 0), 0) /
              reviews.length
            ).toFixed(2),
          )
        : 0;
    const lowRatingReviews = reviews.filter((review) => typeof review.rating === 'number' && review.rating <= 2).length;

    const firstSeenByPatient = this.buildPatientFirstSeen([
      ...appointments.map((appointment) => ({
        patient_id: appointment.patient_id,
        created_at: appointment.created_at,
      })),
      ...dietPlans.map((plan) => ({
        patient_id: plan.patient_id,
        created_at: plan.created_at,
      })),
    ]);

    const newPatientsLast7Days = this.countNewPatientsInLastDays(firstSeenByPatient, 7);
    const newPatientsLast30Days = this.countNewPatientsInLastDays(firstSeenByPatient, 30);

    const monthlyAppointments = this.buildAppointmentsMonthlySeries(appointments, 12);
    const monthlyDietPlans = this.buildSimpleMonthlySeries(
      dietPlans.map((plan) => ({
        created_at: plan.created_at,
        status:
          plan.start_date && plan.end_date && plan.start_date <= today && plan.end_date >= today
            ? 'active'
            : 'inactive',
      })),
      {
        totalLabel: 'totalDietPlans',
        statusLabels: {
          active: 'activeDietPlans',
          inactive: 'inactiveDietPlans',
        },
      },
      12,
    );
    const monthlyReviews = this.buildReviewsMonthlySeries(reviews, 12);
    const monthlyPatientGrowth = this.buildMonthlyPatientGrowth(firstSeenByPatient, 12);
    const dailyNewPatients = this.buildNewPatientsSeries(firstSeenByPatient, 7);

    return {
      metrics: {
        totalAppointments: appointments.length,
        completedAppointments,
        upcomingAppointments,
        cancelledAppointments,
        completionRate,
        totalDietPlans: dietPlans.length,
        activeDietPlans,
        uniquePatients,
        uniqueDietPlanPatients,
        uniqueAppointmentPatients,
        totalReviews: reviews.length,
        averageRating,
        lowRatingReviews,
        returningPatients,
        newPatientsLast7Days,
        newPatientsLast30Days,
      },
      patientsOverview: {
        totalUniquePatients: uniquePatients,
        returningPatients,
        newPatientsLast7Days,
        newPatientsLast30Days,
      },
      analytics: {
        timeSeries: {
          appointmentsLast12Months: monthlyAppointments,
          dietPlansLast12Months: monthlyDietPlans,
          reviewsLast12Months: monthlyReviews,
        },
        patientTrends: {
          newPatientsLast7Days: dailyNewPatients,
          patientGrowthLast12Months: monthlyPatientGrowth,
        },
        quality: {
          averageRating,
          lowRatingReviews,
          lowRatingShare:
            reviews.length > 0 ? Number(((lowRatingReviews / reviews.length) * 100).toFixed(2)) : 0,
        },
      },
      recent: {
        appointments: appointments.slice(0, 10),
        dietPlans: dietPlans.slice(0, 10),
        reviews: reviews.slice(0, 10),
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
    const returningPatients = this.countReturningPatients(bookings);
    const firstSeenByPatient = this.buildPatientFirstSeen(
      bookings.map((booking) => ({
        patient_id: booking.patient_id,
        created_at: booking.booked_at,
      })),
    );
    const newPatientsLast7Days = this.countNewPatientsInLastDays(firstSeenByPatient, 7);
    const newPatientsLast30Days = this.countNewPatientsInLastDays(firstSeenByPatient, 30);

    const monthlyLabBookings = this.buildSimpleMonthlySeries(
      bookings.map((booking) => ({
        created_at: booking.booked_at,
        status: booking.status,
      })),
      {
        totalLabel: 'totalLabBookings',
        statusLabels: {
          completed: 'completedBookings',
          pending: 'pendingBookings',
          cancelled: 'cancelledBookings',
        },
      },
      12,
    );
    const monthlyPatientGrowth = this.buildMonthlyPatientGrowth(firstSeenByPatient, 12);
    const dailyNewPatients = this.buildNewPatientsSeries(firstSeenByPatient, 7);

    return {
      metrics: {
        totalLabBookings: bookings.length,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        completionRate,
        uniquePatients,
        returningPatients,
        newPatientsLast7Days,
        newPatientsLast30Days,
      },
      patientsOverview: {
        totalUniquePatients: uniquePatients,
        returningPatients,
        newPatientsLast7Days,
        newPatientsLast30Days,
      },
      analytics: {
        timeSeries: {
          labTestsLast12Months: monthlyLabBookings,
        },
        patientTrends: {
          newPatientsLast7Days: dailyNewPatients,
          patientGrowthLast12Months: monthlyPatientGrowth,
        },
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

    if (typeof metrics.newPatientsLast7Days === 'number' && metrics.newPatientsLast7Days > 0) {
      insights.push(`${metrics.newPatientsLast7Days} new patient(s) were added in the last 7 days.`);
    }

    if (typeof metrics.averageRating === 'number' && metrics.averageRating > 0) {
      if (metrics.averageRating >= 4.5) {
        insights.push('Patient feedback trend is excellent based on recent ratings.');
      } else if (metrics.averageRating < 3.5) {
        insights.push('Patient feedback trend is below target and may need quality review.');
      }
    }

    if (insights.length === 0) {
      insights.push('Worker activity appears stable based on current records.');
    }

    return insights;
  }
}
