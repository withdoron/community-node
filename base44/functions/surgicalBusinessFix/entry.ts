import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Surgical fix for three Business records with malformed service_area.
// Record 1 (NH systems) uses raw REST fetch to bypass SDK read-validate cycle.
// Records 2 & 3 use SDK filter (on clean records) + raw REST write.

const APP_ID = Deno.env.get('BASE44_APP_ID');

async function rawPatch(id, fields, authHeader) {
  // Probe multiple URL patterns and methods to find what Base44 REST accepts
  const attempts = [
    { method: 'PATCH', url: `https://base44.app/api/apps/${APP_ID}/entities/Business/records/${id}` },
    { method: 'PUT',   url: `https://base44.app/api/apps/${APP_ID}/entities/Business/records/${id}` },
    { method: 'POST',  url: `https://base44.app/api/apps/${APP_ID}/entities/Business/records/${id}` },
    { method: 'PATCH', url: `https://base44.app/api/apps/${APP_ID}/entities/Business/${id}` },
    { method: 'PUT',   url: `https://base44.app/api/apps/${APP_ID}/entities/Business/${id}` },
  ];
  const results = [];
  for (const a of attempts) {
    const res = await fetch(a.url, {
      method: a.method,
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify(fields),
    });
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
    results.push({ method: a.method, url: a.url, status: res.status, body });
    if (res.status < 300) return { status: res.status, body, attempt: a };
  }
  return { status: 'all_failed', results };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { record } = body;
    const authHeader = req.headers.get('authorization') || '';

    // ── Record 0: Probe — look up NH systems by name to confirm ID ──────────
    if (record === 0) {
      const entities = base44.asServiceRole.entities;
      // Filter by owner_email=doron.bsg@gmail.com, look for NH-related names
      let results = [];
      try {
        results = await entities.Business.filter({ owner_email: 'nadav@example.com' });
      } catch (e1) {
        results = [{ filter_error: e1.message }];
      }
      // Also try listing by name directly via REST GET
      // Inspect base44 SDK object to find the server URL it uses
      const sdkKeys = Object.keys(base44);
      const sdkStringified = JSON.stringify(base44, (k, v) => typeof v === 'function' ? '[fn]' : v, 2).slice(0, 2000);
      const baseUrl = base44._baseUrl || base44.baseUrl || base44._serverUrl || base44.serverUrl || base44._config?.serverUrl || '(not found)';
      const getUrl = `https://base44.app/api/apps/${APP_ID}/entities/Business/records/69af3c17f68942d25938a5b1`;
      const getRes = await fetch(getUrl, { headers: { 'Authorization': authHeader } });
      const getText = await getRes.text();
      let getBody; try { getBody = JSON.parse(getText); } catch { getBody = { raw: getText.slice(0, 300) }; }
      return Response.json({ probe_results: results, rest_get_status: getRes.status, rest_get_body: getBody, sdk_base_url: baseUrl, sdk_keys: sdkKeys, sdk_sample: sdkStringified });
    }

    // ── Record 1: NH systems ─────────────────────────────────────────────────
    // Known id — raw REST PUT, no SDK read at all.
    if (record === 1) {
      const id = '69af3c17f68942d25938a5b1';
      const result = await rawPatch(id, {
        service_area: null,
        enabled_spaces: ['profile'],
      }, authHeader);
      return Response.json({
        record: 'NH systems',
        id,
        http_status: result.status,
        response_body: result.body,
        all_results: result.results,
        attempt: result.attempt,
      });
    }

    // ── Record 2: Danny Sikes — filter by owner_email then raw write ─────────
    if (record === 2) {
      const entities = base44.asServiceRole.entities;
      const matches = await entities.Business.filter({ owner_email: 'dannysikes.1@gmail.com' });
      const list = Array.isArray(matches) ? matches : [];
      if (list.length !== 1) {
        return Response.json({
          error: `Expected 1 match for dannysikes.1@gmail.com, got ${list.length}`,
          matches: list.map((b) => ({ id: b.id, name: b.name, owner_email: b.owner_email })),
        }, { status: 400 });
      }
      const id = list[0].id;
      const result = await rawPatch(id, {
        service_area: null,
        enabled_spaces: ['profile'],
      }, authHeader);
      return Response.json({
        record: 'Danny Sikes Construction',
        id,
        name_confirmed: list[0].name,
        http_status: result.status,
        response_body: result.body,
      });
    }

    // ── Record 3: Recess — filter by slug then raw write ─────────────────────
    if (record === 3) {
      const entities = base44.asServiceRole.entities;
      const matches = await entities.Business.filter({ slug: 'recess' });
      const list = Array.isArray(matches) ? matches : [];
      if (list.length !== 1) {
        return Response.json({
          error: `Expected 1 match for slug=recess, got ${list.length}`,
          matches: list.map((b) => ({ id: b.id, name: b.name, slug: b.slug })),
        }, { status: 400 });
      }
      const id = list[0].id;
      const result = await rawPatch(id, {
        service_area: ['eugene', 'springfield'],
        enabled_spaces: ['profile'],
      }, authHeader);
      return Response.json({
        record: 'Recess',
        id,
        name_confirmed: list[0].name,
        http_status: result.status,
        response_body: result.body,
      });
    }

    return Response.json({ error: 'Pass record: 1, 2, or 3' }, { status: 400 });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('surgicalBusinessFix error:', message);
    return Response.json({ error: message }, { status: 500 });
  }
});