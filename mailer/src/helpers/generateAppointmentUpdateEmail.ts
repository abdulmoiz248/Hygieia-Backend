import { AppointmentUpdateDto } from "src/appointments/dto/appointment-update.dto";
import { formatEmailDate, COLORS, emailHeaderStyles, getHeaderWithLogo, getFooter } from "./utils";

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
        body { margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${COLORS.dark}; }
        .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
        .content{padding:30px 25px}
        h2{color:${COLORS.gray};margin-bottom:10px}
        .details p{margin:6px 0;font-size:15px}
        .instructions ul{padding-left:18px;margin:8px 0}
        .btn{display:inline-block;background:linear-gradient(135deg,${COLORS.primary},${COLORS.secondary});color:#ffffff !important;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:20px;font-weight:600}
        .highlight{background-color:#fff3cd;padding:2px 6px;border-radius:4px;font-weight:bold}
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
                    <p>Your appointment with <strong>Dr. ${doctor_name}</strong> has been updated.</p>

                    ${hasDateChange || hasTimeChange ? `
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto; border-radius:12px; background-color:#fff3cd; padding:15px; border-left:4px solid #f39c12; text-align:left;" class="details">
                      <tr><td><p style="margin:0; font-weight:bold; color:#856404;">⚠️ Schedule Changed</p></td></tr>
                      ${hasDateChange ? `<tr><td><p><strong>Previous Date:</strong> ${formatEmailDate(previous_date)}</p></td></tr><tr><td><p><strong>New Date:</strong> <span class="highlight">${formatEmailDate(appointment_date)}</span></p></td></tr>` : ''}
                      ${hasTimeChange ? `<tr><td><p><strong>Previous Time:</strong> ${previous_time}</p></td></tr><tr><td><p><strong>New Time:</strong> <span class="highlight">${appointment_time}</span></p></td></tr>` : ''}
                    </table>
                    ` : ''}

                    <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto; border-radius:12px; background-color:${COLORS.background}; padding:20px; border-left:4px solid ${COLORS.primary}; text-align:left;" class="details">
                      <tr><td><p><strong>Doctor:</strong> Dr. ${doctor_name}</p></td></tr>
                      <tr><td><p><strong>Date:</strong> ${formatEmailDate(appointment_date)}</p></td></tr>
                      <tr><td><p><strong>Time:</strong> ${appointment_time}</p></td></tr>
                      <tr><td><p><strong>Mode:</strong> ${appointment_mode}</p></td></tr>
                      <tr><td><p><strong>Email:</strong> ${patient_email}</p></td></tr>
                      ${appointment_link ? `<tr><td><p><strong>Join Link:</strong> <a href="${appointment_link}" style="color:${COLORS.primary};">${appointment_link}</a></p></td></tr>` : ''}
                    </table>

                    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
                      <tr>
                        <td style="background-color:#f5f5f5; border-radius:12px; padding:15px; text-align:left; line-height:1.5; color:${COLORS.gray};" class="instructions">
                          <p><strong>Important Reminders:</strong></p>
                          <ul>
                            ${hasDateChange || hasTimeChange ? '<li><strong>Please note the new schedule</strong> and update your calendar accordingly.</li>' : ''}
                            ${appointment_link ? '<li>Join the meeting <strong>5-10 minutes early</strong>.</li><li>Test your <strong>camera and microphone</strong> beforehand.</li><li>Ensure you\'re in a <strong>quiet, well-lit space</strong>.</li>' : '<li>Please arrive <strong>10 minutes early</strong> for check-in.</li><li>Follow all safety protocols at the facility.</li>'}
                            <li>If you need to reschedule, please contact us as soon as possible.</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    ${appointment_link ? `
                    <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:25px auto 0;">
                      <tr>
                        <td align="center" style="text-align:center;"><a href="${appointment_link}" class="btn">Join Appointment</a></td>
                      </tr>
                    </table>
                    ` : ''}
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
