export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

export function generateCvRejectedEmail(fullName: string = 'Candidate'): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Application Status Update</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        p{font-size:15px;line-height:1.5;}
        .info-box{background-color:#f0f0f0;padding:15px;border-left:4px solid:#d4756b;border-radius:4px;margin:15px 0;}
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

                  <table width="100%" style="background:linear-gradient(90deg,#5a6b6d,#708285);color:white;text-align:center;padding:30px 20px;">
                    <tr>
                      <td>
                        <img src="${HYGIEIA_LOGO}" width="70" height="70" style="border-radius:50%;margin-bottom:10px;"/>
                        <h1 style="margin:0;">Application Status Update</h1>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Dear ${fullName},</h2>

                        <p>
                          Thank you for your interest in joining our team at Hygieia and for taking the time to submit your application.
                          We appreciate the effort you put into your CV and the information you provided.
                        </p>

                        <div class="info-box">
                          <p style="margin:0;color:#d4756b;font-weight:600;">
                            After careful review of your application, we regret to inform you that we have decided not to move forward at this time.
                          </p>
                        </div>

                        <p>
                          While your CV and experience are commendable, we found other candidates whose skills and experience more closely matched our current requirements for this position.
                        </p>

                        <p style="color:#17433b;font-weight:600;">
                          We will keep your profile on file, and if a suitable opportunity arises in the future, <span style="color:#008396;">you will be contacted soon by our HR department</span>.
                        </p>

                        <p>
                          We encourage you to apply again for any future positions that align with your career goals. We wish you all the best in your professional endeavors.
                        </p>

                        <p style="margin-top:15px;color:#17433b;">
                          Best regards,<br/>
                          Hygieia Recruitment Team
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
