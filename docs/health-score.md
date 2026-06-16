# Health Score Calculation

> How Hygieia calculates a patient's overall health score.

---

## Overview

The **Health Score** is a composite metric that reflects a patient's overall treatment compliance. It combines two factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Medication Adherence** | **60%** | How consistently the patient takes prescribed medications |
| **Diet Adherence** | **40%** | How consistently the patient tracks their diet/fitness data |

The health score is calculated in **two different contexts**, each with a distinct formula:

---

## Context 1: Monthly Health Score (Monthly Cron Job)

**Service:** `scheduler` → `NutritionAndAdherenceService`
**Schedule:** 1st of every month at 00:00 UTC (`0 0 1 * *`)
**Scope:** Previous calendar month

### Calculation Steps

#### 1. Calculate Medication Adherence

```
totalDays     = number of days in the previous month (inclusive)
expectedDoses = number_of_prescriptions × totalDays × 2    (assumes 2 doses/day)
dosesTaken    = count of adherence logs where taken = true

medicationAdherence = (dosesTaken / expectedDoses) × 100
```

> **Note:** The monthly calculation uses a simplified model — it assumes **2 doses per day per prescription** rather than counting individual medications. This differs from the real-time adherence calculation.

#### 2. Calculate Diet Adherence

```
dietTrackedDays = count of unique days with fitness data logged
totalDays       = days in the previous month

dietAdherence = (dietTrackedDays / totalDays) × 100
```

Diet adherence measures how many days the patient logged **any** fitness/nutrition data (steps, water, sleep, calories, etc.) in the `fitness` table.

#### 3. Compute the Weighted Health Score

```
healthScore = round(medicationAdherence × 0.6 + dietAdherence × 0.4)
```

The result is an integer between **0 and 100** (enforced by database constraint).

### Where It Gets Stored

Stored in the `adherence_monthly_records` Supabase table:

| Column | Description |
|--------|-------------|
| `patient_id` | The patient's UUID |
| `month_year` | Human-readable label (e.g., `"May 2026"`) |
| `adherence_score` | `round(medicationAdherence)` — same as medication adherence |
| `health_score` | The weighted composite score (0–100) |
| `medication_adherence` | Medication adherence percentage (0–100) |
| `diet_adherence` | Diet adherence percentage (0–100) |
| `total_days` | Days in the month |
| `notes` | Summary text (e.g., `"Tracked 25 diet days. Took 48/60 doses."`) |

> A unique constraint on `(patient_id, month_year)` prevents duplicate records.

---

## Context 2: Real-Time Health Score (Profile Field)

**Services:** `appointments` microservice and `scheduler` microservice
**Trigger:** On every medication action + every 10 minutes via cron

In this context, the `healthscore` field on the MongoDB patient profile is set to the **medication adherence percentage** (rounded to the nearest integer):

```
healthscore = round(adherencePercent)
```

This is **not** a weighted composite — it equals the medication adherence rate directly. See the [Adherence Rate documentation](./adherence-rate.md) for how `adherencePercent` is calculated.

### Why They Differ

| Aspect | Monthly Health Score | Real-Time Health Score |
|--------|---------------------|----------------------|
| **Formula** | `0.6 × medAdherence + 0.4 × dietAdherence` | `medAdherence` (direct) |
| **Medication counting** | Simplified: 2 doses/day/prescription | Exact: 1 dose per medication per day |
| **Diet factor** | Included (40% weight) | Not included |
| **Storage** | Supabase `adherence_monthly_records` | MongoDB `patient_profiles.healthscore` |
| **Purpose** | Historical monthly tracking & reporting | Live dashboard display |

---

## Data Flow Diagram

### Monthly Health Score

```
Cron: 1st of every month @ 00:00 UTC
        │
        ▼
 ┌──────────────────────────────────────┐
 │ NutritionAndAdherenceService         │
 │ trackMonthlyAdherence()              │
 └──────────┬───────────────────────────┘
            │
     For each patient with prescriptions:
            │
            ▼
 ┌──────────────────────────────────────┐
 │ processMonthlyAdherenceForPatient()  │
 │                                      │
 │ 1. Fetch prescriptions               │
 │ 2. Fetch medication_adherence_logs   │
 │    for previous month                │
 │ 3. Calculate medication adherence    │
 │    (taken / expected × 100)          │
 │ 4. Fetch fitness data for month      │
 │ 5. Calculate diet adherence          │
 │    (tracked days / total days × 100) │
 │ 6. Health Score =                    │
 │    med × 0.6 + diet × 0.4           │
 └──────────┬───────────────────────────┘
            │
            ▼
 ┌──────────────────────────────────────┐
 │ INSERT into adherence_monthly_records│
 │ (Supabase)                           │
 └──────────────────────────────────────┘
```

### Real-Time Health Score

```
Patient marks medication taken / 10-min cron
        │
        ▼
 ┌──────────────────────────────┐
 │ Calculate adherence %        │
 │ (see adherence-rate.md)      │
 └──────────┬───────────────────┘
            │
            ▼
 ┌──────────────────────────────┐
 │ healthscore = round(adherence%)│
 │ Update patient_profiles      │
 │ (MongoDB)                    │
 └──────────────────────────────┘
```

---

## Source Code References

| File | Function |
|------|----------|
| `scheduler/src/nutrition-and-adherence/nutrition-and-adherence.service.ts` | `trackMonthlyAdherence()` |
| `scheduler/src/nutrition-and-adherence/nutrition-and-adherence.service.ts` | `processMonthlyAdherenceForPatient()` |
| `scheduler/src/scheduler/scheduler.service.ts` | `updatePatientProfileMetrics()` |
| `appointments/src/appointments/appointments.service.ts` | `refreshPatientAdherenceMetrics()` |

---

## Database Tables Involved

| Table | Role |
|-------|------|
| `prescriptions` | Determines expected medication doses |
| `medication_adherence_logs` | Tracks which doses were actually taken |
| `fitness` | Tracks daily nutrition/fitness data for diet adherence |
| `adherence_monthly_records` | Stores the monthly composite health score |
| `patient_profiles` (MongoDB) | Stores the real-time `healthscore` field |

---

## Database Constraints

The `adherence_monthly_records` table enforces:

```sql
CONSTRAINT "adherence_score_range"        CHECK (adherence_score        BETWEEN 0 AND 100)
CONSTRAINT "health_score_range"           CHECK (health_score           BETWEEN 0 AND 100)
CONSTRAINT "medication_adherence_range"   CHECK (medication_adherence   BETWEEN 0 AND 100)
CONSTRAINT "diet_adherence_range"         CHECK (diet_adherence         BETWEEN 0 AND 100)
```

---

## Example Walkthrough

**Scenario:** Patient "Ali" in May 2026 (31 days). He has 2 active prescriptions.

### Medication Adherence

```
expectedDoses = 2 prescriptions × 31 days × 2 doses/day = 124
dosesTaken    = 100 (logs where taken = true)
medAdherence  = (100 / 124) × 100 ≈ 80.6%
```

### Diet Adherence

```
fitness table has entries on 22 unique days in May
dietAdherence = (22 / 31) × 100 ≈ 71.0%
```

### Health Score

```
healthScore = round(80.6 × 0.6 + 71.0 × 0.4)
            = round(48.36 + 28.4)
            = round(76.76)
            = 77
```

**Stored record:**

| Field | Value |
|-------|-------|
| `month_year` | `"May 2026"` |
| `adherence_score` | `81` |
| `health_score` | `77` |
| `medication_adherence` | `81` |
| `diet_adherence` | `71` |
| `total_days` | `31` |
| `notes` | `"Tracked 22 diet days. Took 100/124 doses."` |
