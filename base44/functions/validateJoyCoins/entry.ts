// Joy Coin check-in validation — verifies PIN and deducts coins at point of check-in
// Migrated from validatePunchPass.ts (DEC-041, 2026-02-07)

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

    const body = await req.json();
    const { action, user_email, pin, event_id, event_title, event_date, location, coin_cost = 1 } = body;

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

    // Find Joy Coins record
    const joyCoinsRecords = await base44.asServiceRole.entities.JoyCoins.filter({ user_id: user.id });
    const joyCoins = joyCoinsRecords[0];

    if (!joyCoins) {
      return Response.json({ 
        error: 'User does not have a Community Pass account. Please set up PIN first.' 
      }, { status: 404 });
    }

    // Verify PIN
    const hashedPin = await hashPin(pin);
    if (hashedPin !== joyCoins.pin_hash) {
      return Response.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    if (action === 'check_balance') {
      return Response.json({
        success: true,
        balance: joyCoins.balance,
        user_name: user.full_name
      });
    }

    if (action === 'deduct') {
      if (!event_id || !event_title) {
        return Response.json({ 
          error: 'Missing event details for coin deduction' 
        }, { status: 400 });
      }

      if (joyCoins.balance < coin_cost) {
        return Response.json({ 
          error: 'Insufficient Joy Coin balance',
          current_balance: joyCoins.balance,
          required: coin_cost
        }, { status: 400 });
      }

      const newBalance = joyCoins.balance - coin_cost;

      // Update balance
      await base44.asServiceRole.entities.JoyCoins.update(joyCoins.id, {
        balance: newBalance,
        lifetime_spent: (joyCoins.lifetime_spent || 0) + coin_cost
      });

      // Create immutable transaction record
      await base44.asServiceRole.entities.JoyCoinTransactions.create({
        user_id: user.id,
        type: 'redemption',
        amount: -coin_cost,
        balance_after: newBalance,
        event_id: event_id,
        note: `Check-in: ${event_title} at ${location || 'Unknown'}`
      });

      return Response.json({
        success: true,
        message: 'Joy Coins deducted successfully',
        new_balance: newBalance,
        coins_deducted: coin_cost,
        user_name: user.full_name
      });
    }

    return Response.json({ error: 'Invalid action. Use check_balance or deduct.' }, { status: 400 });

  } catch (error) {
    console.error('Joy Coin validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
