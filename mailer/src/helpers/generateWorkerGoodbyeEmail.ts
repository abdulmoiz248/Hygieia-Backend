import { HYGIEIA_LOGO } from './utils'

export function generateWorkerGoodbyeEmail(
  personalEmail: string,
  name: string,
  role: string,
  workEmail: string
): string {
  const roleFormatted = role === 'lab-technician'
    ? 'Pathologist'
    : role.charAt(0).toUpperCase() + role.slice(1)

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Thank You from Hygieia</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        p{font-size:15px;line-height:1.5;}
        .message-card{
          background-color:#f0f9ff;
          border-left:4px solid #46bba5;
          padding:20px 25px;
          margin:20px 0;
          border-radius:8px;
          text-align:left;
        }
        .account-box{
          margin:12px 0;
          padding:12px 15px;
          background-color:#ffffff;
          border-radius:6px;
          border:1px solid #e5e7eb;
        }
        .account-label{font-weight:600;color:#17433b;font-size:14px;margin-bottom:5px;}
        .account-value{font-family:monospace;font-size:15px;color:#008396;font-weight:600;word-break:break-all;}
        .role-badge{
          display:inline-block;
          background-color:#008396;
          color:white;
          padding:6px 12px;
          border-radius:20px;
          font-size:12px;
          font-weight:600;
          text-transform:uppercase;
        }
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="#fbf9ea" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);overflow:hidden;text-align:center;">
              <tr>
                <td style="padding:0;">
                  <table width="100%" style="background:linear-gradient(90deg,#008396,#46bba5);color:white;text-align:center;padding:30px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" width="70" height="70" style="border-radius:50%;margin-bottom:10px;"/>
                        <h1 style="margin:0;">Thank You for Your Service</h1>
                        <div class="role-badge" style="margin-top:10px;">${roleFormatted}</div>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;">
                    <tr>
                      <td>
                        <h2>Hello ${name || personalEmail},</h2>
                        <p>Thank you for your contribution to the Hygieia team. We truly appreciate your service and impact as a <strong>${roleFormatted}</strong>.</p>

                        <div class="message-card">
                          <p style="margin:0 0 10px 0;"><strong>Your work account has been removed.</strong></p>
                          <div class="account-box">
                            <div class="account-label">Removed Work Email:</div>
                            <div class="account-value">${workEmail}</div>
                          </div>
                        </div>

                        <p>We wish you continued success in your journey ahead.</p>
                        <p style="margin-top:20px;font-size:13px;color:#6b7280;">If you believe this action was made in error, please contact Hygieia administration.</p>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" style="background-color:#17433b;text-align:center;padding:15px;">
                    <tr>
                      <td style="color:white;font-size:13px;">
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
  `
}