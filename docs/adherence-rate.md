# Adherence Rate Calculation

> How Hygieia calculates a patient's medication adherence percentage.

---

## Overview

The **Adherence Rate** measures the percentage of expected medication doses a patient has actually taken. It is the primary metric used to gauge how faithfully a patient follows their prescribed medication regimen.

The adherence rate is calculated in **two contexts**:

| Context | Service | Trigger | Scope |
|---------|---------|---------|-------|
| **Real-time (per-action)** | `appointments` microservice | Every time a patient marks a medication as "taken" | Active prescriptions only |
| **Periodic (every 10 min)** | `scheduler` microservice | Cron job (`*/10 * * * *`) | All patients with active prescriptions or diet plans |

Both implementations share the same core algorithm.

---

## Core Algorithm

### Step 1 — Identify Active Prescriptions

Only prescriptions meeting **all** of the following criteria are considered:

- `status` = `'active'`
- `start_date` ≤ today (or `start_date` is null)
- `end_date` ≥ today (or `end_date` is null)

### Step 2 — Build the Expected Dose Set

For each active prescription, the system generates the set of **expected doses** using a composite key:

```
expectedDoseKey = "{prescription_id}|{medication_id}|{date}"
```

The system iterates over:

- **Date range**: from `start_date` (or today if null) to `min(end_date, today)` — inclusive on both ends.
- **Medications**: each medication in the prescription's `medications` JSON array.

This means **one expected dose per medication per day** per prescription.

> **Note:** The medication identifier is resolved with a fallback chain: `medication.id → medication.medicationId → medication.medication_id → medication.name`

### Step 3 — Match Logs Against Expected Doses

The system fetches all rows from the `medication_adherence_logs` table for the patient's active prescriptions and maps each log entry to its expected dose key:

```
logKey = "{prescription_id}|{medication_id}|{date_from_taken_at}"
```

- Only logs where `taken_at` ≤ today (UTC date) are considered.
- If multiple logs exist for the same key, the result is `OR`-ed (any `taken = true` counts).
- Logs that don't match any expected dose key are **ignored**.

### Step 4 — Count Taken vs Missed

```
dosesTaken  = count of expectedDoseKeys where a matching log has taken = true
missedDoses = count of expectedDoseKeys with no matching taken log
```

### Step 5 — Calculate Adherence Percentage

```
adherenceRate = (dosesTaken / expectedDoses) × 100
```

**Edge cases:**

| Condition | Result |
|-----------|--------|
| `expectedDoses > 0` | `(dosesTaken / expectedDoses) × 100` |
| `expectedDoses = 0` AND patient has an active diet plan | `100%` |
| `expectedDoses = 0` AND no active diet plan | `0%` |
| No active prescriptions AND no active diet plan | **Skip update** — preserves existing adherence value |

The final value is clamped to `[0, 100]` and rounded to 2 decimal places.

---

## Where It Gets Stored

| Storage | Field | Format |
|---------|-------|--------|
| MongoDB `patient_profiles` | `healthscore` | Integer (rounded) |
| MongoDB `patient_profiles` | `adherence` | String (decimal) |
| MongoDB `patient_profiles` | `doses_taken` | String |
| MongoDB `patient_profiles` | `missed_doses` | String |

---

## Data Flow Diagram

```
Patient marks medication taken
        │
        ▼
 ┌──────────────────────┐
 │ appointments service │
 │ saveMedicationTaken() │
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────────────┐
 │ Upsert medication_adherence_ │
 │ logs (Supabase)              │
 └──────────┬───────────────────┘
            │
            ▼
 ┌──────────────────────────────────┐
 │ refreshPatientAdherenceMetrics() │
 │ ─ Fetch active prescriptions    │
 │ ─ Fetch adherence logs          │
 │ ─ Build expected dose keys      │
 │ ─ Calculate adherence %         │
 └──────────┬───────────────────────┘
            │
            ▼
 ┌──────────────────────────────┐
 │ Update patient_profiles      │
 │ (MongoDB) with new metrics   │
 └──────────────────────────────┘
```

The scheduler runs the same logic every 10 minutes for **all** patients (batch sync), ensuring adherence stays accurate even if a patient doesn't interact with the app.

---

## Source Code References

| File | Function |
|------|----------|
| `appointments/src/appointments/appointments.service.ts` | `refreshPatientAdherenceMetrics()` |
| `appointments/src/appointments/appointments.service.ts` | `calculateMedicationStatsForPatient()` |
| `appointments/src/appointments/appointments.service.ts` | `buildExpectedDoseKeysForPatient()` |
| `scheduler/src/scheduler/scheduler.service.ts` | `syncPatientAdherenceMetrics()` |
| `scheduler/src/scheduler/scheduler.service.ts` | `calculateMedicationStats()` |
| `scheduler/src/scheduler/scheduler.service.ts` | `buildExpectedDoseKeys()` |

---

## Database Tables Involved

| Table | Role |
|-------|------|
| `prescriptions` | Source of active medication lists and date ranges |
| `medication_adherence_logs` | Stores each take/skip action per medication per day |
| `diet_plan` | Checked to determine if patient has active diet plan (fallback) |
| `patient_profiles` (MongoDB) | Stores the calculated `adherence`, `healthscore`, `doses_taken`, `missed_doses` |

---

## Example Walkthrough

**Scenario:** Patient has 1 active prescription with 2 medications, active from June 1 to June 10. Today is June 5.

1. **Expected dose keys generated**: 2 medications × 5 days = **10 expected doses**
2. **Adherence logs show**: 8 logs with `taken = true`
3. **Adherence rate**: `(8 / 10) × 100 = 80%`
4. **Stored**: `healthscore = 80`, `adherence = "80"`, `doses_taken = "8"`, `missed_doses = "2"`
