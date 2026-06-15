import { COLORS, HYGIEIA_LOGO, emailHeaderStyles, getHeaderWithLogo, getFooter } from './utils'

export function generateCvReceivedEmail(): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>CV Received</title>
      <style>
        body{margin:0;padding:0;background-color:${COLORS.background};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.dark};}
        .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
        .content{padding:30px 25px}
        h2{color:${COLORS.gray};margin-bottom:10px;font-size:18px}
        p{font-size:15px;line-height:1.5;color:${COLORS.textDark}}
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
                    <h2>Dear Candidate,</h2>
                    <p>We’ve received your CV and our recruitment team is now reviewing your application. If your profile matches an available position, we’ll get in touch with you.</p>
                    <p style="margin-top:15px;color:${COLORS.gray};">Thanks for showing interest in joining our team. We appreciate your time and effort.</p>
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
