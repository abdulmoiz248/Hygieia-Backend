# Privacy Policy

**Hygieia — Healthcare Platform**
**Last Updated:** May 28, 2026
**Effective Date:** May 28, 2026

---

## 1. Introduction

Welcome to Hygieia ("we," "us," "our," or the "Platform"). Hygieia is a healthcare management platform that connects patients with doctors, nutritionists, and lab technicians to provide comprehensive health services.

We are committed to protecting your privacy and handling your personal and health-related data responsibly. This Privacy Policy explains what information we collect, how we use it, how we store it, and your rights regarding that information.

By creating an account or using the Platform, you agree to the practices described in this Privacy Policy. If you do not agree with these practices, please do not use the Platform.

---

## 2. Information We Collect

### 2.1 Account Information

When you register for Hygieia, we collect:

- **Email address** (used as your primary identifier and for communication)
- **Password** (stored in hashed form using bcrypt; we never store plaintext passwords)
- **Account role** (patient, doctor, nutritionist, lab technician, or admin)

For healthcare workers (doctors, nutritionists, lab technicians), we also collect:

- **Full name**
- **Personal email address** (separate from the assigned @hygieia.com work email)

### 2.2 Profile Information

Depending on your role, you may provide additional profile data:

**Patients:**

- Name, phone number, date of birth, gender
- Address and emergency contact
- Profile photo/avatar
- Blood type, height, and weight

**Doctors & Nutritionists:**

- Name, phone number, gender, date of birth
- Profile photo
- Professional specialization, years of experience
- Certifications, education history, and languages spoken
- Bio, consultation fee, and working hours
- Professional rating

**Lab Technicians:**

- Name, phone number, gender, date of birth
- Profile photo

### 2.3 Health & Medical Data

As a healthcare platform, we collect and process sensitive health information including:

- Allergies, medical conditions, and current medications
- Ongoing medications and surgery history
- Implants and vaccination records
- Pregnancy status and menstrual cycle information
- Mental health information
- Family medical history
- Organ donor status and disabilities
- Lifestyle information
- Health score, medication adherence, missed doses, and doses taken
- Lab test results and medical records
- Prescription data and diet plans

> **Important:** Health data is classified as sensitive personal data. We apply additional safeguards to protect this information as described in Section 5.

### 2.4 Appointment & Booking Data

- Appointment details (date, time, healthcare provider, status)
- Booking history and consultation records

### 2.5 Fitness & Wellness Data

- Workout sessions and fitness tracking data
- Fitbit integration data (if you connect your Fitbit account), including:
  - Activity data, heart rate, sleep data, nutrition data, and weight data
  - Fitbit access and refresh tokens (stored securely)

### 2.6 AI & Chatbot Interaction Data

- Chat messages exchanged with the Hygieia AI chatbot
- AI-generated health recommendations
- Image uploads for acne or dental condition predictions
- Chat session history

### 2.7 Communication Data

- Email notifications sent to you (OTP verifications, appointment reminders, newsletters)
- Patient journal entries
- Feedback form submissions

### 2.8 Technical Data

- JWT authentication tokens (session management)
- OAuth tokens (Google, Fitbit)
- Account creation timestamps

---

## 3. How We Use Your Information

We use the collected information for the following purposes:

| Purpose | Data Used |
|---|---|
| **Account creation & authentication** | Email, password, OTP codes |
| **Identity verification** | Email, OTP, Google/Fitbit OAuth |
| **Profile management** | Name, contact details, profile photo |
| **Healthcare service delivery** | Medical data, appointments, prescriptions, lab results |
| **AI-powered recommendations** | Health data, medical history, lifestyle information |
| **Chatbot assistance** | Chat messages, health profile data |
| **Fitness tracking** | Workout data, Fitbit integration data |
| **Lab test processing** | Lab bookings, test results, medical records |
| **Diet & nutrition planning** | Health data, dietary preferences |
| **Email notifications** | Email address (for OTPs, reminders, newsletters, appointment confirmations) |
| **Platform analytics** | Aggregated, anonymized usage data for admin dashboards |
| **Image-based health predictions** | Uploaded images for acne/dental AI models |

We do **not** use your personal data for:

- Selling to third-party advertisers
- Unsolicited marketing unrelated to your healthcare
- Profiling for non-healthcare purposes

---

## 4. How We Share Your Information

We do **not** sell your personal data. We may share your data in the following limited circumstances:

### 4.1 Within the Platform

- **Doctors and nutritionists** may access your health profile and medical records when you book an appointment or consultation with them.
- **Lab technicians** may access lab test orders associated with your account.
- **Administrators** have access to platform management data (user counts, worker reports, system analytics).

### 4.2 Third-Party Service Providers

We use the following third-party services to operate the Platform:

| Service | Purpose | Data Shared |
|---|---|---|
| **Supabase** | Database hosting (PostgreSQL) | Account data, user records |
| **MongoDB Atlas** | Document storage | Profiles, chat history, medical records |
| **Cloudinary** | Image/file hosting | Profile photos, uploaded images |
| **Google OAuth** | Social login | Email address (from Google) |
| **Fitbit API** | Fitness data integration | Fitness and health metrics |
| **Groq** | AI model inference | Anonymized health data for recommendations |
| **SMTP Provider** | Email delivery | Email addresses, notification content |

### 4.3 Legal Requirements

We may disclose your information if required by law, court order, or regulatory authority.

---

## 5. Data Storage & Security

### 5.1 Where Your Data Is Stored

- **Supabase (PostgreSQL):** User accounts, appointments, lab data, notifications
- **MongoDB:** Patient profiles, doctor/nutritionist profiles, chat sessions, recommendations
- **Cloudinary:** Profile images and uploaded files
- **Redis:** Temporary queue and session data (automatically purged)

### 5.2 Security Measures

We implement the following security measures:

- **Password hashing:** All passwords are hashed using bcrypt with salt rounds before storage
- **JWT authentication:** Stateless token-based authentication for all API requests
- **OTP verification:** 6-digit one-time passwords for email verification and password resets
- **Encrypted transport:** All API communication occurs over HTTPS
- **Microservice isolation:** Services are isolated and communicate through internal TCP/message queues, reducing the attack surface
- **Role-based access control:** Users can only access data appropriate to their role
- **Input validation:** All API inputs are validated using DTOs and validation pipes

### 5.3 Data Retention

- **Active accounts:** Data is retained for as long as your account is active.
- **Deleted worker accounts:** When a healthcare worker account is deleted, their profile data is removed and a confirmation email is sent.
- **Temporary data:** OTP codes, session tokens, and queue messages are automatically expired or purged.

---

## 6. Your Rights

Depending on your jurisdiction, you may have the following rights:

### 6.1 Access

You can view your profile and health data at any time through the Platform.

### 6.2 Correction

You can update your profile information at any time through your account settings.

### 6.3 Deletion

You may request deletion of your account and associated data by contacting the platform administrator. Please note:

- Healthcare workers' accounts are managed by administrators.
- Some data may be retained for legal or medical record-keeping obligations.

### 6.4 Data Portability

You may request a copy of your personal data in a structured, commonly used format.

### 6.5 Withdraw Consent

You can disconnect third-party integrations (e.g., Fitbit, Google) at any time. You may also unsubscribe from newsletters.

### 6.6 Objection

You can object to certain processing activities by contacting us.

---

## 7. Cookies & Tokens

Hygieia uses:

- **JWT tokens** stored in HTTP headers for authentication (not browser cookies for the primary API)
- **Cookie-based sessions** for OAuth callback flows (Google, Fitbit)

We do not use tracking cookies or third-party analytics cookies.

---

## 8. Third-Party Integrations

### 8.1 Google OAuth

When you sign in with Google, we receive your email address from Google. We do not access your Google contacts, files, or other Google account data.

### 8.2 Fitbit

When you connect your Fitbit account, we access activity, heart rate, sleep, nutrition, profile, social, and weight data scopes. You can disconnect Fitbit at any time, after which we will no longer fetch new data from Fitbit.

---

## 9. Children's Privacy

Hygieia is not intended for use by individuals under the age of 16 without parental or guardian consent. We do not knowingly collect data from children under 16. If you believe a child has provided us with personal data, please contact us so we can take appropriate action.

---

## 10. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. When we make significant changes, we will:

- Update the "Last Updated" date at the top of this page
- Notify you via email or an in-app notification

Your continued use of the Platform after changes are posted constitutes acceptance of the updated Privacy Policy.

---

## 11. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:

- **Email:** support@hygieia.com
- **Platform:** Hygieia Healthcare Platform

---

*This Privacy Policy was last reviewed and updated on May 28, 2026.*
