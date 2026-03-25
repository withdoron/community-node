import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { feedback_id } = await req.json();

    if (!feedback_id) {
      return Response.json({ error: 'feedback_id is required' }, { status: 400 });
    }

    await base44.asServiceRole.entities.FeedbackLog.delete(feedback_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});