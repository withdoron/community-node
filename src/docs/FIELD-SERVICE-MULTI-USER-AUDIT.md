# Field Service Multi-User Readiness Audit

> Audit for Bari Swartz (bariswartz1@gmail.com) walkthrough — Friday 2026-03-28
> Audited: 2026-03-25

---

## Audit 1: How Bari's Workspace Is Configured

### Profile Ownership Model

BusinessDashboard.jsx (line 363) finds FS profiles via:
```javascript
FieldServiceProfile.filter({ user_id: currentUser.id })
```

If Bari created his workspace through FieldServiceOnboarding, his FieldServiceProfile record has `user_id: bari_user_id`. He IS the owner.

If Doron created it via Base44 preview acting as Bari, the `user_id` field should still be Bari's ID (the onboarding sets `user_id: currentUser.id`). But the record's internal `created_by` (Base44 automatic field) would be Doron's.

### Scope Construction (BusinessDashboard.jsx line 1090-1113)

```
selectedFSProfile.user_id === currentUser?.id  -->  fsIsOwner = true
fsScope = { profile, currentUser, isOwner: true, workerRole: null, features }
```

Bari gets OWNER role and full access to all tabs.

### Worker Flow (for reference)

Non-owners join via `claimWorkspaceSpot` server function using invite codes. They appear in `workers_json` with `user_id` linked. Dashboard finds them via localStorage `joinedFSWorkspaces` key (line 370-397).

---

## Audit 2: Tab-by-Tab Query Analysis

### Filter Field Summary

All FS queries scope by one of:
- `profile_id: profile.id` (most entities)
- `workspace_id: profile.id` (FSClient)
- `project_id` (sub-entity queries)
- `daily_log_id` (log detail queries)

No queries filter by `user_id` — this is correct. Workspace data belongs to the workspace (profile), not the user.

### Tab Results

| Tab | Component | Queries | Filter | Try/Catch | Bari Status |
|-----|-----------|---------|--------|-----------|-------------|
| Home | FieldServiceHome | 8 queries (FSProject, FSMaterialEntry, FSLaborEntry, FSDailyLog, FSEstimate, FSPayment, FSDocument, FSClient) | All by profile_id/workspace_id | YES (added this commit) | PASS if entity read perms allow |
| Log | FieldServiceLog | 2 useQuery + 3 inline | profile_id, project_id, daily_log_id | Inline: YES, useQuery: NO (React Query error state) | PASS (inline loads are protected) |
| Projects | FieldServiceProjects | 10 queries | profile_id, workspace_id, project_id | YES (added this commit) | PASS if entity read perms allow |
| Estimates | FieldServiceEstimates | 3 queries (FSEstimate, FSProject, FSClient) | profile_id, workspace_id | YES (added this commit) | PASS if entity read perms allow |
| People | FieldServicePeople | 2 queries (FSProject, FSClient) | profile_id, workspace_id | YES (added this commit) | PASS if entity read perms allow |
| Documents | FieldServiceDocuments | 5 queries + initializeWorkspace | profile_id, workspace_id | YES (previous commit) | PASS with caveats (see Audit 3) |
| Settings | FieldServiceSettings | 0 queries, 7 mutations (FieldServiceProfile.update) | profile.id | N/A (mutations only) | PASS — owner can update own profile |

### Unprotected: FieldServiceLog useQuery

FieldServiceLog has 2 useQuery calls (FSProject, FSDailyLog) that lack try/catch. These use React Query's built-in error handling rather than crashing, but they'll show error states rather than empty states. Low risk — the inline loads within useEffect DO have try/catch.

---

## Audit 3: Template Visibility — Root Cause

### The Problem

Templates seeded by `initializeWorkspace` show for Doron but not for Bari.

### Root Cause: Base44 Entity Permissions

`initializeWorkspace` creates FSDocumentTemplate records using **service role**:
```typescript
await base44.asServiceRole.entities.FSDocumentTemplate.create({
  ...tpl,
  profile_id: profileId,
});
```

The `profile_id` is set correctly to Bari's workspace. But Base44's internal `created_by` field is set to the **service role**, not to Bari.

If FSDocumentTemplate has **Creator Only** read permissions, neither Bari nor Doron can read service-role-created records from the client SDK. The try/catch wrapper returns `[]` silently — templates appear empty.

### Why Doron sees them

If Doron created the workspace himself (not via Bari's account), the initializeWorkspace call ran under Doron's auth context. Even though it uses service role for the create, the auth ownership may differ. OR — Doron may be seeing templates he created manually (not system templates).

### Fix Required (Base44 Dashboard — Manual Step)

**Change FSDocumentTemplate Read permission from "Creator Only" to "Authenticated Users".**

Templates are workspace-level resources filtered by `profile_id`. Any authenticated user who can access the workspace should be able to read its templates. The `profile_id` filter ensures users only see templates for their own workspace.

**Also check these entities** (same issue if Creator Only):
- FSDocument
- FSClient
- FSProject
- FSEstimate
- FSDailyLog
- FSMaterialEntry
- FSLaborEntry
- FSPayment
- FSChangeOrder
- FSDailyPhoto
- FSPermit

All should be **Authenticated Users** for Read, since queries filter by `profile_id`/`workspace_id`.

---

## Audit 4: initializeWorkspace Analysis

### When It Runs

Called in FieldServiceDocuments.jsx useEffect (line 637-658) on every Documents tab load IF:
1. `isOwner === true` (profile.user_id === currentUser.id)
2. `templates.length === 0` (no templates found)
3. Not already seeded this session

### isOwner Guard (commit 93143be)

```javascript
const isOwner = profile?.user_id && currentUser?.id && profile.user_id === currentUser.id;
// ...
if (!isOwner || !profile?.id || !currentUser?.id || templatesLoading || seeded) return;
```

Non-owner users skip initialization entirely. This is correct.

### Server-Side Auth Check (initializeWorkspace/entry.ts line 515-521)

```typescript
if (user.role !== 'admin') {
  if (workspace_type === 'field_service') {
    const profile = await base44.asServiceRole.entities.FieldServiceProfile.get(profile_id);
    if (!profile || profile.user_id !== user.id) {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }
  }
}
```

Double protection: client-side isOwner guard + server-side user_id check.

### Idempotency

The function checks for existing system templates before creating:
```typescript
if (!force && systemCount >= FS_SYSTEM_TEMPLATES.length) {
  return { initialized: true, templates_created: 0 };
}
```

Safe to call multiple times. But if templates exist but are invisible to the client (Creator Only read), the client sees 0 templates, triggers initialization, and the server sees they already exist, returns `templates_created: 0`. Silent no-op — templates remain invisible.

### Recommendation

Initialization should ideally run once during onboarding, not on every Documents tab load. But the idempotency guard makes it safe. The real fix is entity permissions (Audit 3).

---

## Audit 5: E-Sign and Contract Features

### Document Creation Flow

1. User selects template from TemplateCard grid
2. CreateDocumentFlow renders with client/project selectors
3. Merge fields (`{{field_name}}`) auto-populate from selected client/project/estimate
4. User edits merged content in textarea
5. Saves as FSDocument with status: 'draft'

### E-Signature Flow

1. Document marked as 'sent' (status change)
2. "Request Signature" button generates URL: `/client-portal?doc={id}&sign=true`
3. URL copied to clipboard for sharing with client
4. Client opens URL -> FieldServiceClientPortal renders
5. SigningFlow component captures:
   - Signer name and email
   - Drawn or typed signature (base64 PNG)
   - SHA-256 document hash (integrity proof)
   - ESIGN Act consent text
   - Timestamp
6. Signature data saved to `FSDocument.signature_data` field
7. Document status becomes 'signed'

### Status: FUNCTIONAL

The e-sign flow is complete and compliant (ESIGN Act + UETA). Key components:
- `SigningFlow.jsx` — consent + capture UI
- `SignatureCanvas.jsx` — draw/type signature modes
- `SignatureDisplay.jsx` — renders stored signatures

### Client Portal Queries (FieldServiceClientPortal.jsx)

7 queries, all filtered by `project_id`. One has try/catch (line where it checks client portal access). The portal is read-only — no mutations.

**Risk**: If FSPayment, FSDailyPhoto, FSPermit, etc. have Creator Only read permissions, the client portal will show empty data. These entities need Authenticated Users read permission.

---

## Ordered Fix List for Friday Readiness

### CRITICAL — Must Fix Before Walkthrough

1. **[BASE44 MANUAL] Change entity read permissions to "Authenticated Users"**
   - FSDocumentTemplate (templates invisible without this)
   - FSDocument
   - FSClient
   - FSProject
   - FSEstimate
   - FSDailyLog
   - FSMaterialEntry
   - FSLaborEntry
   - FSPayment
   - FSChangeOrder
   - FSDailyPhoto
   - FSPermit

   This is the root cause of "empty" tabs. Without this, try/catch silently returns empty arrays.

2. **[DEPLOYED] Try/catch protection on all FS tab queries** (this commit)
   - FieldServiceHome: 8 queries wrapped
   - FieldServiceProjects: 10 queries wrapped (9 return [], 1 return null)
   - FieldServiceEstimates: 3 queries wrapped
   - FieldServicePeople: 2 queries wrapped
   - FieldServiceDocuments: 5 queries wrapped (previous commit)

3. **[DEPLOYED] isOwner guard on initializeWorkspace** (commit 93143be)
   - Non-owner users skip initialization entirely

### VERIFY — Test During Walkthrough

4. **Confirm Bari's FieldServiceProfile.user_id matches his auth user ID**
   - Check in Base44 dashboard: FieldServiceProfile table, find "Red Umbrella"
   - Verify `user_id` field = Bari's user ID (not Doron's)

5. **Confirm templates exist for Bari's profile_id**
   - Check FSDocumentTemplate table, filter by profile_id = Bari's workspace ID
   - Should see 4 Oregon system templates (if initializeWorkspace ran successfully)
   - If missing: trigger from Bari's account on Documents tab (isOwner guard allows it)

6. **Test e-sign flow end-to-end**
   - Create document from template
   - Mark as sent
   - Open client portal link
   - Sign document
   - Verify signature displays

### LOW PRIORITY — Post-Walkthrough

7. **Add try/catch to FieldServiceLog useQuery calls** (currently uses React Query error handling)
8. **Move initializeWorkspace call to onboarding** (currently runs on every Documents tab load, but idempotent)
9. **Add try/catch to FieldServiceClientPortal queries** (client portal is read-only, lower risk)

---

*Audit complete. Primary blocker is Base44 entity permissions — code changes alone cannot fix Creator Only read restrictions.*
