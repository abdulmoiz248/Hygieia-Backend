import { COLORS, HYGIEIA_LOGO, emailHeaderStyles, getFooter, getHeaderWithLogo } from './utils'

export interface FeedbackFormEmailData {
  formId: string
  title: string
  description?: string
  expiryDate: string // ISO string
}

export function generateFeedbackFormEmail(data: FeedbackFormEmailData): string {
  const formLink = `https://hygieia-frontend.vercel.app/feedback/${data.formId}`
  const expiryFormatted = new Date(data.expiryDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${data.title} — Hygieia Feedback</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: ${COLORS.background};
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: ${COLORS.dark};
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
          .content { padding: 20px !important; }
          h2 { font-size: 18px !important; }
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
                  <div style="width:80px;height:80px;background:linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});border-radius:50%;display:flex;align-items:center;justify-content:center;margin:auto;box-shadow:0 6px 20px rgba(0,131,150,0.25);">
                    <span style="font-size:38px;">📋</span>
                  </div>
                </td>
              </tr>

              <!-- Title -->
              <tr>
                <td style="padding: 15px 40px 5px;" class="content">
                  <h2 style="font-size:22px;color:${COLORS.gray};margin:0 0 5px;">We'd love your feedback!</h2>
                  <p style="color:${COLORS.textMuted};font-size:14px;margin:0 0 20px;">Your opinion helps us improve Hygieia for everyone</p>
                </td>
              </tr>

              <!-- Form info card -->
              <tr>
                <td style="padding: 0 40px 20px;" class="content">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.background};border-radius:16px;border-left:4px solid ${COLORS.secondary};padding:24px;text-align:left;">
                    <tr>
                      <td>
                        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:${COLORS.primary};">${data.title}</p>
                        ${data.description ? `<p style="font-size:15px;line-height:1.7;color:${COLORS.textDark};margin:0 0 16px;">${data.description}</p>` : ''}
                        <p style="font-size:13px;color:${COLORS.textMuted};margin:0;">
                          ⏰ &nbsp;This form expires on <strong style="color:${COLORS.accent};">${expiryFormatted}</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- How it works -->
              <tr>
                <td style="padding: 0 40px 20px;" class="content">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-radius:16px;padding:24px;text-align:left;">
                    <tr>
                      <td>
                        <p style="margin:0 0 12px;font-weight:700;color:${COLORS.gray};font-size:15px;">How it works</p>
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">1.</span>
                              Click the button below to open the form
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">2.</span>
                              Enter your email address to get started
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">3.</span>
                              Answer a few quick questions — it only takes a minute!
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:6px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">4.</span>
                              Share your thoughts on Hygieia and help us grow
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td style="padding: 10px 40px 30px; text-align:center;" class="content">
                  <a href="${formLink}" class="btn">Fill Out the Form</a>
                  <p style="font-size:12px;color:${COLORS.textMuted};margin:16px 0 0;">
                    Or copy this link: <a href="${formLink}" style="color:${COLORS.primary};word-break:break-all;">${formLink}</a>
                  </p>
                </td>
              </tr>

              <!-- Privacy note -->
              <tr>
                <td style="padding: 0 40px 30px;" class="content">
                  <p style="font-size:13px;line-height:1.6;color:${COLORS.textMuted};margin:0;text-align:left;border-top:1px solid ${COLORS.lightGray};padding-top:20px;">
                    🔒 &nbsp;Your responses are kept confidential. No login required — just enter your email on the form. If you have questions, contact us at <a href="mailto:support@hygieia.com" style="color:${COLORS.primary};text-decoration:none;">support@hygieia.com</a>.
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
