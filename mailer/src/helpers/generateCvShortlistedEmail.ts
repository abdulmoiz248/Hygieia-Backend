import { COLORS, HYGIEIA_LOGO, emailHeaderStyles, getHeaderWithLogo, getFooter } from './utils'

export function generateCvShortlistedEmail(fullName: string = 'Candidate'): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>You've Been Shortlisted</title>
      <style>
        body{margin:0;padding:0;background-color:${COLORS.background};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.dark};}
        .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
        .content{padding:30px 25px}
        h2{color:${COLORS.gray};margin-bottom:10px;font-size:18px}
        p{font-size:15px;line-height:1.5;color:${COLORS.textDark}}
        .highlight{color:${COLORS.primary};font-weight:600}
        .button{display:inline-block;background:linear-gradient(135deg,${COLORS.primary},${COLORS.secondary});color:white;padding:12px 30px;text-decoration:none;border-radius:6px;margin-top:15px}
        @media(max-width:480px){.content{padding:20px !important;}h2{font-size:18px !important}.button{display:block;text-align:center}}
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
                    <p>Congratulations! We are pleased to inform you that your CV has been shortlisted for our recruitment process. Your qualifications and experience are impressive, and we would like to move forward with your application.</p>
                    <p style="color:${COLORS.gray};font-weight:600;"><span class="highlight">You will be contacted soon by our HR department</span> regarding the next steps in the interview process.</p>
                    <p style="margin-top:15px;color:${COLORS.gray};">Thank you for your interest in Hygieia!</p>
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
