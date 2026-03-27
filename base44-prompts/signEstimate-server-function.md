# Base44 Server Function: signEstimate

> PRE-REQUISITE: Run this in the Base44 dashboard to create the signEstimate server function.
> Mirrors the signDocument pattern. Unauthenticated portal visitors call this to save
> their signature on an estimate.

## CRITICAL: Function Name

The function MUST be named exactly `signEstimate` (camelCase, no spaces).
The client-side code calls `invokeUnauthenticated('signEstimate', ...)` — the name must match exactly.

## CRITICAL: signature_data Must Be Stringified

The FSEstimate.signature_data entity field is a TEXT field. The signature_data arrives
as a JS object from `req.json()`. You MUST `JSON.stringify()` it before saving.

## Create Server Function

Create a new server function called `signEstimate` with the following code:

```typescript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// signEstimate — handles e-signature saves from unauthenticated client portal.
// Mirrors signDocument pattern. Uses asServiceRole to bypass permissions.
// Portal token acts as authentication for the signing request.
// NOTE: Do NOT call base44.auth.me() or any auth-dependent method.

export default async function handler(req: Request) {
  const base44 = createClientFromRequest(req);
  const { estimate_id, portal_token, signature_data } = await req.json();

  // Validate required fields
  if (!estimate_id || !portal_token || !signature_data) {
    return new Response(JSON.stringify({ error: 'Missing required fields: estimate_id, portal_token, signature_data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch the estimate using service role to bypass permission restrictions
    const est = await base44.asServiceRole.entities.FSEstimate.get(estimate_id);

    if (!est) {
      return new Response(JSON.stringify({ error: 'Estimate not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate portal token matches
    if (est.portal_token !== portal_token) {
      return new Response(JSON.stringify({ error: 'Invalid signing link' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate estimate is in signable state
    const signableStatuses = ['sent', 'awaiting_signature'];
    if (!signableStatuses.includes(est.status)) {
      return new Response(JSON.stringify({ error: 'Estimate is not awaiting signature' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate the portal link is still active (not recalled)
    if (est.portal_link_active === false) {
      return new Response(JSON.stringify({ error: 'This signing link has been recalled' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: signature_data arrives as a JS object — MUST stringify for the text field
    const signedAt = (typeof signature_data === 'object' ? signature_data.signed_at : null) || new Date().toISOString();
    const sigDataString = typeof signature_data === 'string' ? signature_data : JSON.stringify(signature_data);

    // Update the estimate with signature data using service role
    await base44.asServiceRole.entities.FSEstimate.update(estimate_id, {
      status: 'signed',
      signature_data: sigDataString,
      signed_at: signedAt,
      portal_link_active: false,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('signEstimate error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to save signature' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

## What This Does

1. Receives `estimate_id`, `portal_token`, and `signature_data` from the client portal
2. Fetches the FSEstimate via `asServiceRole` (bypasses permission restrictions)
3. Validates the portal token matches the estimate's token
4. Validates the estimate is in a signable state (sent or awaiting_signature)
5. Validates the portal link is still active (not recalled)
6. JSON.stringifies signature_data (entity field is text, not JSON)
7. Updates the estimate with the signature data via `asServiceRole`
8. Returns success/error response

## Security

- Portal token acts as a bearer token — only someone with the correct token can sign
- Token is generated when the owner sends the estimate (crypto.randomUUID)
- Token is invalidated after signing (portal_link_active = false)
- Token is invalidated on recall (portal_link_active = false)
- No user authentication required — the token IS the auth

## FSEstimate Entity — New Fields Required

Add these fields to the existing FSEstimate entity BEFORE deploying this function:

| Field | Type | Description |
|-------|------|-------------|
| portal_token | text | Unique token for client signing link |
| portal_link_active | boolean | Whether the signing link is currently valid |
| sent_for_signature_at | text | ISO datetime when sent for signature |
| recalled_at | text | ISO datetime if recalled |
| signed_at | text | ISO datetime when client signed |
