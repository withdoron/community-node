// Joy Coin PIN management — sets or updates the check-in PIN for a Community Pass member
// Migrated from setPunchPassPin.ts (DEC-041, 2026-02-07)

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
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pin } = await req.json();

    if (!pin || !/^\d{4}$/.test(pin)) {
      return Response.json({ 
        error: 'PIN must be exactly 4 digits' 
      }, { status: 400 });
    }

    const hashedPin = await hashPin(pin);

    // Find existing JoyCoins record or create one
    const existing = await base44.entities.JoyCoins.filter({ user_id: user.id });
    
    if (existing.length > 0) {
      await base44.entities.JoyCoins.update(existing[0].id, {
        pin_hash: hashedPin
      });
    } else {
      await base44.entities.JoyCoins.create({
        user_id: user.id,
        pin_hash: hashedPin,
        balance: 0,
        lifetime_earned: 0,
        lifetime_spent: 0
      });
    }

    return Response.json({ 
      success: true,
      message: 'PIN set successfully'
    });

  } catch (error) {
    console.error('Set PIN error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
