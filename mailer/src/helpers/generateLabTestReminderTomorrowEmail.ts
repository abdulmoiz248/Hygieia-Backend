import { LabBookingConfirmationDto } from "src/labs/dtos/lab-booking-confirmation.dto"
import { formatEmailDate } from "./utils"

export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

export function generateLabTestReminderTomorrowEmail(data: LabBookingConfirmationDto): string {
  const { booking_id, patient_name, patient_email, test_name, scheduled_date, scheduled_time, location } = data
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Hygieia Lab Test Reminder</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        .details p{margin:6px 0;font-size:15px;}
        @media(max-width:480px){
          .content{padding:20px !important;}
          h2{font-size:18px !important;}
        }
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="#fbf9ea" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;text-align:center;">
              <tr><td style="padding:0;">
                <table width="100%" style="background:linear-gradient(90deg,#008396,#46bba5);color:white;text-align:center;padding:30px 20px;">
                  <tr>
                    <td>
                      <img src="${HYGIEIA_LOGO}" width="70" height="70" style="border-radius:50%;margin-bottom:10px;"/>
                      <h1 style="margin:0;">Your Lab Test Is Tomorrow</h1>
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                  <tr><td>
                    <h2>Hey ${patient_name},</h2>
                    <p>This is a quick reminder that your lab test <strong>${test_name}</strong> is scheduled for tomorrow.</p>

                    <table style="margin:20px auto;border-radius:12px;background-color:#fbf9ea;padding:20px;border-left:4px solid #008396;text-align:left;" class="details">
                      <tr><td><p><strong>Booking ID:</strong> ${booking_id}</p></td></tr>
                      <tr><td><p><strong>Date:</strong> ${formatEmailDate(scheduled_date)}</p></td></tr>
                      <tr><td><p><strong>Time:</strong> ${scheduled_time}</p></td></tr>
                      <tr><td><p><strong>Email:</strong> ${patient_email}</p></td></tr>
                      <tr><td><p><strong>Location:</strong> ${location || "Not Provided"}</p></td></tr>
                    </table>

                    <p style="color:#17433b;line-height:1.5;"><strong>Don’t forget:</strong> arrive a bit early and follow any fasting instructions if required.</p>
                  </td></tr>
                </table>

                <table width="100%" style="background-color:#17433b;text-align:center;padding:15px;">
                  <tr><td style="color:white;font-size:13px;">© ${new Date().getFullYear()} Hygieia — From Past to Future</td></tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}

