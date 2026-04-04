import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const envKey = Deno.env.get("MYCELIA_API_KEY");

    if (!envKey) {
      return Response.json({ error: 'Server config error: MYCELIA_API_KEY not set' }, { status: 500 });
    }

    let action;

    if (req.method === 'GET') {
      const queryKey = url.searchParams.get('key');
      const queryAction = url.searchParams.get('action');
      if (!queryKey || queryKey !== envKey) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!queryAction) {
        return Response.json({
          error: 'Missing action',
          available_actions: ['feedback', 'health', 'documents', 'estimates', 'projects', 'agents', 'gardeners']
        }, { status: 400 });
      }
      action = queryAction;
    } else {
      const apiKey = req.headers.get('x-api-key');
      if (!apiKey || apiKey !== envKey) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const body = await req.json();
      action = body.action;
      if (!action) {
        return Response.json({
          error: 'Missing action',
          available_actions: ['feedback', 'health', 'documents', 'estimates', 'projects', 'agents', 'gardeners']
        }, { status: 400 });
      }
    }

    const base44 = createClientFromRequest(req);

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

    // ── Gardeners: per-user engagement profiles for Founding Gardener identification ──
    // PERFORMANCE: Queries many entities via .list(). Fine for <50 users. At 200+ users, add caching.
    if (action === 'gardeners') {
      const [
        users, teamMembers, feedback, photos, messages, events,
        plays, quizAttempts, notes, documents, businesses,
        fsProfiles, finProfiles, pmProfiles, teams,
      ] = await Promise.all([
        base44.asServiceRole.entities.User.list(),
        base44.asServiceRole.entities.TeamMember.list(),
        base44.asServiceRole.entities.ServiceFeedback.list(),
        base44.asServiceRole.entities.TeamPhoto.list().catch(() => []),
        base44.asServiceRole.entities.TeamMessage.list(),
        base44.asServiceRole.entities.TeamEvent.list(),
        base44.asServiceRole.entities.Play.list(),
        base44.asServiceRole.entities.QuizAttempt.list(),
        base44.asServiceRole.entities.MylaneNote.list().catch(() => []),
        base44.asServiceRole.entities.FSDocument.list(),
        base44.asServiceRole.entities.Business.list(),
        base44.asServiceRole.entities.FieldServiceProfile.list(),
        base44.asServiceRole.entities.FinancialProfile.list(),
        base44.asServiceRole.entities.PMPropertyProfile.list().catch(() => []),
        base44.asServiceRole.entities.Team.list(),
      ]);

      const safe = (arr) => Array.isArray(arr) ? arr : [];
      const uid = (record, field = 'user_id') => String(record?.[field] || '');

      // Build per-user profiles
      const userMap = {};
      safe(users).forEach(u => {
        const id = String(u.id);
        userMap[id] = {
          user_id: id,
          display_name: u.display_name || u.full_name || u.email || 'Unknown',
          email: u.email || '',
          joined_date: u.created_date || u.created_at || '',
          spaces_created: 0,
          teams_joined: 0,
          feedback_count: 0,
          photos_shared: 0,
          messages_posted: 0,
          events_created: 0,
          plays_created: 0,
          quiz_attempts: 0,
          reminders_created: 0,
          documents_created: 0,
          weeks_active: 0,
          last_active: '',
          _activity_dates: [],
        };
      });

      const inc = (userId, field, date) => {
        const u = userMap[String(userId)];
        if (!u) return;
        u[field] = (u[field] || 0) + 1;
        if (date) u._activity_dates.push(date);
      };

      // Spaces created: count profiles owned
      safe(teams).forEach(t => inc(uid(t, 'owner_id'), 'spaces_created', t.created_date));
      safe(businesses).forEach(b => inc(uid(b, 'owner_user_id'), 'spaces_created', b.created_date));
      safe(fsProfiles).forEach(p => inc(uid(p), 'spaces_created', p.created_date));
      safe(finProfiles).forEach(p => inc(uid(p), 'spaces_created', p.created_date));
      safe(pmProfiles).forEach(p => inc(uid(p), 'spaces_created', p.created_date));

      // Teams joined
      safe(teamMembers).forEach(m => inc(uid(m), 'teams_joined', m.created_date));

      // Feedback given
      safe(feedback).forEach(f => inc(uid(f), 'feedback_count', f.created_date));

      // Photos shared
      safe(photos).forEach(p => inc(uid(p, 'uploaded_by'), 'photos_shared', p.created_date));

      // Messages posted
      safe(messages).forEach(m => inc(uid(m), 'messages_posted', m.created_date || m.created_at));

      // Events created
      safe(events).forEach(e => inc(uid(e, 'created_by'), 'events_created', e.created_date));

      // Plays created
      safe(plays).forEach(p => inc(uid(p, 'created_by'), 'plays_created', p.created_date));

      // Quiz attempts
      safe(quizAttempts).forEach(q => inc(uid(q), 'quiz_attempts', q.created_date));

      // Reminders
      safe(notes).forEach(n => inc(uid(n), 'reminders_created', n.created_date));

      // Documents
      safe(documents).forEach(d => inc(uid(d, 'created_by'), 'documents_created', d.created_date));

      // Calculate weeks_active and last_active per user
      // Weights: spaces=10, feedback=5, weeks=3, content=2, participation=1
      const gardeners = Object.values(userMap).map((u) => {
        const dates = (u._activity_dates || []).filter(Boolean).map(d => new Date(d));
        const weeks = new Set(dates.map(d => `${d.getFullYear()}-W${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7)}`));
        u.weeks_active = weeks.size;
        u.last_active = dates.length > 0 ? dates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString().split('T')[0] : '';
        delete u._activity_dates;

        u.gardener_score =
          (u.spaces_created * 10) +
          (u.feedback_count * 5) +
          (u.weeks_active * 3) +
          (u.photos_shared * 2) +
          (u.messages_posted * 2) +
          (u.plays_created * 2) +
          (u.events_created * 2) +
          (u.quiz_attempts * 1) +
          (u.teams_joined * 1) +
          (u.reminders_created * 1) +
          (u.documents_created * 1);

        return u;
      });

      // Sort by score descending, filter out zero-activity users
      const active = gardeners.filter(u => u.gardener_score > 0).sort((a, b) => b.gardener_score - a.gardener_score);

      return Response.json({
        action: 'gardeners',
        timestamp: new Date().toISOString(),
        total_users: safe(users).length,
        active_users: active.length,
        users: active,
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
      available_actions: ['feedback', 'health', 'documents', 'estimates', 'projects', 'agents', 'gardeners']
    }, { status: 400 });

  } catch (error) {
    console.error('platformPulse error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});