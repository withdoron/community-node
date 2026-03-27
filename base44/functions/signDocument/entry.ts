import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// signDocument — handles e-signature saves from the unauthenticated client portal
// Called by ClientPortal.jsx when a client signs a document via portal link
// Uses asServiceRole to bypass entity permissions since the signer has no account

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { document_id, portal_token, signature_data } = await req.json();

  if (!document_id || !portal_token || !signature_data) {
    return Response.json({ error: 'Missing required fields: document_id, portal_token, signature_data' }, { status: 400 });
  }

  try {
    // Fetch document via service role — bypasses Creator Only permissions
    const doc = await base44.asServiceRole.entities.FSDocument.get(document_id);
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Validate portal token matches
    if (doc.portal_token !== portal_token) {
      return Response.json({ error: 'Invalid signing link' }, { status: 403 });
    }

    // Validate document is in a signable state (awaiting_signature or legacy "sent")
    const signableStatuses = ['awaiting_signature', 'sent'];
    if (!signableStatuses.includes(doc.status)) {
      return Response.json({ error: 'Document is not awaiting signature' }, { status: 400 });
    }

    // Validate portal link is still active (not recalled)
    if (doc.portal_link_active === false) {
      return Response.json({ error: 'This signing link has been recalled' }, { status: 400 });
    }

    // Update document with signature data
    const updated = await base44.asServiceRole.entities.FSDocument.update(document_id, {
      status: 'signed',
      signature_data: signature_data,
      signed_at: new Date().toISOString(),
      portal_link_active: false,
    });

    return Response.json({ success: true, document: updated });
  } catch (error) {
    console.error('signDocument error:', error);
    return Response.json({ error: error.message || 'Failed to save signature' }, { status: 500 });
  }
});