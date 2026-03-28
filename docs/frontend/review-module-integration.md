# Review Module Frontend Handoff

This document explains what frontend needs to implement for the appointment review flow.

## Goal
- Let patients rate completed appointments (doctor or nutritionist).
- Allow only one review per appointment.
- Show provider reviews publicly in provider profile/detail pages.

## Backend Endpoints

### 1) Submit Review
- Method: `POST`
- URL: `/appointments/:id/review`
- `:id` is `appointmentId`

Request body:
```json
{
  "patientId": "uuid",
  "rating": 5,
  "review": "Very helpful and clear guidance"
}
```

Success response:
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "id": "uuid",
    "appointmentId": "uuid",
    "patientId": "uuid",
    "providerId": "uuid",
    "providerRole": "doctor",
    "rating": 5,
    "review": "Very helpful and clear guidance",
    "createdAt": "2026-03-28T10:00:00.000Z"
  },
  "provider": {
    "id": "uuid",
    "role": "doctor",
    "rating": 4.67,
    "totalReviews": 24
  }
}
```

Important error cases to handle:
- `400`: appointment already reviewed, invalid rating, or appointment not completed.
- `403`: patient does not own this appointment.
- `404`: appointment not found.

### 2) Get Provider Reviews
- Method: `GET`
- URL: `/appointments/reviews/provider`
- Query params:
- `providerId` (required)
- `role` (`doctor` or `nutritionist`, optional)
- `limit` (optional, default 20)
- `offset` (optional, default 0)

Example:
`/appointments/reviews/provider?providerId=<uuid>&role=doctor&limit=10&offset=0`

Success response:
```json
{
  "items": [
    {
      "id": "uuid",
      "appointmentId": "uuid",
      "patientId": "uuid",
      "patientName": "John Doe",
      "providerId": "uuid",
      "providerRole": "doctor",
      "rating": 5,
      "review": "Very good consultation",
      "createdAt": "2026-03-28T10:00:00.000Z"
    }
  ],
  "count": 34,
  "limit": 10,
  "offset": 0
}
```

## Review Link Route (from Email)
Backend emails users this link pattern:
- `/appointments/:appointmentId/review?providerRole=doctor`
- `/appointments/:appointmentId/review?providerRole=nutritionist`

Frontend should implement a page for this route and:
- Read `appointmentId` from URL path.
- Read `providerRole` from query.
- Show rating selector (1 to 5).
- Show text area for written review.
- Submit to `POST /appointments/:id/review`.

## UI/UX Requirements
- Disable submit button until:
- rating selected (1 to 5)
- review text is not empty
- Show loader while submitting.
- On success:
- show confirmation state
- optionally redirect to appointment history
- prevent accidental resubmission
- On `400` "already reviewed":
- show read-only message: "This appointment has already been reviewed."

## Validation Rules
- Rating must be integer from 1 to 5.
- Review text is required.
- One appointment can only be reviewed once.

## Suggested Frontend Tasks
1. Add review page route handling `/appointments/:appointmentId/review`.
2. Build review form UI (stars + text).
3. Integrate submit API with proper error handling.
4. Add provider reviews section in doctor and nutritionist profile pages.
5. Add pagination for reviews list using `limit` and `offset`.

## Notes
- After submission, backend automatically:
- stores review
- updates provider average rating
- sends patient a copy of their review by email
- adds patient and provider in-app notifications
