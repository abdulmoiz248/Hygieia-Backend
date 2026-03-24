import { HYGIEIA_LOGO, COLORS, getFooter } from './utils'

interface Medication {
  name: string
  dosage: string
  frequency: string
  medicationId?: string
}

interface MedicineReminderData {
  patientName: string
  email: string
  medications: Medication[]
  scheduledTime: string
  reminderMessage?: string
}

export function generateMedicineReminderEmail(data: MedicineReminderData): string {
  const { patientName, email, medications, scheduledTime, reminderMessage } = data

  const medicationsList = medications
    .map((med) => `<li style="margin: 8px 0; color: #17433b;">${med.name} - ${med.dosage} (${med.frequency})</li>`)
    .join('')

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Medicine Reminder - Hygieia</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: ${COLORS.background};
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: ${COLORS.dark};
        }
        h1 { color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 1px; }
        h2 { color: ${COLORS.gray}; margin: 0 0 12px; font-size: 24px; font-weight: 700; }
        h3 { color: ${COLORS.gray}; margin: 20px 0 12px; font-size: 18px; font-weight: 600; }
        p { font-size: 15px; line-height: 1.6; margin: 8px 0; color: ${COLORS.textDark}; }
        .alert-box {
          background: linear-gradient(135deg, #fef08a 0%, #fde047 100%);
          border: 2px solid #fbbf24;
          border-radius: 12px;
          padding: 16px;
          margin: 15px 0;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .alert-icon { font-size: 32px; flex-shrink: 0; min-width: 32px; }
        .medication-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f7f4 100%);
          border: 2px solid ${COLORS.primary};
          border-radius: 12px;
          padding: 18px;
          margin: 15px 0;
        }
        .medication-card h3 { margin: 0 0 12px; font-size: 16px; }
        .medication-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .medication-list li {
          padding: 10px 0;
          border-bottom: 1px solid ${COLORS.lightGray};
          color: ${COLORS.textDark};
          font-size: 14px;
        }
        .medication-list li:last-child { border-bottom: none; }
        .time-card {
          background: linear-gradient(135deg, #e0f7f4 0%, #f0f9ff 100%);
          border: 2px solid ${COLORS.secondary};
          border-radius: 12px;
          padding: 18px;
          margin: 15px 0;
          text-align: center;
        }
        .time-card .time { font-size: 36px; font-weight: 700; color: ${COLORS.primary}; margin: 12px 0; }
        .time-card p { margin: 6px 0; color: ${COLORS.textMuted}; }
        .tip-card { background: #eff6ff; border-left: 4px solid ${COLORS.primary}; padding: 16px; margin: 15px 0; border-radius: 6px; }
        .info-card {
          background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%);
          border: 2px solid #fbbf24;
          border-radius: 12px;
          padding: 16px;
          margin: 15px 0;
        }
        .info-card ul { margin: 8px 0; padding-left: 20px; color: #92400e; font-size: 14px; }
        .info-card li { margin: 6px 0; }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
          color: white !important;
          padding: 14px 38px;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 20px;
          font-size: 15px;
          border: none;
          cursor: pointer;
        }
        .footer { background: ${COLORS.background}; border-top: 1px solid ${COLORS.lightGray}; padding: 25px; text-align: center; font-size: 12px; }
        .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
        .header { background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary}); color: white; text-align: center; padding: 45px 30px; }
        .content { padding: 35px 30px; }
        @media(max-width: 600px) {
          .container { margin: 0 !important; border-radius: 0 !important; }
          .header { padding: 30px 20px !important; }
          .content { padding: 20px !important; }
          .alert-box { flex-direction: column; }
          .time-card .time { font-size: 28px; }
          h2 { font-size: 20px !important; }
          h3 { font-size: 16px !important; }
        }
      </style>
    </head>
    <body>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${COLORS.background};">
        <tr>
          <td align="center" valign="top" style="padding: 20px 0;">
            <div class="container">
              <div class="header">
                <img src="${HYGIEIA_LOGO}" alt="Hygieia Logo" style="width: 90px; height: 90px; border-radius: 50%; margin-bottom: 15px; object-fit: contain;"/>
                <h1>💊 Medicine Reminder</h1>
                <p style="margin: 12px 0 0; font-size: 16px; opacity: 0.95;">Time to take your medications</p>
              </div>

              <div class="content">
                <h2>Hi ${patientName},</h2>

                <div class="alert-box">
                  <div class="alert-icon">⏰</div>
                  <div style="flex: 1;">
                    <p style="margin: 0; font-weight: 700; color: #854d0e; font-size: 16px;">It's time to take your medicines!</p>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #92400e;">
                      ${reminderMessage || 'This is a reminder to take your scheduled medications on time.'}
                    </p>
                  </div>
                </div>

                <div class="time-card">
                  <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600;">Scheduled Time</p>
                  <div class="time">${scheduledTime}</div>
                  <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 13px;">Don't miss this dose!</p>
                </div>

                <h3 style="color: ${COLORS.gray}; margin-top: 25px;">📋 Your Medications</h3>
                <div class="medication-card">
                  <h3 style="margin: 0 0 12px; font-size: 16px; color: ${COLORS.primary};">✓ Take These Medications:</h3>
                  <ul class="medication-list">
                    ${medicationsList}
                  </ul>
                </div>

                <div class="tip-card">
                  <p style="margin: 0; font-weight: 700; color: ${COLORS.primary}; margin-bottom: 6px;">💡 Tip:</p>
                  <p style="margin: 0; font-size: 14px;">
                    Take your medicines with food or as advised by your doctor. Consistency helps you get better results!
                  </p>
                </div>

                <div class="info-card">
                  <p style="margin: 0; margin-bottom: 10px; font-weight: 700; font-size: 15px; color: #92400e;">⚠️ Important Reminders</p>
                  <ul style="margin: 0; padding-left: 18px;">
                    <li>Keep medications stored in a cool, dry place</li>
                    <li>Never skip doses without consulting your doctor</li>
                    <li>Track your adherence in the app for better health outcomes</li>
                  </ul>
                </div>

                <div style="text-align: center;">
                  <a href="https://hygieia-frontend.vercel.app/medications" class="btn">Log Your Dose in App</a>
                </div>

                <p style="margin-top: 25px; color: ${COLORS.textMuted}; font-size: 14px; text-align: center;">
                  If you have any questions about your medications, please contact your healthcare provider.
                </p>
              </div>

              <div class="footer">
                <p style="margin: 0; margin-bottom: 8px; font-weight: 500;">© ${new Date().getFullYear()} Hygieia Healthcare</p>
                <p style="margin: 0; font-size: 11px; opacity: 0.8;">
                  This reminder was sent to ${email} | <a href="https://hygieia-frontend.vercel.app/settings" style="color: ${COLORS.primary}; text-decoration: none;">Manage Preferences</a>
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}
