import { AppointmentReviewSubmittedDto } from 'src/appointments/dto/appointment-review-submitted.dto'
import { HYGIEIA_LOGO } from './utils'

function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

export function generateAppointmentReviewSubmittedEmail(data: AppointmentReviewSubmittedDto): string {
  const providerTitle = data.provider_role === 'nutritionist' ? 'Nutritionist' : 'Doctor'

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Your Review Was Submitted</title>
      <style>
        body { margin:0; padding:0; background-color:#fbf9ea; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#001016; }
        .card { margin:20px auto; border-radius:12px; background:#fbf9ea; padding:16px; border-left:4px solid #008396; text-align:left; }
        .stars { font-size:22px; color:#f59e0b; letter-spacing:2px; }
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
                        <h1 style="margin:0;">Review Received</h1>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:28px 24px; text-align:center;">
                    <tr>
                      <td>
                        <p style="margin:0 0 14px;">Hi ${data.patient_name}, thanks for sharing your feedback.</p>
                        <p style="margin:0 0 14px;">Here is a copy of your review for ${providerTitle} <strong>${data.provider_name}</strong>.</p>

                        <table class="card" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr><td><p style="margin:0 0 8px;"><strong>Appointment:</strong> ${data.appointment_date} at ${data.appointment_time}</p></td></tr>
                          <tr><td><p style="margin:0 0 8px;"><strong>Rating:</strong> <span class="stars">${renderStars(data.rating)}</span> (${data.rating}/5)</p></td></tr>
                          <tr><td><p style="margin:0;"><strong>Your Review:</strong> ${data.review_text}</p></td></tr>
                        </table>
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
