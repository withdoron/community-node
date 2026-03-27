import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// signEstimate — handles e-signature saves from the unauthenticated client portal
// ALL entity operations use asServiceRole — the caller has no authentication token.
// The portal_token in the request body is the authentication mechanism.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { estimate_id, portal_token, signature_data } = await req.json();

    if (!estimate_id || !portal_token || !signature_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ALL operations use asServiceRole — bypasses Creator Only permissions
    const est = await base44.asServiceRole.entities.FSEstimate.get(estimate_id);
    if (!est) {
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }

    if (est.portal_token !== portal_token) {
      return Response.json({ error: 'Invalid signing link' }, { status: 403 });
    }

    const signableStatuses = ['awaiting_signature', 'sent'];
    if (!signableStatuses.includes(est.status)) {
      return Response.json({ error: 'Estimate is not awaiting signature' }, { status: 400 });
    }

    if (est.portal_link_active === false) {
      return Response.json({ error: 'This signing link has been recalled' }, { status: 400 });
    }

    // signature_data is JSON.stringify'd — entity field is text type, not object
    const updated = await base44.asServiceRole.entities.FSEstimate.update(estimate_id, {
      status: 'signed',
      signature_data: typeof signature_data === 'string' ? signature_data : JSON.stringify(signature_data),
      signed_at: new Date().toISOString(),
      portal_link_active: false,
    });

    return Response.json({ success: true, estimate: updated });
  } catch (error) {
    console.error('signEstimate error:', error);
    return Response.json({ error: error.message || 'Failed to save signature' }, { status: 500 });
  }
});