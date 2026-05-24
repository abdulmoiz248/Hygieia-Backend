import { AppointmentCancellationDto } from "src/appointments/dto/appointment-cancellation.dto";
import { formatEmailDate } from "./utils";

export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

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
        body {
          margin: 0;
          padding: 0;
          background-color: #fbf9ea;
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #001016;
        }
        h2 {
          color: #17433b;
          margin-bottom: 10px;
        }
        .details p {
          margin: 6px 0;
          font-size: 15px;
        }
        .instructions ul {
          padding-left: 18px;
          margin: 8px 0;
        }
        .btn {
          display: inline-block;
          background-color: #c94141;
          color: #ffffff !important;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          margin-top: 20px;
          font-weight: 600;
        }
        .btn:hover {
          background-color: #b53636;
        }
        @media (max-width:480px){
          .content { padding:20px !important; }
          h2 { font-size:18px !important; }
          .details, .instructions { width:90% !important; }
          .btn { width:100% !important; text-align:center !important; }
        }
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="#fbf9ea" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden; text-align:center;">
              <tr>
                <td style="padding:0;">
                  <table width="100%" style="background:linear-gradient(90deg,#c94141,#e57373); color:white; text-align:center; padding:30px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" alt="Hygieia Logo" width="70" height="70" style="border-radius:50%; margin-bottom:10px;"/>
                        <h1 style="margin:0;">Appointment Cancelled</h1>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hey ${patient_name},</h2>
                        <p>Your appointment with <strong>Dr. ${doctor_name}</strong> has been successfully cancelled.</p>
                        <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto; border-radius:12px; background-color:#fbf9ea; padding:20px; border-left:4px solid #c94141; text-align:left;" class="details">
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
                            <td style="background-color:#f5f5f5; border-radius:12px; padding:15px; text-align:left; line-height:1.5; color:#17433b;" class="instructions">
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
                              <a href="https://hygieia-frontend.vercel.app/appointments" class="btn" style="color:#ffffff;">Book New Appointment</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" style="background-color:#17433b; text-align:center; padding:15px;">
                    <tr>
                      <td style="color:white; font-size:13px;">
                        © ${new Date().getFullYear()} Hygieia — From Past to Future
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}
