// Hub member search — finds Community Pass members by email, name, or PIN
// Migrated from PunchPass to JoyCoins entities (DEC-041, 2026-02-07)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-spoke-api-key',
      }
    });
  }
  
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try {
      const text = await req.text();
      body = JSON.parse(text);
    } catch (parseError) {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const { query, spoke_id } = body;

    const apiKey = req.headers.get('x-spoke-api-key');

    if (!apiKey) {
      return Response.json({ error: 'Missing API key in x-spoke-api-key header' }, { status: 401 });
    }

    let spokes;
    if (spoke_id) {
      spokes = await base44.asServiceRole.entities.Spoke.filter({ spoke_id, api_key: apiKey, is_active: true });
    } else {
      spokes = await base44.asServiceRole.entities.Spoke.filter({ api_key: apiKey, is_active: true });
    }
    
    if (!spokes || spokes.length === 0) {
      return Response.json({ error: 'Invalid API key or spoke not found' }, { status: 401 });
    }

    if (!query) {
      return Response.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Search for users by email or name
    const lowerQuery = query.toLowerCase();
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let matchedUsers = allUsers.filter(user => 
      user.email?.toLowerCase().includes(lowerQuery) ||
      user.full_name?.toLowerCase().includes(lowerQuery)
    );

    // If query looks like a 4-digit PIN, also search by PIN hash
    if (/^\d{4}$/.test(query)) {
      const hashedQuery = await hashPin(query);
      const joyCoinsRecords = await base44.asServiceRole.entities.JoyCoins.filter({ pin_hash: hashedQuery });
      
      if (joyCoinsRecords.length > 0) {
        const pinUsers = await Promise.all(
          joyCoinsRecords.map(jc => base44.asServiceRole.entities.User.get(jc.user_id))
        );
        
        const existingIds = new Set(matchedUsers.map(u => u.id));
        pinUsers.forEach(user => {
          if (user && !existingIds.has(user.id)) {
            matchedUsers.push(user);
          }
        });
      }
    }

    // Get Joy Coin balances for matched users
    const members = await Promise.all(
      matchedUsers.map(async (user) => {
        const joyCoinsRecords = await base44.asServiceRole.entities.JoyCoins.filter({ user_id: user.id });
        const joyCoins = joyCoinsRecords[0];
        
        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          joy_coin_balance: joyCoins?.balance || 0,
          has_pin: !!(joyCoins?.pin_hash)
        };
      })
    );

    return Response.json({ members }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Search member error:', error);
    return Response.json({ 
      error: error.message
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
});
