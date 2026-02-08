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

## Notes

- **CategoryClick** create remains Authenticated — regular users click categories; low risk, no server function needed.
- **deleteBusinessCascade** runs client-side with admin auth — AdminSettings filter/delete will succeed when user is admin.
- All AdminSettings writes now go through `updateAdminSettings` server function.
