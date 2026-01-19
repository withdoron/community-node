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

    // Parse request body first
    const { query, spoke_id } = await req.json();

    if (!spoke_id) {
      return Response.json({ error: 'spoke_id is required' }, { status: 400 });
    }

    // Authenticate spoke using Bearer token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);

    // Look up spoke by spoke_id and verify API key
    const spokes = await base44.asServiceRole.entities.Spoke.filter({ spoke_id, is_active: true });
    
    if (!spokes || spokes.length === 0) {
      return Response.json({ error: 'Spoke not found' }, { status: 404 });
    }

    const spoke = spokes[0];
    if (spoke.api_key !== apiKey) {
      return Response.json({ error: 'Invalid API key for this spoke' }, { status: 401 });
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
      const punchPasses = await base44.asServiceRole.entities.PunchPass.filter({ pin_hash: hashedQuery });
      
      if (punchPasses.length > 0) {
        const pinUsers = await Promise.all(
          punchPasses.map(pp => base44.asServiceRole.entities.User.get(pp.user_id))
        );
        
        // Merge PIN matches with existing matches (avoid duplicates)
        const existingIds = new Set(matchedUsers.map(u => u.id));
        pinUsers.forEach(user => {
          if (user && !existingIds.has(user.id)) {
            matchedUsers.push(user);
          }
        });
      }
    }

    // Get punch pass data for matched users
    const members = await Promise.all(
      matchedUsers.map(async (user) => {
        const punchPasses = await base44.asServiceRole.entities.PunchPass.filter({ user_id: user.id });
        const punchPass = punchPasses[0];
        
        return {
          id: user.id,
          name: user.full_name,
          email: user.email,
          punch_balance: punchPass?.current_balance || 0,
          has_pin: !!(punchPass?.pin_hash)
        };
      })
    );

    return Response.json({ members });

  } catch (error) {
    console.error('Search member error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});