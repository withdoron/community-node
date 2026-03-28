import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const API_KEY = Deno.env.get("MYCELIA_API_KEY");
    if (!API_KEY) {
      return Response.json({ error: 'Server config error: MYCELIA_API_KEY not set' }, { status: 500 });
    }

    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== API_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return Response.json({
        error: 'Missing action',
        available_actions: ['feedback', 'health', 'documents', 'estimates', 'projects', 'agents']
      }, { status: 400 });
    }

    if (action === 'feedback') {
      const feedback = await base44.asServiceRole.entities.ServiceFeedback.list();
      return Response.json({
        action: 'feedback',
        count: (feedback || []).length,
        records: (feedback || []).map(f => ({
          id: f.id, feedback_text: f.feedback_text, context: f.context,
          user_id: f.user_id, workspace_id: f.workspace_id, status: f.status, created_date: f.created_date
        }))
      });
    }

    if (action === 'health') {
      const [businesses, users, projects, estimates, documents, feedback] = await Promise.all([
        base44.asServiceRole.entities.Business.list(),
        base44.asServiceRole.entities.User.list(),
        base44.asServiceRole.entities.FSProject.list(),
        base44.asServiceRole.entities.FSEstimate.list(),
        base44.asServiceRole.entities.FSDocument.list(),
        base44.asServiceRole.entities.ServiceFeedback.list(),
      ]);
      return Response.json({
        action: 'health', timestamp: new Date().toISOString(),
        counts: {
          businesses: (businesses || []).length,
          claimed_businesses: (businesses || []).filter(b => b.owner_user_id).length,
          users: (users || []).length,
          projects: (projects || []).length,
          active_projects: (projects || []).filter(p => p.status === 'active').length,
          estimates: (estimates || []).length,
          documents: (documents || []).length,
          feedback_items: (feedback || []).length,
          new_feedback: (feedback || []).filter(f => f.status === 'new').length,
        }
      });
    }

    if (action === 'documents') {
      const documents = await base44.asServiceRole.entities.FSDocument.list();
      return Response.json({
        action: 'documents', total: (documents || []).length,
        by_status: {
          draft: (documents || []).filter(d => d.status === 'draft').length,
          sent: (documents || []).filter(d => d.status === 'sent').length,
          awaiting_signature: (documents || []).filter(d => d.status === 'awaiting_signature').length,
          signed: (documents || []).filter(d => d.status === 'signed').length,
        },
        awaiting_signature: (documents || []).filter(d => d.status === 'awaiting_signature').map(d => ({
          id: d.id, title: d.title, client_name: d.client_name, sent_for_signature_at: d.sent_for_signature_at,
        }))
      });
    }

    if (action === 'estimates') {
      const estimates = await base44.asServiceRole.entities.FSEstimate.list();
      return Response.json({
        action: 'estimates', total: (estimates || []).length,
        by_status: {
          draft: (estimates || []).filter(e => e.status === 'draft').length,
          sent: (estimates || []).filter(e => e.status === 'sent').length,
          awaiting_signature: (estimates || []).filter(e => e.status === 'awaiting_signature').length,
          signed: (estimates || []).filter(e => e.status === 'signed').length,
          accepted: (estimates || []).filter(e => e.status === 'accepted').length,
          declined: (estimates || []).filter(e => e.status === 'declined').length,
        },
        total_value: (estimates || []).reduce((sum, e) => sum + (parseFloat(e.total) || 0), 0),
      });
    }

    if (action === 'projects') {
      const projects = await base44.asServiceRole.entities.FSProject.list();
      return Response.json({
        action: 'projects', total: (projects || []).length,
        by_status: {
          active: (projects || []).filter(p => p.status === 'active').length,
          completed: (projects || []).filter(p => p.status === 'completed').length,
          on_hold: (projects || []).filter(p => p.status === 'on_hold').length,
        },
        projects: (projects || []).slice(0, 20).map(p => ({
          id: p.id, name: p.name, client_name: p.client_name, status: p.status, budget: p.budget,
        }))
      });
    }

    if (action === 'agents') {
      const feedback = await base44.asServiceRole.entities.ServiceFeedback.list();
      const newFeedback = (feedback || []).filter(f => f.status === 'new');
      const byWorkspace = {};
      newFeedback.forEach(f => {
        const ws = f.workspace_id || 'unknown';
        if (!byWorkspace[ws]) byWorkspace[ws] = [];
        byWorkspace[ws].push({ feedback_text: f.feedback_text, context: f.context, created_date: f.created_date });
      });
      return Response.json({ action: 'agents', total_new_feedback: newFeedback.length, by_workspace: byWorkspace });
    }

    return Response.json({
      error: 'Unknown action',
      available_actions: ['feedback', 'health', 'documents', 'estimates', 'projects', 'agents']
    }, { status: 400 });

  } catch (error) {
    console.error('platformPulse error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});