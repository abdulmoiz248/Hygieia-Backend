import {
  COLORS,
  HYGIEIA_LOGO,
  emailHeaderStyles,
  getFooter,
  getHeaderWithLogo,
} from './utils'

export interface ReportAcknowledgementData {
  patient_name: string
  reported_provider_role: 'doctor' | 'nutritionist'
  report_id: string
}

export function generateReportAcknowledgementEmail(data: ReportAcknowledgementData): string {
  const providerLabel = data.reported_provider_role === 'nutritionist' ? 'nutritionist' : 'doctor'
  const currentYear = new Date().getFullYear()

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Hygieia — Report Acknowledgement</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: ${COLORS.background};
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: ${COLORS.dark};
        }
        h2 {
          color: ${COLORS.gray};
          margin-bottom: 10px;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
          color: #ffffff !important;
          padding: 14px 38px;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 600;
          letter-spacing: 0.4px;
          margin-top: 20px;
        }
        @media (max-width:480px){
          .content { padding:20px !important; }
          h2 { font-size:18px !important; }
        }
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="${COLORS.background}" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top" style="padding: 30px 10px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:20px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden; text-align:center;">
              <!-- Header -->
              <tr>
                <td style="${emailHeaderStyles}">
                  ${getHeaderWithLogo()}
                </td>
              </tr>

              <!-- Icon -->
              <tr>
                <td style="padding: 35px 30px 10px;">
                  <div style="width:80px;height:80px;background:linear-gradient(135deg, ${COLORS.accent}, #ff6b9d);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:auto;box-shadow:0 6px 20px rgba(255,28,108,0.25);">
                    <span style="font-size:38px;">🛡️</span>
                  </div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 20px 40px 10px;" class="content">
                  <h2 style="font-size:22px;color:${COLORS.gray};margin:0 0 5px;">We Hear You, ${data.patient_name}</h2>
                </td>
              </tr>

              <tr>
                <td style="padding: 0 40px 20px;" class="content">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.background};border-radius:16px;border-left:4px solid ${COLORS.accent};padding:24px;text-align:left;">
                    <tr>
                      <td>
                        <p style="font-size:15px;line-height:1.7;color:${COLORS.textDark};margin:0;">
                          We are <strong>very sorry</strong> to hear about your experience with your ${providerLabel}. Your trust in Hygieia is extremely important to us, and we take every report seriously.
                        </p>
                        <p style="font-size:15px;line-height:1.7;color:${COLORS.textDark};margin:16px 0 0;">
                          Our administration team is now <strong>actively investigating</strong> this matter. We will take all necessary steps to ensure the highest standards of care and professionalism within our platform.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- What happens next -->
              <tr>
                <td style="padding: 0 40px 20px;" class="content">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-radius:16px;padding:24px;text-align:left;">
                    <tr>
                      <td>
                        <p style="margin:0 0 12px;font-weight:700;color:${COLORS.gray};font-size:15px;">What happens next?</p>
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">1.</span>
                              Our team reviews the report and any evidence provided
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">2.</span>
                              Appropriate action is taken against the provider if warranted
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">3.</span>
                              Your identity remains <strong>completely confidential</strong> throughout
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Reference -->
              <tr>
                <td style="padding: 0 40px 25px;" class="content">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;border-radius:12px;padding:16px;text-align:center;">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:12px;color:${COLORS.textMuted};">Your Report Has Been Recorded</p>
                        <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${COLORS.primary};">✓</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Closing message -->
              <tr>
                <td style="padding: 0 40px 30px;" class="content">
                  <p style="font-size:14px;line-height:1.6;color:${COLORS.textDark};margin:0;text-align:left;">
                    Thank you for helping us maintain the quality and safety of our platform. If you have any additional information to share, please don't hesitate to contact our support team.
                  </p>
                  <p style="font-size:14px;color:${COLORS.textDark};margin:16px 0 0;text-align:left;">
                    Warm regards,<br/>
                    <strong style="color:${COLORS.primary};">The Hygieia Team</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              ${getFooter()}
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}
