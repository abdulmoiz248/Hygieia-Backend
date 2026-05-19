import { LabBookingConfirmationDto } from "src/labs/dtos/lab-booking-confirmation.dto";
import { formatEmailDate } from "./utils";

export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

export function generateLabTestConfirmationEmail(data: LabBookingConfirmationDto): string {
  const { booking_id, patient_name, patient_email, test_name, scheduled_date, scheduled_time, location } = data
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Hygieia Lab Test Confirmation</title>
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
        @media (max-width:480px){
          .content { padding:20px !important; }
          h2 { font-size:18px !important; }
          .details, .instructions { width:90% !important; }
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
                  <table width="100%" style="background:linear-gradient(90deg,#008396,#46bba5); color:white; text-align:center; padding:30px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" alt="Hygieia Logo" width="70" height="70" style="border-radius:50%; margin-bottom:10px;"/>
                        <h1 style="margin:0;">Your Lab Test Is Confirmed!</h1>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hey ${patient_name},</h2>
                        <p>Your lab test <strong>${test_name}</strong> has been successfully scheduled!</p>
                        <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto; border-radius:12px; background-color:#fbf9ea; padding:20px; border-left:4px solid #008396; text-align:left;" class="details">
                          <tr><td><p><strong>Booking ID:</strong> ${booking_id}</p></td></tr>
                          <tr><td><p><strong>Date:</strong> ${formatEmailDate(scheduled_date)}</p></td></tr>
                          <tr><td><p><strong>Time:</strong> ${scheduled_time}</p></td></tr>
                          <tr><td><p><strong>Email:</strong> ${patient_email}</p></td></tr>
                          <tr><td><p><strong>Location:</strong> ${location || "Not Provided"}</p></td></tr>
                        </table>

                        <table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                          <tr>
                            <td style="background-color:#f5f5f5; border-radius:12px; padding:15px; text-align:left; line-height:1.5; color:#17433b;" class="instructions">
                              <p><strong>Before your lab test:</strong></p>
                              <ul>
                                <li>Arrive at least <strong>10 minutes early</strong> for registration.</li>
                                <li>Carry your <strong>CNIC</strong> and any relevant medical documents.</li>
                                <li>If fasting is required, make sure you follow the fasting instructions.</li>
                                <li>Reach out to support if you need to reschedule.</li>
                              </ul>
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
