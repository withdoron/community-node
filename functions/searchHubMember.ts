import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  console.log('=== FUNCTION START ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  try {
    const base44 = createClientFromRequest(req);

    // Parse request body first
    let body;
    try {
      const text = await req.text();
      console.log('Raw body:', text);
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Body parse error:', parseError);
      return Response.json({ error: 'Invalid JSON in request body', details: parseError.message }, { status: 400 });
    }
    
    const { query, spoke_id } = body;

    // Authenticate spoke using Bearer token or api_key header
    let apiKey;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    } else {
      apiKey = req.headers.get('api_key');
    }

    // DEBUG: Log received headers and payload
    console.log('=== DEBUG: Incoming Request ===');
    console.log('Payload:', { query, spoke_id });
    console.log('Authorization header:', authHeader);
    console.log('api_key header:', req.headers.get('api_key'));
    console.log('Extracted apiKey:', apiKey);
    console.log('===============================');

    if (!apiKey) {
      return Response.json({ error: 'Missing API key in Authorization or api_key header' }, { status: 401 });
    }

    // Look up spoke by API key
    let spokes;
    if (spoke_id) {
      // If spoke_id provided, look up by both spoke_id and api_key
      spokes = await base44.asServiceRole.entities.Spoke.filter({ spoke_id, api_key: apiKey, is_active: true });
    } else {
      // Otherwise, look up by api_key only
      spokes = await base44.asServiceRole.entities.Spoke.filter({ api_key: apiKey, is_active: true });
    }
    
    if (!spokes || spokes.length === 0) {
      return Response.json({ error: 'Invalid API key or spoke not found' }, { status: 401 });
    }

    const spoke = spokes[0];

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
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      details: error.toString()
    }, { status: 500 });
  }
});