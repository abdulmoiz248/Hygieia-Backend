import { COLORS, HYGIEIA_LOGO, emailHeaderStyles, getHeaderWithLogo, getFooter } from './utils'

export function generateCvRejectedEmail(fullName: string = 'Candidate'): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Application Status Update</title>
      <style>
        body{margin:0;padding:0;background-color:${COLORS.background};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.dark};}
        .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
        .content{padding:30px 25px}
        h2{color:${COLORS.gray};margin-bottom:10px;font-size:18px}
        p{font-size:15px;line-height:1.5;color:${COLORS.textDark}}
        .info-box{background-color:#f8fafc;padding:15px;border-left:4px solid #d4756b;border-radius:6px;margin:15px 0}
        @media(max-width:480px){.content{padding:20px !important;}h2{font-size:18px !important}}
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
                    <h2>Dear ${fullName},</h2>
                    <p>Thank you for your interest in joining our team at Hygieia and for taking the time to submit your application. We appreciate the effort you put into your CV and the information you provided.</p>

                    <div class="info-box"><p style="margin:0;color:#d4756b;font-weight:600;">After careful review of your application, we regret to inform you that we have decided not to move forward at this time.</p></div>

                    <p>While your CV and experience are commendable, we found other candidates whose skills and experience more closely matched our current requirements for this position.</p>
                    <p style="color:${COLORS.gray};font-weight:600;">We will keep your profile on file, and if a suitable opportunity arises in the future, <span style="color:${COLORS.primary};">you will be contacted soon by our HR department</span>.</p>
                    <p style="margin-top:15px;color:${COLORS.gray};">Best regards,<br/>Hygieia Recruitment Team</p>
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
  `
}
