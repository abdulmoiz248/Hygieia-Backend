import { AppointmentCancellationDto } from "src/appointments/dto/appointment-cancellation.dto";
import { formatEmailDate, COLORS, emailHeaderStyles, getHeaderWithLogo, getFooter } from "./utils";

// Map reason codes to display labels
const REASON_LABELS: Record<string, string> = {
  'emergency': 'Personal Emergency',
  'scheduling': 'Scheduling Conflict',
  'patient-request': 'Patient Requested',
  'unavailable': 'Unavailable at Scheduled Time',
  'other': 'Other',
}

export function generateAppointmentCancellationEmail(data: AppointmentCancellationDto): string {
  const { patient_name, doctor_name, appointment_date, appointment_time, patient_email, appointment_mode, cancellation_date, appointment_id, cancellation_reason, cancellation_notes } = data;
  
  // Get display label for reason
  const reasonDisplay = cancellation_reason ? (REASON_LABELS[cancellation_reason] || cancellation_reason) : 'Not specified';
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Hygieia Appointment Cancellation</title>
      <style>
        body{margin:0;padding:0;background-color:${COLORS.background};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.dark};}
        .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
        .content{padding:30px 25px}
        h2{color:${COLORS.gray};margin-bottom:10px}
        .details p{margin:6px 0;font-size:15px}
        .instructions ul{padding-left:18px;margin:8px 0}
        .btn{display:inline-block;background:linear-gradient(135deg,${COLORS.primary},${COLORS.secondary});color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:20px;font-weight:600}
        @media (max-width:480px){.content{padding:20px !important}h2{font-size:18px !important}.details,.instructions{width:90% !important}.btn{width:100% !important;text-align:center !important}}
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="${COLORS.background}" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top">
            <div class="container">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="${emailHeaderStyles}">${getHeaderWithLogo()}</td>
                </tr>
                <tr>
                  <td class="content" style="text-align:left">
                    <h2>Hey ${patient_name},</h2>
                    <p>Your appointment with <strong>Dr. ${doctor_name}</strong> has been successfully cancelled.</p>
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto; border-radius:12px; background-color:${COLORS.background}; padding:20px; border-left:4px solid #c94141; text-align:left;" class="details">
                      <tr><td><p><strong>Doctor:</strong> Dr. ${doctor_name}</p></td></tr>
                      <tr><td><p><strong>Originally Scheduled Date:</strong> ${formatEmailDate(appointment_date)}</p></td></tr>
                      <tr><td><p><strong>Originally Scheduled Time:</strong> ${appointment_time}</p></td></tr>
                      <tr><td><p><strong>Mode:</strong> ${appointment_mode}</p></td></tr>
                      <tr><td><p><strong>Cancellation Date:</strong> ${formatEmailDate(cancellation_date)}</p></td></tr>
                      <tr><td><p><strong>Reason:</strong> ${reasonDisplay}</p></td></tr>
                      ${cancellation_notes ? `<tr><td><p><strong>Additional Notes:</strong> ${cancellation_notes}</p></td></tr>` : ''}
                      <tr><td><p><strong>Email:</strong> ${patient_email}</p></td></tr>
                    </table>

                    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                      <tr>
                        <td style="background-color:#f5f5f5; border-radius:12px; padding:15px; text-align:left; line-height:1.5; color:${COLORS.gray};" class="instructions">
                          <p><strong>What's next?</strong></p>
                          <ul>
                            <li>If you cancelled by mistake, you can <strong>book a new appointment</strong> through our platform.</li>
                            <li>To reschedule, please select a new time slot at your convenience.</li>
                            <li>Any prepayment will be processed for refund according to our cancellation policy.</li>
                            <li>If you have any questions, please contact our support team.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:25px auto 0;">
                      <tr>
                        <td align="center" style="text-align:center;">
                          <p style="color:#666; font-size:14px; margin-bottom:10px;">Need help or want to book again?</p>
                          <a href="https://hygieia-frontend.vercel.app/appointments" class="btn">Book New Appointment</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${getFooter()}
              </table>
            </div>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}
