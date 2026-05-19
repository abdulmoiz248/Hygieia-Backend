// Color scheme: soft-blue (#008396), mint-green (#46bba5), soft-coral (#ff1c6c),
// snow-white (#fbf9ea), dark-slate-gray (#001016), cool-gray (#17433b)

export const COLORS = {
  primary: "#008396",
  secondary: "#46bba5",
  accent: "#ff1c6c",
  background: "#fbf9ea",
  dark: "#001016",
  gray: "#17433b",
  lightGray: "#e5e7eb",
  borderGray: "#d1d5db",
  textDark: "#1f2937",
  textMuted: "#6b7280",
}

export const HYGIEIA_LOGO = "https://hygieia-frontend.vercel.app/_next/image?url=%2Flogo%2Flogo-2.png&w=128&q=90"

/**
 * Format a date string to readable format like "26 July 2026"
 * Accepts ISO string, Date object, or string in YYYY-MM-DD format
 */
export const formatEmailDate = (dateInput: string | Date): string => {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return dateInput as string // Return original if invalid
    
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return typeof dateInput === 'string' ? dateInput : ''
  }
}

export const emailHeaderStyles = `
  background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
  padding: 40px 30px 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 20px 20px 0 0;
`

export const buttonStyles = `
  display: inline-block;
  padding: 14px 38px;
  background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary});
  color: white;
  text-decoration: none;
  border-radius: 30px;
  font-weight: 600;
  letter-spacing: 0.4px;
  border: none;
  cursor: pointer;
`

export const getHeaderWithLogo = () => `
  <img src="${HYGIEIA_LOGO}" alt="Hygieia Logo" style="display:block;width:92px;height:auto;margin:0 0 12px;object-fit:contain;">
  <h1 style="margin:0;font-size:34px;font-weight:700;letter-spacing:1px;color:white;">Hygieia</h1>
  <p style="margin:8px 0 0;color:white;font-size:15px;letter-spacing:0.4px;">From Past to Future of Healthcare</p>
`

export const getFooter = (supportEmail = "support@hygieia.com") => `
  <tr>
    <td style="background:#F9FAFB;padding:30px;border-top:1px solid ${COLORS.lightGray};">
      <p style="margin:0 0 8px;font-size:13px;color:${COLORS.textMuted};">Need help?</p>
      <a href="mailto:${supportEmail}" style="font-weight:600;color:${COLORS.primary};text-decoration:none;">${supportEmail}</a>
      <p style="margin:15px 0 0;font-size:12px;color:${COLORS.textMuted};">© 2025 Hygieia Healthcare. All rights reserved.</p>
    </td>
  </tr>
`

export const getIconCircle = (icon: string, color = COLORS.secondary) => `
  <div style="width:90px;height:90px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;margin:auto;box-shadow:0 6px 20px rgba(70, 187, 165, 0.3);">
    ${icon}
  </div>
`
