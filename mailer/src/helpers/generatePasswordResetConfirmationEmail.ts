import { HYGIEIA_LOGO } from "./utils"

export function generatePasswordResetConfirmationEmail(email: string): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Password Reset Successful - Hygieia</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        p{font-size:15px;line-height:1.5;}
        .success-box{
          background-color:#ecfdf5;
          border-left:4px solid #46bba5;
          padding:16px 18px;
          margin:18px 0;
          border-radius:8px;
          text-align:left;
        }
        .success-box h3{margin:0 0 6px 0;color:#008396;font-size:16px;}
        .success-box p{margin:0;font-size:14px;color:#17433b;}
        .security-box{
          background-color:#fff8e1;
          border-left:4px solid #ff1c6c;
          padding:15px;
          margin:20px 0;
          border-radius:8px;
          text-align:left;
        }
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
              <tr>
                <td style="padding:0;">
                  
                  <table width="100%" style="background:linear-gradient(90deg,#008396,#46bba5);color:white;text-align:center;padding:30px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" width="70" height="70" style="border-radius:50%;margin-bottom:10px;"/>
                        <h1 style="margin:0;">Password Reset Successful</h1>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hello!</h2>
                        <p>Your Hygieia account password for <strong>${email}</strong> has been reset successfully.</p>

                        <div class="success-box">
                          <h3>✅ Password Updated</h3>
                          <p>If this was you, no further action is needed.</p>
                        </div>

                        <div class="security-box">
                          <p style="margin:0;color:#17433b;font-weight:600;">⚠️ Security Notice</p>
                          <p style="margin:8px 0 0;font-size:14px;">
                            If you did not reset your password, please contact support immediately to secure your account.
                          </p>
                        </div>

                        <p style="margin-top:20px;font-size:13px;color:#6b7280;">
                          For your protection, keep your password private and choose a unique one that you do not use elsewhere.
                        </p>
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