export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

export function generateNewsletterSubscriptionEmail(email: string): string {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Hygieia Newsletter Subscription</title>
      <style>
        body{margin:0;padding:0;background-color:#fbf9ea;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#001016;}
        h2{color:#17433b;margin-bottom:10px;}
        p{font-size:15px;line-height:1.5;}
        .btn{
          display:inline-block;
          background-color:#008396;
          color:#fff !important;
          padding:12px 24px;
          border-radius:8px;
          text-decoration:none;
          margin-top:20px;
        }
        .btn:hover{background-color:#46bba5;}
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
                        <h1 style="margin:0;">You're Now Subscribed!</h1>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:30px 25px;" class="content">
                    <tr>
                      <td>
                        <h2>Hey there,</h2>
                        <p>Thanks for subscribing to the Hygieia Newsletter using <strong>${email}</strong>.</p>
                        <p>You’ll now get updates on new features, health insights, AI-powered tools, and exclusive early previews — straight to your inbox.</p>
                        <p style="margin-top:20px;color:#17433b;">
                          We're stoked to have you on board. If you ever change your mind, you can
                          <a href="https://hygieia-frontend.vercel.app/unsubscribe-newsletter?email=${encodeURIComponent(email)}" style="color:#008396;text-decoration:underline;">unsubscribe anytime</a>.
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
