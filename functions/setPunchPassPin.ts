// MIGRATION NOTE: This function operates on the PunchPass Base44 entity.
// When Joy Coins entity fully replaces PunchPass, rename to setJoyCoinPin.ts
// and update entity references. See DEC-041, PUNCH-PASS-AUDIT.md.

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

    // Validate PIN format (4 digits)
    if (!pin || !/^\d{4}$/.test(pin)) {
      return Response.json({ 
        error: 'PIN must be exactly 4 digits' 
      }, { status: 400 });
    }

    // Hash the PIN
    const hashedPin = await hashPin(pin);

    // Find existing punch pass or create new one
    const existingPasses = await base44.entities.PunchPass.filter({ user_id: user.id });
    
    if (existingPasses.length > 0) {
      // Update existing
      await base44.entities.PunchPass.update(existingPasses[0].id, {
        pin_hash: hashedPin
      });
    } else {
      // Create new
      await base44.entities.PunchPass.create({
        user_id: user.id,
        pin_hash: hashedPin,
        current_balance: 0
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