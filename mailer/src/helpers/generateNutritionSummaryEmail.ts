import { HYGIEIA_LOGO, COLORS, getFooter } from './utils'

interface DailyFitnessData {
  date: string
  dayLabel: string
  steps: number
  estimatedMiles: number
  caloriesBurned: number
  caloriesIntake: number
  waterIntake: number
  sleepHours: number
}

interface NutritionSummaryData {
  patientName: string
  email: string
  weekRange: {
    label: string
    startDate: string
    endDate: string
  }
  weeklyStats: {
    totalSteps: number
    avgStepsPerDay: number
    bestDay: {
      date: string
      steps: number
    }
    totalEstimatedMiles: number
    avgDailyCaloriesBurned: number
    avgDailyWaterIntake: number
    avgDailySleepHours: number
    avgDailyCaloriesIntake: number
  }
  weekOverWeek: {
    stepsDelta: number
    milesDelta: number
    caloriesBurnedDelta: number
    waterDelta: number
    sleepDelta: number
    caloriesIntakeDelta: number
  }
  dailyStats: DailyFitnessData[]
}

export function generateNutritionSummaryEmail(data: NutritionSummaryData): string {
  const { patientName, email, weekRange, weeklyStats, weekOverWeek, dailyStats } = data

  const formatNumber = (value: number): string => value.toLocaleString('en-US')

  const formatDelta = (value: number, suffix: string): string => {
    if (value > 0) {
      return `▲ ${formatNumber(value)} ${suffix} over last week`
    }

    if (value < 0) {
      return `▼ ${formatNumber(Math.abs(value))} ${suffix} less than last week`
    }

    return `No change vs last week`
  }

  const dailyRows = dailyStats
    .map(
      (day) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 10px; color: ${COLORS.dark}; font-size: 14px; font-weight: 600;">${day.dayLabel}</td>
      <td style="padding: 12px 10px; color: ${COLORS.dark}; font-size: 14px; text-align: center;">${formatNumber(day.steps)}</td>
      <td style="padding: 12px 10px; color: ${COLORS.dark}; font-size: 14px; text-align: center;">${day.estimatedMiles.toFixed(2)}</td>
      <td style="padding: 12px 10px; color: ${COLORS.dark}; font-size: 14px; text-align: center;">${day.caloriesBurned}</td>
      <td style="padding: 12px 10px; color: ${COLORS.dark}; font-size: 14px; text-align: center;">${day.waterIntake.toFixed(2)} L</td>
      <td style="padding: 12px 10px; color: ${COLORS.dark}; font-size: 14px; text-align: center;">${day.sleepHours.toFixed(1)} h</td>
    </tr>
  `,
    )
    .join('')

  const bestDayName = weeklyStats.bestDay.date === 'No data' ? 'No data' : weeklyStats.bestDay.date

  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Your Weekly Stats</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: ${COLORS.background};
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: ${COLORS.dark};
        }
        h1 { color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 1px; }
        h2 { color: ${COLORS.gray}; margin: 0 0 12px; font-size: 24px; font-weight: 700; }
        h3 { color: ${COLORS.gray}; margin: 20px 0 12px; font-size: 18px; font-weight: 600; }
        p { font-size: 15px; line-height: 1.6; margin: 8px 0; color: ${COLORS.textDark}; }
        .stat-box {
          background: white;
          border: 1px solid ${COLORS.lightGray};
          padding: 16px;
          margin: 10px 0;
          border-radius: 12px;
          text-align: left;
        }
        .stat-value { font-size: 28px; font-weight: 700; color: ${COLORS.primary}; }
        .stat-label { font-size: 12px; color: ${COLORS.textMuted}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.6px; }
        .delta-up { font-size: 12px; color: ${COLORS.secondary}; margin-top: 8px; }
        .delta-down { font-size: 12px; color: ${COLORS.accent}; margin-top: 8px; }
        .delta-flat { font-size: 12px; color: ${COLORS.textMuted}; margin-top: 8px; }
        .highlight-card {
          background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
          color: white;
          border-radius: 12px;
          padding: 18px;
          margin: 15px 0;
        }
        .table-header { background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary}); color: white; }
        th { padding: 14px; text-align: left; font-weight: 600; font-size: 13px; }
        td { padding: 12px 14px; border-bottom: 1px solid ${COLORS.lightGray}; }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
          color: white !important;
          padding: 14px 38px;
          border-radius: 30px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 20px;
          font-size: 15px;
          border: none;
          cursor: pointer;
        }
        .footer { background: ${COLORS.background}; border-top: 1px solid ${COLORS.lightGray}; padding: 25px; text-align: center; font-size: 12px; }
        .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
        .header { background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary}); color: white; text-align: center; padding: 45px 30px; }
        .content { padding: 35px 30px; }
        .grid-two { width: 100%; }
        .grid-two td { width: 50%; vertical-align: top; border: none; padding: 0 8px; }
        .week-strip {
          background: ${COLORS.background};
          border: 1px solid ${COLORS.lightGray};
          border-radius: 10px;
          padding: 10px;
          margin: 15px 0;
          text-align: center;
          color: ${COLORS.gray};
          font-size: 13px;
        }
        @media(max-width: 600px) {
          .container { margin: 0 !important; border-radius: 0 !important; }
          .header { padding: 30px 20px !important; }
          .content { padding: 20px !important; }
          h2 { font-size: 20px !important; }
          h3 { font-size: 16px !important; }
          .grid-two td { display: block !important; width: 100% !important; padding: 0 !important; }
        }
      </style>
    </head>
    <body>
      <table width="100%" bgcolor="#fbf9ea" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" valign="top" style="padding: 20px 0;">
            <div class="container">
              <div class="header">
                <img src="${HYGIEIA_LOGO}" alt="Hygieia Logo" style="width: 90px; height: 90px; border-radius: 50%; margin-bottom: 15px; object-fit: contain;"/>
                <h1>WEEKLY STATS</h1>
                <p style="margin: 12px 0 0; font-size: 16px; opacity: 0.95;">${weekRange.label}</p>
              </div>

              <div class="content">
                <h2>Hi, ${patientName}!</h2>
                <p>Here are your stats for the previous week based on your logged activity, hydration, sleep, and calories.</p>

                <div class="highlight-card">
                  <p style="margin: 0; margin-bottom: 8px; font-weight: 700; font-size: 16px; color: white;">Best Day! ${formatNumber(weeklyStats.bestDay.steps)} steps</p>
                  <p style="margin: 0; color: white;"><strong>${bestDayName}</strong></p>
                </div>

                <div class="week-strip">
                  ${formatNumber(weeklyStats.totalSteps)} total steps • Avg. ${formatNumber(weeklyStats.avgStepsPerDay)} steps per day
                </div>

                <table class="grid-two" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <div class="stat-box">
                        <div class="stat-value">${weeklyStats.totalEstimatedMiles.toFixed(2)}</div>
                        <div class="stat-label">Total Estimated Miles</div>
                        <div class="${weekOverWeek.milesDelta > 0 ? 'delta-up' : weekOverWeek.milesDelta < 0 ? 'delta-down' : 'delta-flat'}">${formatDelta(weekOverWeek.milesDelta, 'miles')}</div>
                      </div>
                    </td>
                    <td>
                      <div class="stat-box">
                        <div class="stat-value">${weeklyStats.avgDailyCaloriesBurned}</div>
                        <div class="stat-label">Avg. Daily Calorie Burn</div>
                        <div class="${weekOverWeek.caloriesBurnedDelta > 0 ? 'delta-up' : weekOverWeek.caloriesBurnedDelta < 0 ? 'delta-down' : 'delta-flat'}">${formatDelta(weekOverWeek.caloriesBurnedDelta, 'cals')}</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div class="stat-box">
                        <div class="stat-value">${weeklyStats.avgDailyWaterIntake.toFixed(2)} L</div>
                        <div class="stat-label">Avg. Daily Water Intake</div>
                        <div class="${weekOverWeek.waterDelta > 0 ? 'delta-up' : weekOverWeek.waterDelta < 0 ? 'delta-down' : 'delta-flat'}">${formatDelta(weekOverWeek.waterDelta, 'L')}</div>
                      </div>
                    </td>
                    <td>
                      <div class="stat-box">
                        <div class="stat-value">${weeklyStats.avgDailySleepHours.toFixed(1)} h</div>
                        <div class="stat-label">Avg. Daily Sleep</div>
                        <div class="${weekOverWeek.sleepDelta > 0 ? 'delta-up' : weekOverWeek.sleepDelta < 0 ? 'delta-down' : 'delta-flat'}">${formatDelta(weekOverWeek.sleepDelta, 'hours')}</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div class="stat-box">
                        <div class="stat-value">${weeklyStats.avgDailyCaloriesIntake}</div>
                        <div class="stat-label">Avg. Daily Calories Intake</div>
                        <div class="${weekOverWeek.caloriesIntakeDelta > 0 ? 'delta-up' : weekOverWeek.caloriesIntakeDelta < 0 ? 'delta-down' : 'delta-flat'}">${formatDelta(weekOverWeek.caloriesIntakeDelta, 'cals')}</div>
                      </div>
                    </td>
                    <td>
                      <div class="stat-box">
                        <div class="stat-value">${formatNumber(weeklyStats.totalSteps)}</div>
                        <div class="stat-label">Total Steps</div>
                        <div class="${weekOverWeek.stepsDelta > 0 ? 'delta-up' : weekOverWeek.stepsDelta < 0 ? 'delta-down' : 'delta-flat'}">${formatDelta(weekOverWeek.stepsDelta, 'steps')}</div>
                      </div>
                    </td>
                  </tr>
                </table>

                <h3>Daily Breakdown</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <thead>
                    <tr class="table-header">
                      <th>Day</th>
                      <th style="text-align:center;">Steps</th>
                      <th style="text-align:center;">Miles</th>
                      <th style="text-align:center;">Cal Burn</th>
                      <th style="text-align:center;">Water</th>
                      <th style="text-align:center;">Sleep</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dailyRows}
                  </tbody>
                </table>

                <div style="text-align: center; margin-top: 30px;">
                  <p style="color: ${COLORS.textMuted}; font-size: 14px;">
                    Keep logging your activity daily to get richer week-over-week insights.
                  </p>
                  <a href="https://hygieia-frontend.vercel.app/dashboard" class="btn">View Dashboard</a>
                </div>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${getFooter()}
                <tr>
                  <td style="background:#F9FAFB;padding:0 30px 30px;color:${COLORS.textMuted};font-size:11px;">
                    This email was sent to ${email}. You can manage email preferences from your account settings.
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}
