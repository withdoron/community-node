// Claim a spot on a Field Service workspace — bypasses Creator Only RLS
// Workers and subcontractors join via invite code, find their name in workers_json,
// and link their user_id to the matching entry.

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
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { invite_code, worker_name } = body;

    if (!invite_code || typeof invite_code !== 'string') {
      return Response.json({ error: 'invite_code is required' }, { status: 400 });
    }
    if (!worker_name || typeof worker_name !== 'string') {
      return Response.json({ error: 'worker_name is required — select your name from the roster' }, { status: 400 });
    }

    // Step 1: Find the workspace by invite code
    const profiles = await base44.asServiceRole.entities.FieldServiceProfile.filter({
      invite_code: invite_code.trim(),
    });
    const profileList = Array.isArray(profiles) ? profiles : [];
    const profile = profileList[0];

    if (!profile) {
      return Response.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Step 2: Parse workers_json
    let workers: Array<Record<string, unknown>> = [];
    const wj = profile.workers_json;
    if (Array.isArray(wj)) {
      workers = wj;
    } else if (wj && typeof wj === 'object' && Array.isArray((wj as Record<string, unknown>).items)) {
      workers = (wj as Record<string, unknown>).items as Array<Record<string, unknown>>;
    }

    // Step 3: Find matching worker by name (case-insensitive, trimmed)
    const targetName = (worker_name as string).trim().toLowerCase();
    const matchIndex = workers.findIndex(
      (w) => typeof w.name === 'string' && w.name.trim().toLowerCase() === targetName
    );

    if (matchIndex < 0) {
      return Response.json({ error: 'Your name was not found on the roster. Ask the workspace owner to add you first.' }, { status: 404 });
    }

    const match = workers[matchIndex];

    // Step 4: Check if already claimed
    if (match.user_id) {
      if (match.user_id === user.id) {
        return Response.json({ error: 'You have already claimed this spot.' }, { status: 409 });
      }
      return Response.json({ error: 'This spot has already been claimed by another user.' }, { status: 409 });
    }

    // Step 5: Check if this user already has a spot on this workspace
    const alreadyOnRoster = workers.some((w) => w.user_id === user.id);
    if (alreadyOnRoster) {
      return Response.json({ error: 'You already have a spot on this workspace.' }, { status: 409 });
    }

    // Step 6: Link user_id to the worker entry
    workers[matchIndex] = { ...match, user_id: user.id };

    // Step 7: Save back via service role
    await base44.asServiceRole.entities.FieldServiceProfile.update(profile.id as string, {
      workers_json: { items: workers },
    });

    return Response.json({
      success: true,
      workspace_id: profile.id,
      role: match.role || 'worker',
      workspace_name: profile.workspace_name || profile.business_name || 'Field Service',
    });
  } catch (error) {
    console.error('claimWorkspaceSpot error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
