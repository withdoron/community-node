// Network application management — Harvest Network marketplace
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { action, data } = body as { action: string; data?: Record<string, unknown> };

    if (action === 'apply') {
      const { business_id, network_slug, message } = data || {};
      if (!business_id || !network_slug) {
        return Response.json({ error: 'business_id and network_slug required' }, { status: 400 });
      }
      // Verify user owns this business
      const business = await base44.asServiceRole.entities.Business.get(business_id as string);
      if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });
      if ((business as any).created_by !== user.id && (business as any).owner_user_id !== user.id) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
      // Check not already in network
      const networkIds = Array.isArray((business as any).network_ids) ? (business as any).network_ids : [];
      if (networkIds.includes(network_slug)) {
        return Response.json({ error: 'Already a member of this network' }, { status: 400 });
      }
      // Check no duplicate pending application
      // .list() then client-side filter — Base44 .filter() quirk returns empty on some entities
      const allApps = await base44.asServiceRole.entities.NetworkApplication.list();
      const duplicate = (allApps || []).find(
        (a: any) => a.business_id === business_id && a.network_slug === network_slug && a.status === 'pending'
      );
      if (duplicate) {
        return Response.json({ error: 'Application already pending' }, { status: 400 });
      }
      const application = await base44.asServiceRole.entities.NetworkApplication.create({
        business_id,
        business_name: (business as any).name || '',
        network_slug,
        status: 'pending',
        applied_at: new Date().toISOString(),
        applicant_message: message || '',
      });
      return Response.json(application);
    }

    if (action === 'review') {
      // Admin only
      if (user.email !== 'doron.bsg@gmail.com') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
      const { application_id, decision, notes } = data || {};
      if (!application_id || !decision) {
        return Response.json({ error: 'application_id and decision required' }, { status: 400 });
      }
      const app = await base44.asServiceRole.entities.NetworkApplication.get(application_id as string);
      if (!app) return Response.json({ error: 'Application not found' }, { status: 404 });

      await base44.asServiceRole.entities.NetworkApplication.update(application_id as string, {
        status: decision as string,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: (notes as string) || '',
      });

      // If approved, add network to business network_ids
      if (decision === 'approved') {
        const business = await base44.asServiceRole.entities.Business.get((app as any).business_id);
        if (business) {
          const currentNetworks = Array.isArray((business as any).network_ids) ? (business as any).network_ids : [];
          if (!currentNetworks.includes((app as any).network_slug)) {
            await base44.asServiceRole.entities.Business.update((app as any).business_id, {
              network_ids: [...currentNetworks, (app as any).network_slug],
            });
          }
        }
      }
      return Response.json({ success: true, status: decision });
    }

    if (action === 'list_pending') {
      if (user.email !== 'doron.bsg@gmail.com') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
      // .list() then client-side filter — Base44 .filter() quirk
      const all = await base44.asServiceRole.entities.NetworkApplication.list();
      const pending = (all || []).filter((a: any) => a.status === 'pending');
      return Response.json(pending);
    }

    if (action === 'my_applications') {
      const { business_id } = data || {};
      // .list() then client-side filter — Base44 .filter() quirk
      const all = await base44.asServiceRole.entities.NetworkApplication.list();
      const mine = (all || []).filter((a: any) => a.business_id === business_id);
      return Response.json(mine);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manageNetworkApplication error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
