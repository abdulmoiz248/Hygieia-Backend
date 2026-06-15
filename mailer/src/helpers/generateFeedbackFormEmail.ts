import { COLORS, emailHeaderStyles, getFooter, getHeaderWithLogo } from './utils'

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
        .form-title { display:block; background: white; border-radius:10px; padding:10px 14px; color:${COLORS.primary}; font-weight:700; font-size:18px; }
        .form-card { background-color:${COLORS.background};border-radius:16px;border-left:4px solid ${COLORS.secondary};padding:0;margin:0; }
        .form-card-inner { padding:20px 24px; }
        @media (max-width:480px){
          .content { padding: 20px !important; }
        }
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="${COLORS.background}" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top" style="padding:30px 10px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;">

              <!-- Header -->
              <tr>
                <td align="center" style="${emailHeaderStyles}">
                  ${getHeaderWithLogo()}
                </td>
              </tr>

              <!-- Icon -->
              <tr>
                <td align="center" style="padding:35px 30px 10px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" valign="middle" width="80" height="80"
                        style="width:80px;height:80px;background:linear-gradient(135deg,${COLORS.primary},${COLORS.secondary});border-radius:50%;box-shadow:0 6px 20px rgba(0,131,150,0.25);">
                        <span style="font-size:36px;line-height:80px;">&#x1F4CB;</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Title block -->
              <tr>
                <td align="center" style="padding:15px 40px 5px;" class="content">
                  <h2 style="font-size:22px;font-weight:700;color:${COLORS.gray};margin:0 0 6px;">We'd love your feedback!</h2>
                  <p style="font-size:14px;color:${COLORS.textMuted};margin:0 0 20px;">Your opinion helps us improve Hygieia for everyone</p>
                </td>
              </tr>

              <!-- Form info card -->
              <tr>
                <td style="padding:0 40px 20px;" class="content">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="form-card">
                    <tr>
                      <td class="form-card-inner">
                        <span class="form-title">${data.title}</span>
                        ${data.description ? `<p style="font-size:15px;line-height:1.7;color:${COLORS.textDark};margin:12px 0 12px;">${data.description}</p>` : ''}
                        <p style="font-size:13px;color:${COLORS.textMuted};margin:0;">&#x23F0;&nbsp; This form expires on <strong style="color:${COLORS.accent};">${expiryFormatted}</strong></p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- How it works -->
              <tr>
                <td style="padding:0 40px 20px;" class="content">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#f0fdf4;border-radius:16px;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <p style="margin:0 0 14px;font-weight:700;color:${COLORS.gray};font-size:15px;">How it works</p>
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="padding:5px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">1.</span>Click the button below to open the form
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:5px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">2.</span>Enter your email address to get started
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:5px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">3.</span>Answer a few quick questions &mdash; it only takes a minute!
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:5px 0;font-size:14px;color:${COLORS.textDark};">
                              <span style="color:${COLORS.secondary};font-weight:bold;margin-right:8px;">4.</span>Share your thoughts on Hygieia and help us grow
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
                <td align="center" style="padding:10px 40px 30px;" class="content">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center"
                        style="background:linear-gradient(135deg,${COLORS.primary},${COLORS.secondary});border-radius:30px;">
                        <a href="${formLink}"
                          style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.4px;border-radius:30px;">
                          Fill Out the Form
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="font-size:12px;color:${COLORS.textMuted};margin:14px 0 0;">
                    Or copy this link:&nbsp;<a href="${formLink}" style="color:${COLORS.primary};word-break:break-all;">${formLink}</a>
                  </p>
                </td>
              </tr>

              <!-- Privacy note -->
              <tr>
                <td style="padding:0 40px 28px;" class="content">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="border-top:1px solid ${COLORS.lightGray};padding-top:20px;">
                        <p style="font-size:13px;line-height:1.6;color:${COLORS.textMuted};margin:0;text-align:left;">
                          &#x1F512;&nbsp; Your responses are kept confidential. No login required &mdash; just enter your email on the form.
                          Questions? Contact us at <a href="mailto:support@hygieia.com" style="color:${COLORS.primary};text-decoration:none;">support@hygieia.com</a>.
                        </p>
                      </td>
                    </tr>
                  </table>
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
