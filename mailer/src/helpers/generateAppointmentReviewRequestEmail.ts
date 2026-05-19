import { AppointmentReviewRequestDto } from 'src/appointments/dto/appointment-review-request.dto'
import { HYGIEIA_LOGO, formatEmailDate } from './utils'

export function generateAppointmentReviewRequestEmail(data: AppointmentReviewRequestDto): string {
  const providerTitle = data.provider_role === 'nutritionist' ? 'Nutritionist' : 'Doctor'

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Share Your Appointment Review</title>
      <style>
        body { margin:0; padding:0; background-color:#fbf9ea; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#001016; }
        .btn { display:inline-block; background:#008396; color:#fff !important; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; }
        .card { margin:20px auto; border-radius:12px; background:#fbf9ea; padding:16px; border-left:4px solid #008396; text-align:left; }
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="#fbf9ea" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">
              <tr>
                <td style="padding:0;">
                  <table width="100%" style="background:linear-gradient(90deg,#008396,#46bba5);color:#fff;text-align:center;padding:28px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" alt="Hygieia Logo" width="70" height="70" style="border-radius:50%; margin-bottom:10px;"/>
                        <h1 style="margin:0;">How Was Your Appointment?</h1>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:28px 24px; text-align:center;">
                    <tr>
                      <td>
                        <p style="margin:0 0 14px;">Hi ${data.patient_name}, your appointment has been marked as completed.</p>
                        <p style="margin:0 0 14px;">Please share your feedback for ${providerTitle} <strong>${data.provider_name}</strong>.</p>

                        <table class="card" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr><td><p style="margin:0 0 8px;"><strong>Date:</strong> ${formatEmailDate(data.appointment_date)}</p></td></tr>
                          <tr><td><p style="margin:0 0 8px;"><strong>Time:</strong> ${data.appointment_time}</p></td></tr>
                          <tr><td><p style="margin:0;"><strong>Mode:</strong> ${data.appointment_mode || 'N/A'}</p></td></tr>
                        </table>

                        <a href="${data.review_link}" class="btn">Rate Your Appointment</a>
                        <p style="font-size:12px; color:#6b7280; margin-top:18px;">Each appointment can be reviewed only once.</p>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" style="background:#17433b;text-align:center;padding:14px;">
                    <tr><td style="color:#fff;font-size:13px;">© ${new Date().getFullYear()} Hygieia</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}
