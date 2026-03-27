# Base44 Server Function: signDocument

> PRE-REQUISITE: Run this in the Base44 dashboard to create the signDocument server function.
> The client portal signing flow calls this function because unauthenticated portal visitors
> cannot update FSDocument records directly.

## Create Server Function

Create a new server function called `signDocument` with the following code:

```typescript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export default async function handler(req: Request) {
  const base44 = createClientFromRequest(req);
  const { document_id, portal_token, signature_data } = await req.json();

  // Validate required fields
  if (!document_id || !portal_token || !signature_data) {
    return new Response(JSON.stringify({ error: 'Missing required fields: document_id, portal_token, signature_data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch the document using service role to bypass permission restrictions
  const docs = await base44.asServiceRole.entities.FSDocument.filter({ id: document_id });
  const doc = Array.isArray(docs) ? docs[0] : docs;

  if (!doc) {
    return new Response(JSON.stringify({ error: 'Document not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate portal token matches
  if (doc.portal_token !== portal_token) {
    return new Response(JSON.stringify({ error: 'Invalid signing link' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate document is in signable state
  if (!doc.portal_link_active) {
    return new Response(JSON.stringify({ error: 'This signing link is no longer active' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Map "sent" to "awaiting_signature" for backward compatibility
  const currentStatus = doc.status === 'sent' ? 'awaiting_signature' : doc.status;
  if (currentStatus !== 'awaiting_signature') {
    return new Response(JSON.stringify({ error: 'Document is not awaiting signature' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Update the document with signature data using service role
  await base44.asServiceRole.entities.FSDocument.update(document_id, {
    status: 'signed',
    signature_data: JSON.stringify(signature_data),
    signed_at: signature_data.signed_at || new Date().toISOString(),
    portal_link_active: false,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## What This Does

1. Receives `document_id`, `portal_token`, and `signature_data` from the client portal
2. Fetches the FSDocument via `asServiceRole` (bypasses permission restrictions)
3. Validates the portal token matches the document's token
4. Validates the document is in a signable state (awaiting_signature or sent)
5. Validates the portal link is still active (not recalled)
6. Updates the document with the signature data via `asServiceRole`
7. Returns success/error response

## Security

- Portal token acts as a bearer token — only someone with the correct token can sign
- Token is generated when the owner sends for signature (crypto.randomUUID)
- Token is invalidated after signing (portal_link_active = false)
- Token is invalidated on recall (portal_link_active = false)
- No user authentication required — the token IS the auth
