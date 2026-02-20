# NewsletterSubscriber entity (Base44)

Create this entity in the Base44 dashboard for the footer "The Good News" signup.

**Entity name:** `NewsletterSubscriber` (PascalCase, as used in code: `base44.entities.NewsletterSubscriber`)

**Fields:**

| Field          | Type   | Required | Notes                                      |
|----------------|--------|----------|--------------------------------------------|
| email          | string | yes      | Normalized (lowercase) for duplicate check |
| subscribed_at  | string | no       | ISO datetime, e.g. from `new Date().toISOString()` |
| source         | string | no       | `"footer"`, `"onboarding"`, `"post_rsvp"` (future) |
| user_id        | string | no       | Base44 user id if subscribed while logged in; null if anonymous |

**Permissions:** Set so that creates can be made by any authenticated or unauthenticated user (e.g. No Restrictions or Public for Create), and reads restricted as needed (e.g. Admin only for listing subscribers).
