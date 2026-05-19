import { AppointmentUpdateDto } from "src/appointments/dto/appointment-update.dto";
import { formatEmailDate } from "./utils";

export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

export function generateAppointmentUpdateEmail(data: AppointmentUpdateDto): string {
  const { patient_name, doctor_name, appointment_date, appointment_time, patient_email, appointment_mode, appointment_link, previous_date, previous_time, appointment_id } = data;
  
  const hasDateChange = previous_date && previous_date !== appointment_date;
  const hasTimeChange = previous_time && previous_time !== appointment_time;
  
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Hygieia Appointment Update</title>
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
          background-color: #008396;
          color: #ffffff !important;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          margin-top: 20px;
        }
        .btn:hover {
          background-color: #46bba5;
        }
        .highlight {
          background-color: #fff3cd;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: bold;
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
                  <table width="100%" style="background:linear-gradient(90deg,#f39c12,#f9a825); color:white; text-align:center; padding:30px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" alt="Hygieia Logo" width="70" height="70" style="border-radius:50%; margin-bottom:10px;"/>
                        <h1 style="margin:0;">Appointment Updated</h1>
                      </td>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hey ${patient_name},</h2>
                        <p>Your appointment with <strong>Dr. ${doctor_name}</strong> has been updated.</p>
                        
                        ${hasDateChange || hasTimeChange ? `
                        <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto; border-radius:12px; background-color:#fff3cd; padding:15px; border-left:4px solid #f39c12; text-align:left;" class="details">
                          <tr><td><p style="margin:0; font-weight:bold; color:#856404;">⚠️ Schedule Changed</p></td></tr>
                          ${hasDateChange ? `
                          <tr><td><p><strong>Previous Date:</strong> ${formatEmailDate(previous_date)}</p></td></tr>
                          <tr><td><p><strong>New Date:</strong> <span class="highlight">${formatEmailDate(appointment_date)}</span></p></td></tr>
                          ` : ''}
                          ${hasTimeChange ? `
                          <tr><td><p><strong>Previous Time:</strong> ${previous_time}</p></td></tr>
                          <tr><td><p><strong>New Time:</strong> <span class="highlight">${appointment_time}</span></p></td></tr>
                          ` : ''}
                        </table>
                        ` : ''}
                        
                        <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto; border-radius:12px; background-color:#fbf9ea; padding:20px; border-left:4px solid #008396; text-align:left;" class="details">
                          <tr><td><p><strong>Doctor:</strong> Dr. ${doctor_name}</p></td></tr>
                          <tr><td><p><strong>Date:</strong> ${formatEmailDate(appointment_date)}</p></td></tr>
                          <tr><td><p><strong>Time:</strong> ${appointment_time}</p></td></tr>
                          <tr><td><p><strong>Mode:</strong> ${appointment_mode}</p></td></tr>
                          <tr><td><p><strong>Email:</strong> ${patient_email}</p></td></tr>
                          ${
                            appointment_link
                              ? `<tr><td><p><strong>Join Link:</strong> <a href="${appointment_link}" style="color:#008396;">${appointment_link}</a></p></td></tr>`
                              : ''
                          }
                        </table>

                        <table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                          <tr>
                            <td style="background-color:#f5f5f5; border-radius:12px; padding:15px; text-align:left; line-height:1.5; color:#17433b;" class="instructions">
                              <p><strong>Important Reminders:</strong></p>
                              <ul>
                                ${hasDateChange || hasTimeChange ? '<li><strong>Please note the new schedule</strong> and update your calendar accordingly.</li>' : ''}
                                ${appointment_link ? `
                                <li>Join the meeting <strong>5-10 minutes early</strong>.</li>
                                <li>Test your <strong>camera and microphone</strong> beforehand.</li>
                                <li>Ensure you're in a <strong>quiet, well-lit space</strong>.</li>
                                ` : `
                                <li>Please arrive <strong>10 minutes early</strong> for check-in.</li>
                                <li>Follow all safety protocols at the facility.</li>
                                `}
                                <li>If you need to reschedule, please contact us as soon as possible.</li>
                              </ul>
                            </td>
                          </tr>
                        </table>

                        ${appointment_link ? `
                        <table cellpadding="0" cellspacing="0" border="0" style="margin-top:25px;">
                          <tr>
                            <td style="text-align:center;">
                              <a href="${appointment_link}" class="btn" style="color:#ffffff;">Join Appointment</a>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
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
