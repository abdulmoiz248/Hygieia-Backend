import { HYGIEIA_LOGO } from "./utils"

export function generateWorkerCredentialsEmail(
  personalEmail: string, 
  workEmail: string, 
  password: string, 
  name: string, 
  role: string
): string {
  const roleFormatted = role === 'lab-technician' ? 'Pathologist' : 
                        role.charAt(0).toUpperCase() + role.slice(1)
  
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Welcome to Hygieia Team!</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        p{font-size:15px;line-height:1.5;}
        .credentials-card{
          background-color:#f0f9ff;
          border-left:4px solid #46bba5;
          padding:20px 25px;
          margin:20px 0;
          border-radius:8px;
          text-align:left;
        }
        .credential-item{
          margin:12px 0;
          padding:10px 15px;
          background-color:#ffffff;
          border-radius:6px;
          border:1px solid #e5e7eb;
        }
        .credential-label{
          font-weight:600;
          color:#17433b;
          font-size:14px;
          margin-bottom:5px;
        }
        .credential-value{
          font-family:monospace;
          font-size:16px;
          color:#008396;
          font-weight:600;
          word-break:break-all;
        }
        .security-warning{
          background-color:#fef2f2;
          border:1px solid #fecaca;
          border-radius:8px;
          padding:15px;
          margin:20px 0;
          color:#991b1b;
        }
        .btn{
          display:inline-block;
          background:linear-gradient(90deg,#008396,#46bba5);
          color:#fff !important;
          padding:14px 30px;
          border-radius:30px;
          text-decoration:none;
          font-weight:600;
          margin-top:20px;
        }
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
        @media(max-width:480px){
          .content{padding:20px !important;}
          h2{font-size:18px !important;}
          .credential-value{font-size:14px !important;}
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
                        <h1 style="margin:0;">Welcome to Team Hygieia!</h1>
                        <div class="role-badge" style="margin-top:10px;">${roleFormatted}</div>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hello ${name}!</h2>
                        <p>Welcome to the Hygieia healthcare team! We're excited to have you join us as a <strong>${roleFormatted}</strong>. Your account has been successfully created.</p>
                        
                        <div class="credentials-card">
                          <h3 style="margin:0 0 15px 0;color:#008396;">Your Login Credentials</h3>
                          
                          <div class="credential-item">
                            <div class="credential-label">Work Email:</div>
                            <div class="credential-value">${workEmail}</div>
                          </div>
                          
                          <div class="credential-item">
                            <div class="credential-label">Temporary Password:</div>
                            <div class="credential-value">${password}</div>
                          </div>
                        </div>

                        <div class="security-warning">
                          <strong>⚠️ Important Security Notice:</strong><br>
                          This is a temporary password. Please log in and change it immediately for security reasons. Do not share these credentials with anyone.
                        </div>
                        
                        <p style="color:#17433b;margin-top:20px;">
                          <strong>Next Steps:</strong>
                        </p>
                        <ol style="color:#17433b;text-align:left;">
                          <li>Log in to your Hygieia dashboard using the credentials above</li>
                          <li>Change your temporary password to a secure one</li>
                          <li>Complete your profile information</li>
                          <li>Familiarize yourself with the platform features</li>
                        </ol>
                        
                        <p style="margin-top:20px;font-size:13px;color:#6b7280;">
                          If you have any questions or need assistance, please contact your supervisor or our IT support team.
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