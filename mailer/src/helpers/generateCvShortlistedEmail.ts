export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

export function generateCvShortlistedEmail(fullName: string = 'Candidate'): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>You've Been Shortlisted</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        p{font-size:15px;line-height:1.5;}
        .highlight{color:#008396;font-weight:600;}
        .button{display:inline-block;background-color:#008396;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;margin-top:15px;}
        @media(max-width:480px){
          .content{padding:20px !important;}
          h2{font-size:18px !important;}
          .button{display:block;text-align:center;}
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
                        <h1 style="margin:0;">Great News! You've Been Shortlisted</h1>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Dear ${fullName},</h2>

                        <p>
                          Congratulations! We are pleased to inform you that your CV has been shortlisted for our recruitment process.
                          Your qualifications and experience are impressive, and we would like to move forward with your application.
                        </p>

                        <p style="color:#17433b;font-weight:600;">
                          <span class="highlight">You will be contacted soon by our HR department</span> regarding the next steps in the interview process.
                        </p>

                        <p>
                          This is an exciting opportunity to join our growing team. If you have any questions in the meantime, please feel free to reach out to us.
                        </p>

                        <p style="margin-top:15px;color:#17433b;">
                          Thank you for your interest in Hygieia!
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
