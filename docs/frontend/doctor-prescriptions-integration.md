# Doctor Frontend Integration — Prescriptions & Appointment Completion

This doc describes the new API routes for doctor workflow.

## Base Path
- `appointments` module in API gateway
- Swagger tag: `Appointments`

## 1) Complete Doctor Appointment
- **Method:** `POST`
- **Route:** `/appointments/:id/complete-doctor`
- **Purpose:** Complete an appointment, optionally assign prescription and/or referred tests.

### Request Body
```json
{
  "doctorId": "<doctor-uuid>",
  "dto": {
    "report": "Patient advised to continue hydration and monitor BP.",
    "referredTestIds": ["<test-uuid-1>", "<test-uuid-2>"],
    "prescription": {
      "notes": "Take medications after meals.",
      "startDate": "2026-03-18",
      "endDate": "2026-04-18",
      "status": "active",
      "medications": [
        {
          "name": "Lisinopril",
          "dosage": "10mg",
          "frequency": "Once daily",
          "duration": "30 days",
          "instructions": "Take in morning",
          "time": "08:00 AM"
        }
      ]
    }
  }
}
```

### Response
- Returns updated appointment object (status becomes `completed`).

## 2) Get All Prescriptions Assigned By Doctor
- **Method:** `GET`
- **Route:** `/appointments/prescriptions/assigned?doctorId=<doctor-uuid>`http://localhost:4000/appointments/d6eb5f8d-0b91-4b12-9b9c-031b027ddc21/complete-doctor
- **Purpose:** Doctor list view for all issued prescriptions.

### Response Notes
- Returns rows from `prescriptions` with `patientName` enrichment.

## 3) Update Prescription
- **Method:** `PATCH`
- **Route:** `/appointments/prescriptions/:id`
- **Purpose:** Update existing prescription (doctor ownership enforced).

### Request Body
```json
{
  "doctorId": "<doctor-uuid>",
  "dto": {
    "notes": "Reduce sodium intake.",
    "status": "completed",
    "endDate": "2026-04-20",
    "medications": [
      {
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "duration": "30 days",
        "instructions": "Take in morning",
        "time": "08:00 AM"
      }
    ]
  }
}
```

## 4) Get Previous Prescriptions For A Patient (Doctor POV)
- **Method:** `GET`
- **Route:** `/appointments/prescriptions/previous/:doctorId/:patientId`
- **Purpose:** Show historical completed prescriptions for a selected patient.

## Frontend Store Mapping Tips
For your medicine store:
- `prescription.id` -> `Prescription.id`
- `doctorName`, `doctorSpecialty` -> derive from doctor profile / context
- `created_at` or `start_date` -> `date`
- `status` -> `status`
- `medications` -> `medications`

## Expected Validation/Errors
- `400`: invalid payload/table constraints
- `403`: doctor is not owner of appointment/prescription
- `404`: appointment/prescription not found

## Notes For Backend Team
- Prescriptions are stored in Supabase table: `prescriptions`.
- Required columns expected:
  - `id`, `appointment_id`, `patient_id`, `doctor_id`, `medications` (json/jsonb),
  - `notes`, `start_date`, `end_date`, `status`, `created_at`, `updated_at`.
