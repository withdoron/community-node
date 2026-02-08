// Recommendation and Concern writes via service role — DEC-025 Phase 3c/3d
// Handles create, update, remove for Recommendation; create_concern for Concern.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const RECOMMENDATION_TYPES = ['nod', 'story', 'vouch'];
const RECOMMENDATION_UPDATE_FIELDS = ['content', 'service_used', 'photos', 'is_active'];

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
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { action, data, recommendation_id } = body;
    const Rec = base44.asServiceRole.entities.Recommendation;
    const ConcernEntity = base44.asServiceRole.entities.Concern;

    if (action === 'create_concern') {
      const payload = data as Record<string, unknown>;
      if (!payload || typeof payload !== 'object') {
        return Response.json({ error: 'data is required for create_concern' }, { status: 400 });
      }
      const business_id = payload.business_id as string;
      const description = (payload.description as string)?.trim();
      if (!business_id || !description) {
        return Response.json({ error: 'business_id and description are required' }, { status: 400 });
      }
      const sanitized = {
        business_id,
        user_id: user.id,
        user_name: (user.full_name as string) || (user.email as string) || '',
        description,
        desired_resolution: (payload.desired_resolution as string)?.trim() || undefined,
        approximate_date: (payload.approximate_date as string)?.trim() || undefined,
        category: (payload.category as string) || undefined,
        status: 'new',
      };
      const created = await ConcernEntity.create(sanitized);
      return Response.json(created);
    }

    if (action === 'create') {
      const payload = data as Record<string, unknown>;
      if (!payload || typeof payload !== 'object') {
        return Response.json({ error: 'data is required for create' }, { status: 400 });
      }
      if (payload.user_id !== user.id) {
        return Response.json({ error: 'user_id must match current user' }, { status: 403 });
      }
      const type = payload.type as string;
      if (!RECOMMENDATION_TYPES.includes(type)) {
        return Response.json({ error: 'type must be nod, story, or vouch' }, { status: 400 });
      }
      if (!payload.business_id) {
        return Response.json({ error: 'business_id is required' }, { status: 400 });
      }
      const sanitized: Record<string, unknown> = {
        business_id: payload.business_id,
        user_id: user.id,
        user_name: (user.full_name as string) || (user.email as string) || '',
        type,
        is_active: payload.is_active !== false,
      };
      if (payload.service_used !== undefined) sanitized.service_used = payload.service_used;
      if (payload.content !== undefined) sanitized.content = payload.content;
      if (payload.photos !== undefined) sanitized.photos = payload.photos;
      const created = await Rec.create(sanitized);
      return Response.json(created);
    }

    if (action === 'update') {
      if (!recommendation_id || typeof recommendation_id !== 'string') {
        return Response.json({ error: 'recommendation_id is required for update' }, { status: 400 });
      }
      const payload = (data as Record<string, unknown>) || {};
      const rec = await Rec.get(recommendation_id);
      if (!rec) {
        return Response.json({ error: 'Recommendation not found' }, { status: 404 });
      }
      if ((rec as { user_id?: string }).user_id !== user.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const updates: Record<string, unknown> = {};
      for (const key of RECOMMENDATION_UPDATE_FIELDS) {
        if (payload[key] !== undefined) updates[key] = payload[key];
      }
      if (Object.keys(updates).length === 0) {
        return Response.json(rec);
      }
      const updated = await Rec.update(recommendation_id, updates);
      return Response.json(updated);
    }

    if (action === 'remove') {
      if (!recommendation_id || typeof recommendation_id !== 'string') {
        return Response.json({ error: 'recommendation_id is required for remove' }, { status: 400 });
      }
      const rec = await Rec.get(recommendation_id);
      if (!rec) {
        return Response.json({ error: 'Recommendation not found' }, { status: 404 });
      }
      const recUserId = (rec as { user_id?: string }).user_id;
      if (recUserId !== user.id && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      await Rec.update(recommendation_id, { is_active: false });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('manageRecommendation error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
