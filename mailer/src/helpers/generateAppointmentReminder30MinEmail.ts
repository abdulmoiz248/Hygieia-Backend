import { AppointmentDto } from "src/appointments/dto/appointment.dto";
import { formatEmailDate } from "./utils";

export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

export function generateAppointmentReminder30MinEmail(data: AppointmentDto): string {
  const { patient_name, doctor_name, appointment_date, appointment_time, appointment_link, appointment_mode } = data
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Hygieia Appointment Reminder</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        .details p{margin:6px 0;font-size:15px;}
        .instructions ul{padding-left:18px;margin:8px 0;}
        .btn{display:inline-block;background-color:#008396;color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:20px;}
        .btn:hover{background-color:#46bba5;}
        @media (max-width:480px){.content{padding:20px !important;}h2{font-size:18px !important;}.details,.instructions{width:90% !important;}.btn{width:100% !important;text-align:center !important;}}
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="#fbf9ea" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" valign="top">
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;text-align:center;">
            <tr><td style="padding:0;">
              <table width="100%" style="background:linear-gradient(90deg,#008396,#46bba5);color:white;text-align:center;padding:30px 20px;">
                <tr><td>
                  <img src="${HYGIEIA_LOGO}" alt="Hygieia Logo" width="70" height="70" style="border-radius:50%;margin-bottom:10px;"/>
                  <h1 style="margin:0;">Your Appointment Starts in 30 Minutes!</h1>
                </td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                <tr><td>
                  <h2>Hey ${patient_name},</h2>
                  <p>Just a friendly reminder — your appointment with <strong>Dr. ${doctor_name}</strong> starts in <strong>30 minutes</strong>.</p>
                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto;border-radius:12px;background-color:#fbf9ea;padding:20px;border-left:4px solid #008396;text-align:left;" class="details">
                    <tr><td><p><strong>Date:</strong> ${formatEmailDate(appointment_date)}</p></td></tr>
                    <tr><td><p><strong>Time:</strong> ${appointment_time}</p></td></tr>
                    <tr><td><p><strong>Mode:</strong> ${appointment_mode}</p></td></tr>
                    ${
                      appointment_link
                        ? `<tr><td><p><strong>Join Link:</strong> <a href="${appointment_link}" style="color:#008396;">${appointment_link}</a></p></td></tr>`
                        : ''
                    }
                  </table>
                  ${
                    appointment_link
                      ? `<a href="${appointment_link}" class="btn" style="color:#ffffff;">Join Appointment</a>`
                      : `<p style="margin-top:15px;">We’ll see you soon at the clinic! Please arrive on time.</p>`
                  }
                </td></tr>
              </table>
              <table width="100%" style="background-color:#17433b;text-align:center;padding:15px;">
                <tr><td style="color:white;font-size:13px;">© ${new Date().getFullYear()} Hygieia — From Past to Future</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`
}
