import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate spoke using Bearer token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);
    const spokes = await base44.asServiceRole.entities.Spoke.filter({ api_key: apiKey, is_active: true });
    
    if (!spokes || spokes.length === 0) {
      return Response.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const spoke = spokes[0];

    // Parse request body
    const body = await req.json();
    const { action, user_email, pin, event_id, event_title, event_date, location, punch_cost = 1 } = body;

    if (!action || !user_email || !pin) {
      return Response.json({ 
        error: 'Missing required fields: action, user_email, pin' 
      }, { status: 400 });
    }

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const user = users[0];

    // Find or create punch pass record
    let punchPasses = await base44.asServiceRole.entities.PunchPass.filter({ user_id: user.id });
    let punchPass = punchPasses[0];

    if (!punchPass) {
      return Response.json({ 
        error: 'User does not have a punch pass account. Please set up PIN first.' 
      }, { status: 404 });
    }

    // Hash the provided PIN and verify
    const hashedPin = await hashPin(pin);
    if (hashedPin !== punchPass.pin_hash) {
      return Response.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    // Handle different actions
    if (action === 'check_balance') {
      return Response.json({
        success: true,
        balance: punchPass.current_balance,
        user_name: user.full_name
      });
    }

    if (action === 'deduct_punch') {
      if (!event_id || !event_title) {
        return Response.json({ 
          error: 'Missing event details for punch deduction' 
        }, { status: 400 });
      }

      // Check if user has enough punches
      if (punchPass.current_balance < punch_cost) {
        return Response.json({ 
          error: 'Insufficient punch pass balance',
          current_balance: punchPass.current_balance,
          required: punch_cost
        }, { status: 400 });
      }

      // Deduct punches
      const newBalance = punchPass.current_balance - punch_cost;
      await base44.asServiceRole.entities.PunchPass.update(punchPass.id, {
        current_balance: newBalance,
        total_used: (punchPass.total_used || 0) + punch_cost
      });

      // Record usage
      await base44.asServiceRole.entities.PunchPassUsage.create({
        user_id: user.id,
        punch_pass_id: punchPass.id,
        event_id,
        event_title,
        event_date: event_date || new Date().toISOString(),
        location: location || 'Unknown',
        punches_deducted: punch_cost,
        spoke_id: spoke.spoke_id,
        checked_in_by: body.checked_in_by || 'system'
      });

      return Response.json({
        success: true,
        message: 'Punch pass deducted successfully',
        new_balance: newBalance,
        punches_deducted: punch_cost,
        user_name: user.full_name
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Punch pass validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});