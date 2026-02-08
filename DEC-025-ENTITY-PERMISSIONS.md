# DEC-025 Phase 3a — Entity Permission Lockdown

After deploying the `updateAdminSettings` server function and client changes, apply these permissions in the Base44 dashboard.

## AdminSettings

| Operation | Permission |
|-----------|------------|
| Read | Authenticated (all logged-in users can read — needed for useConfig, admin panel) |
| Create | Admin only |
| Update | Admin only |
| Delete | Admin only |

## Location

| Operation | Permission |
|-----------|------------|
| Read | Public |
| Create | Admin only |
| Update | Admin only |
| Delete | Admin only |

## Spoke

| Operation | Permission |
|-----------|------------|
| Read | Public |
| Create | Admin only |
| Update | Admin only |
| Delete | Admin only |

## SpokeEvent

| Operation | Permission |
|-----------|------------|
| Read | Public |
| Create | Admin only |
| Update | Admin only |
| Delete | Admin only |

## CategoryClick

| Operation | Permission |
|-----------|------------|
| Read | Admin only (analytics data) |
| Create | Authenticated (any logged-in user creates clicks — analytics tracking) |
| Update | Admin only |
| Delete | Admin only |

## Business (Phase 3b)

| Operation | Permission |
|-----------|------------|
| Read | Public (directory listings) |
| Create | Admin only |
| Update | Admin only |
| Delete | Admin only |

Writes go through `updateBusiness` server function (owner, manager, or admin for update; any authenticated for `update_counters`; invite flow for `add_staff_from_invite`).

## Event (Phase 3b)

| Operation | Permission |
|-----------|------------|
| Read | Public (event listings) |
| Create | Admin only |
| Update | Admin only |
| Delete | Admin only |

Writes go through `updateEvent` server function (owner or staff for create/update/delete/cancel).

## Notes

- **CategoryClick** create remains Authenticated — regular users click categories; low risk, no server function needed.
- **deleteBusinessCascade** runs client-side with admin auth — AdminSettings/Business filter/delete/update will succeed when user is admin.
- All AdminSettings writes go through `updateAdminSettings`. Business writes through `updateBusiness`. Event writes (client) through `manageEvent`; Spoke webhook uses `updateEvent`.
- **Business.create** (e.g. BusinessOnboarding) is admin-only; no server function for create.
