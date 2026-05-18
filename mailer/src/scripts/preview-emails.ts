import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { generateAppointmentCancellationEmail } from '../helpers/generateAppointmentCancellationEmail'
import { generateAppointmentConfirmationEmail } from '../helpers/generateAppointmentConfirmationEmail'
import { generateAppointmentReminder30MinEmail } from '../helpers/generateAppointmentReminder30MinEmail'
import { generateAppointmentReviewRequestEmail } from '../helpers/generateAppointmentReviewRequestEmail'
import { generateAppointmentReviewSubmittedEmail } from '../helpers/generateAppointmentReviewSubmittedEmail'
import { generateAppointmentTomorrowEmail } from '../helpers/generateAppointmentTomorrowEmail'
import { generateAppointmentUpdateEmail } from '../helpers/generateAppointmentUpdateEmail'
import { generateCvReceivedEmail } from '../helpers/generateCvReceivedEmail'
import { generateCvRejectedEmail } from '../helpers/generateCvRejectedEmail'
import { generateCvShortlistedEmail } from '../helpers/generateCvShortlistedEmail'
import { generateLabReportCompletionEmail } from '../helpers/generateLabReportCompletionEmail'
import { generateLabTestCancellationEmail } from '../helpers/generateLabTestCancellationEmail'
import { generateLabTestConfirmationEmail } from '../helpers/generateLabTestConfirmationEmail'
import { generateLabTestReminder30MinsEmail } from '../helpers/generateLabTestReminder30MinsEmail'
import { generateLabTestReminderTomorrowEmail } from '../helpers/generateLabTestReminderTomorrowEmail'
import { generateMedicineReminderEmail } from '../helpers/generateMedicineReminderEmail'
import { generateNewsletterSubscriptionEmail } from '../helpers/generateNewsletterSubscriptionEmail'
import { generateNutritionSummaryEmail } from '../helpers/generateNutritionSummaryEmail'
import { generateOtpVerificationEmail } from '../helpers/generateOtpVerificationEmail'
import { generatePasswordResetConfirmationEmail } from '../helpers/generatePasswordResetConfirmationEmail'
import { generatePasswordResetOtpEmail } from '../helpers/generatePasswordResetOtpEmail'
import { generateScanReportCompletionEmail } from '../helpers/generateScanReportCompletionEmail'
import { generateWelcomeEmail } from '../helpers/generateWelcomeEmail'
import { generateWorkerCredentialsEmail } from '../helpers/generateWorkerCredentialsEmail'
import { generateWorkerGoodbyeEmail } from '../helpers/generateWorkerGoodbyeEmail'
import { generateReportAcknowledgementEmail } from '../helpers/generateReportAcknowledgementEmail'
import { generateFeedbackFormEmail } from '../helpers/generateFeedbackFormEmail'

type PreviewItem = {
  category: string
  title: string
  description: string
  html: string
}

const outputDir = resolve(process.cwd(), 'email-preview')
const outputFile = resolve(outputDir, 'all-emails.html')

const appointmentBase = {
  appointment_id: 'APT-2026-0412',
  patient_id: 'PAT-1001',
  doctor_id: 'DOC-3007',
  patient_email: 'jane.doe@example.com',
  patient_name: 'Jane Doe',
  doctor_name: 'Ayesha Khan',
  appointment_date: '2026-05-12T00:00:00.000Z',
  appointment_time: '10:30 AM',
  appointment_mode: 'Online',
  appointment_link: 'https://meet.google.com/abc-defg-hij',
}

const appointmentUpdateSample = {
  ...appointmentBase,
  appointment_date: '2026-05-14T00:00:00.000Z',
  appointment_time: '11:15 AM',
  previous_date: '2026-05-12T00:00:00.000Z',
  previous_time: '10:30 AM',
}

const appointmentCancelSample = {
  ...appointmentBase,
  appointment_mode: 'In-Person',
  appointment_link: undefined,
  cancellation_date: '2026-05-04T09:15:00.000Z',
  cancellation_reason: 'scheduling',
  cancellation_notes: 'Patient requested a later slot due to travel.',
}

const reviewRequestSample = {
  appointment_id: 'APT-2026-0412',
  patient_id: 'PAT-1001',
  provider_id: 'DOC-3007',
  provider_role: 'doctor' as const,
  patient_email: 'jane.doe@example.com',
  patient_name: 'Jane Doe',
  provider_name: 'Ayesha Khan',
  appointment_date: '2026-05-12',
  appointment_time: '10:30 AM',
  review_link: 'https://hygieia-frontend.vercel.app/reviews/submit/APT-2026-0412',
  appointment_mode: 'Online',
}

const reviewSubmittedSample = {
  appointment_id: 'APT-2026-0412',
  patient_id: 'PAT-1001',
  provider_id: 'DOC-3007',
  provider_role: 'doctor' as const,
  patient_email: 'jane.doe@example.com',
  patient_name: 'Jane Doe',
  provider_name: 'Ayesha Khan',
  appointment_date: '2026-05-12',
  appointment_time: '10:30 AM',
  rating: 5,
  review_text: 'Very attentive, clear explanations, and helpful advice throughout the visit.',
  appointment_mode: 'Online',
}

const labConfirmationSample = {
  booking_id: 'LAB-88420',
  patient_id: 'PAT-1001',
  patient_email: 'jane.doe@example.com',
  patient_name: 'Jane Doe',
  test_name: 'Complete Blood Count',
  scheduled_date: '2026-05-15T00:00:00.000Z',
  scheduled_time: '09:00 AM',
  location: 'Hygieia Diagnostics, Main Branch',
  technician_id: 'TECH-41',
}

const labCancellationSample = {
  ...labConfirmationSample,
  cancellation_date: '2026-05-04T10:20:00.000Z',
}

const labReportSample = {
  booking_id: 'LAB-88420',
  patient_id: 'PAT-1001',
  patient_email: 'jane.doe@example.com',
  patient_name: 'Jane Doe',
  report_title: 'CBC Lab Report',
  report_url: 'https://hygieia-frontend.vercel.app/reports/lab/LAB-88420',
  test_name: 'Complete Blood Count',
}

const scanReportSample = {
  booking_id: 'SCAN-5102',
  patient_id: 'PAT-1001',
  patient_email: 'jane.doe@example.com',
  patient_name: 'Jane Doe',
  report_url: 'https://hygieia-frontend.vercel.app/reports/scan/SCAN-5102',
  test_name: 'Chest CT Scan',
}

const nutritionSummarySample = {
  patientName: 'Jane Doe',
  email: 'jane.doe@example.com',
  weekRange: {
    label: 'Week of Apr 28 – May 4, 2026',
    startDate: '2026-04-28',
    endDate: '2026-05-04',
  },
  weeklyStats: {
    totalSteps: 49280,
    avgStepsPerDay: 7040,
    bestDay: {
      date: 'Wednesday',
      steps: 10240,
    },
    totalEstimatedMiles: 24.8,
    avgDailyCaloriesBurned: 2280,
    avgDailyWaterIntake: 2.6,
    avgDailySleepHours: 7.4,
    avgDailyCaloriesIntake: 1865,
  },
  weekOverWeek: {
    stepsDelta: 1240,
    milesDelta: 0.8,
    caloriesBurnedDelta: 110,
    waterDelta: 0.2,
    sleepDelta: -0.3,
    caloriesIntakeDelta: -90,
  },
  dailyStats: [
    { date: '2026-04-28', dayLabel: 'Mon', steps: 6200, estimatedMiles: 3.1, caloriesBurned: 2110, caloriesIntake: 1880, waterIntake: 2.5, sleepHours: 7.1 },
    { date: '2026-04-29', dayLabel: 'Tue', steps: 7100, estimatedMiles: 3.5, caloriesBurned: 2190, caloriesIntake: 1820, waterIntake: 2.3, sleepHours: 7.6 },
    { date: '2026-04-30', dayLabel: 'Wed', steps: 10240, estimatedMiles: 5.1, caloriesBurned: 2450, caloriesIntake: 1900, waterIntake: 2.8, sleepHours: 7.8 },
    { date: '2026-05-01', dayLabel: 'Thu', steps: 6900, estimatedMiles: 3.4, caloriesBurned: 2230, caloriesIntake: 1800, waterIntake: 2.4, sleepHours: 7.0 },
    { date: '2026-05-02', dayLabel: 'Fri', steps: 8400, estimatedMiles: 4.2, caloriesBurned: 2300, caloriesIntake: 1840, waterIntake: 2.9, sleepHours: 7.2 },
    { date: '2026-05-03', dayLabel: 'Sat', steps: 6200, estimatedMiles: 3.1, caloriesBurned: 2100, caloriesIntake: 1910, waterIntake: 2.7, sleepHours: 7.3 },
    { date: '2026-05-04', dayLabel: 'Sun', steps: 6240, estimatedMiles: 3.4, caloriesBurned: 2190, caloriesIntake: 1870, waterIntake: 2.9, sleepHours: 7.8 },
  ],
}

const medicineReminderSample = {
  patientName: 'Jane Doe',
  email: 'jane.doe@example.com',
  medications: [
    { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily' },
    { name: 'Vitamin D3', dosage: '1000 IU', frequency: 'Once daily' },
    { name: 'Omega-3', dosage: '1 capsule', frequency: 'After dinner' },
  ],
  scheduledTime: '8:00 PM',
  reminderMessage: 'Take your evening medications with a glass of water after dinner.',
}

const items: PreviewItem[] = [
  { category: 'Auth', title: 'Welcome email', description: 'New user onboarding template.', html: generateWelcomeEmail('jane.doe@example.com', 'Jane Doe') },
  { category: 'Auth', title: 'OTP verification', description: 'Email verification code.', html: generateOtpVerificationEmail('jane.doe@example.com', '482913') },
  { category: 'Auth', title: 'Password reset', description: 'Password reset OTP email.', html: generatePasswordResetOtpEmail('jane.doe@example.com', '725198') },
  { category: 'Auth', title: 'Password reset success', description: 'Confirms a successful password reset.', html: generatePasswordResetConfirmationEmail('jane.doe@example.com') },
  { category: 'Auth', title: 'Newsletter signup', description: 'Subscription confirmation email.', html: generateNewsletterSubscriptionEmail('jane.doe@example.com') },
  { category: 'Careers', title: 'CV received', description: 'Acknowledges a submitted CV.', html: generateCvReceivedEmail() },
  { category: 'Careers', title: 'CV shortlisted', description: 'Positive application update.', html: generateCvShortlistedEmail('Jane Doe') },
  { category: 'Careers', title: 'CV rejected', description: 'Polite rejection email.', html: generateCvRejectedEmail('Jane Doe') },
  { category: 'Team', title: 'Worker credentials', description: 'Temporary login credentials for staff.', html: generateWorkerCredentialsEmail('jane.personal@example.com', 'jane.doe@hygieia.com', 'Temp#2026!', 'Jane Doe', 'doctor') },
  { category: 'Team', title: 'Worker goodbye', description: 'Offboarding / account removal email.', html: generateWorkerGoodbyeEmail('jane.personal@example.com', 'Jane Doe', 'doctor', 'jane.doe@hygieia.com') },
  { category: 'Appointments', title: 'Appointment confirmation', description: 'Online appointment confirmation.', html: generateAppointmentConfirmationEmail(appointmentBase as any) },
  { category: 'Appointments', title: 'Appointment reminder 30 min', description: 'Reminder before an online visit.', html: generateAppointmentReminder30MinEmail(appointmentBase as any) },
  { category: 'Appointments', title: 'Appointment tomorrow', description: 'Tomorrow reminder for a virtual visit.', html: generateAppointmentTomorrowEmail(appointmentBase as any) },
  { category: 'Appointments', title: 'Appointment update', description: 'Schedule change notice.', html: generateAppointmentUpdateEmail(appointmentUpdateSample as any) },
  { category: 'Appointments', title: 'Appointment cancellation', description: 'Cancelled appointment notice.', html: generateAppointmentCancellationEmail(appointmentCancelSample as any) },
  { category: 'Appointments', title: 'Review request', description: 'Ask the patient to rate the visit.', html: generateAppointmentReviewRequestEmail(reviewRequestSample as any) },
  { category: 'Appointments', title: 'Review submitted', description: 'Confirms the submitted review.', html: generateAppointmentReviewSubmittedEmail(reviewSubmittedSample as any) },
  { category: 'Labs', title: 'Lab confirmation', description: 'Booked test confirmation.', html: generateLabTestConfirmationEmail(labConfirmationSample as any) },
  { category: 'Labs', title: 'Lab reminder tomorrow', description: 'Tomorrow reminder for the test.', html: generateLabTestReminderTomorrowEmail(labConfirmationSample as any) },
  { category: 'Labs', title: 'Lab reminder 30 min', description: '30-minute reminder.', html: generateLabTestReminder30MinsEmail(labConfirmationSample as any) },
  { category: 'Labs', title: 'Lab cancellation', description: 'Cancelled lab booking notice.', html: generateLabTestCancellationEmail(labCancellationSample as any) },
  { category: 'Labs', title: 'Lab report completion', description: 'Report ready for download.', html: generateLabReportCompletionEmail(labReportSample as any) },
  { category: 'Labs', title: 'Scan report completion', description: 'Scan report ready for download.', html: generateScanReportCompletionEmail(scanReportSample as any) },
  { category: 'Wellness', title: 'Medicine reminder', description: 'Medication adherence reminder.', html: generateMedicineReminderEmail(medicineReminderSample) },
  { category: 'Wellness', title: 'Nutrition summary', description: 'Weekly fitness and nutrition digest.', html: generateNutritionSummaryEmail(nutritionSummarySample as any) },
  {
    category: 'Reports',
    title: 'Report acknowledgement',
    description: 'Confirms a patient report against a doctor/nutritionist has been received.',
    html: generateReportAcknowledgementEmail({
      patient_name: 'Jane Doe',
      reported_provider_role: 'doctor',
      report_id: 'c3d4e5f6-a1b2-7890-fedc-ba0987654321',
    }),
  },
  {
    category: 'Feedback',
    title: 'Feedback form invitation',
    description: 'Sent to patients when an admin creates a new feedback form.',
    html: generateFeedbackFormEmail({
      formId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      title: 'Patient Satisfaction Survey',
      description: 'Help us improve your experience on Hygieia. It takes less than 2 minutes.',
      expiryDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }),
  },
]

const galleryHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hygieia Email Preview Gallery</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f7fb;
        --card: #ffffff;
        --text: #0f172a;
        --muted: #64748b;
        --border: #dbe3ee;
        --brand: #008396;
        --brand2: #46bba5;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
        color: var(--text);
      }
      .hero {
        padding: 32px 24px 20px;
        background: linear-gradient(135deg, var(--brand) 0%, var(--brand2) 100%);
        color: white;
      }
      .hero h1 { margin: 0 0 8px; font-size: 32px; }
      .hero p { margin: 0; color: rgba(255,255,255,0.92); max-width: 900px; }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
        font-size: 14px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(8px);
      }
      .wrap { max-width: 1440px; margin: 0 auto; padding: 24px; }
      .grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      .card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        width: 100%;
      }
      .card-head {
        padding: 16px 18px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .card-head h2 { margin: 0 0 6px; font-size: 18px; }
      .card-head p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
      .tag {
        white-space: nowrap;
        padding: 6px 10px;
        border-radius: 999px;
        background: #eefaf7;
        color: #0f766e;
        font-weight: 700;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .frame {
        width: 100%;
        height: 1180px;
        border: 0;
        display: block;
        background: white;
      }
      .footer {
        color: var(--muted);
        text-align: center;
        font-size: 13px;
        padding: 28px 16px 48px;
      }
      @media (max-width: 640px) {
        .wrap { padding: 16px; }
        .hero h1 { font-size: 26px; }
        .card-head { flex-direction: column; }
        .frame { height: 980px; }
      }
    </style>
  </head>
  <body>
    <header class="hero">
      <div class="wrap">
        <h1>Hygieia Email Preview Gallery</h1>
        <p>All email templates from the mailer helpers folder rendered in one place for quick visual review.</p>
        <div class="meta">
          <div class="pill">Templates: ${items.length}</div>
          <div class="pill">Generated: ${new Date().toLocaleString()}</div>
          <div class="pill">Output: ${outputFile}</div>
        </div>
      </div>
    </header>

    <main class="wrap">
      <div class="grid">
        ${items
          .map((item) => {
            const encoded = Buffer.from(item.html, 'utf8').toString('base64')
            return `
              <section class="card">
                <div class="card-head">
                  <div>
                    <h2>${item.title}</h2>
                    <p>${item.description}</p>
                  </div>
                  <div class="tag">${item.category}</div>
                </div>
                <iframe class="frame" sandbox src="data:text/html;base64,${encoded}"></iframe>
              </section>
            `
          })
          .join('')}
      </div>
    </main>

    <div class="footer">
      Open this file in a browser to inspect the emails. Re-run the script whenever a template changes.
    </div>
  </body>
</html>`

mkdirSync(outputDir, { recursive: true })
writeFileSync(outputFile, galleryHtml, 'utf8')

console.log(`Email preview gallery written to: ${outputFile}`)
console.log(`Open the file in your browser to view all ${items.length} templates.`)