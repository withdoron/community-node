import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Workspace → profile entity + user_id field
const WORKSPACE_PROFILE_MAP = {
  'field-service': { entity: 'FieldServiceProfile', userField: 'user_id' },
  'finance':       { entity: 'FinancialProfile',    userField: 'user_id' },
  'team':          { entity: 'Team',                userField: 'user_id' },
  'property-pulse':{ entity: 'PMPropertyProfile',   userField: 'user_id' },
};

// Profile entities — queried directly by user_id
const PROFILE_ENTITIES = new Set([
  'FieldServiceProfile',
  'FinancialProfile',
  'Team',
  'PMPropertyProfile',
]);

// Entity → { fkField, workspace }
const ENTITY_CONFIG = {
  // Field Service
  FSProject:          { fkField: 'profile_id', workspace: 'field-service' },
  FSEstimate:         { fkField: 'profile_id', workspace: 'field-service' },
  FSClient:           { fkField: 'workspace_id', workspace: 'field-service' },
  FSDocument:         { fkField: 'profile_id', workspace: 'field-service' },
  FSDailyLog:         { fkField: 'profile_id', workspace: 'field-service' },
  FSPayment:          { fkField: 'profile_id', workspace: 'field-service' },
  FSMaterialEntry:    { fkField: 'profile_id', workspace: 'field-service' },
  FSLaborEntry:       { fkField: 'profile_id', workspace: 'field-service' },
  FSChangeOrder:      { fkField: 'profile_id', workspace: 'field-service' },
  FSPermit:           { fkField: 'profile_id', workspace: 'field-service' },
  FieldServiceProfile:{ fkField: 'user_id',    workspace: 'field-service', isProfile: true },

  // Finance
  Transaction:        { fkField: 'profile_id', workspace: 'finance' },
  RecurringTransaction:{ fkField: 'profile_id', workspace: 'finance' },
  Debt:               { fkField: 'profile_id', workspace: 'finance' },
  DebtPayment:        { fkField: 'profile_id', workspace: 'finance' },
  FinancialProfile:   { fkField: 'user_id',    workspace: 'finance', isProfile: true },

  // Team
  TeamMember:         { fkField: 'team_id', workspace: 'team' },
  Play:               { fkField: 'team_id', workspace: 'team' },
  PlayAssignment:     { fkField: 'team_id', workspace: 'team' },
  TeamEvent:          { fkField: 'team_id', workspace: 'team' },
  TeamMessage:        { fkField: 'team_id', workspace: 'team' },
  QuizAttempt:        { fkField: 'team_id', workspace: 'team' },
  PlayerStats:        { fkField: 'team_id', workspace: 'team' },
  Team:               { fkField: 'user_id', workspace: 'team', isProfile: true },

  // Property Management
  PMPropertyGroup:    { fkField: 'profile_id', workspace: 'property-pulse' },
  PMProperty:         { fkField: 'profile_id', workspace: 'property-pulse' },
  PMOwner:            { fkField: 'profile_id', workspace: 'property-pulse' },
  PMOwnershipStake:   { fkField: 'profile_id', workspace: 'property-pulse' },
  PMDistributionSplit:{ fkField: 'profile_id', workspace: 'property-pulse' },
  PMExpense:          { fkField: 'profile_id', workspace: 'property-pulse' },
  PMLaborEntry:       { fkField: 'profile_id', workspace: 'property-pulse' },
  PMMaintenanceRequest:{ fkField: 'profile_id', workspace: 'property-pulse' },
  PMSettlement:       { fkField: 'profile_id', workspace: 'property-pulse' },
  PMListing:          { fkField: 'profile_id', workspace: 'property-pulse' },
  PMGuest:            { fkField: 'profile_id', workspace: 'property-pulse' },
  PMPropertyProfile:  { fkField: 'user_id',    workspace: 'property-pulse', isProfile: true },

  // Platform
  Business:           { fkField: 'owner_user_id', workspace: 'platform', isPlatform: true },
  Event:              { fkField: 'created_by',    workspace: 'platform', isPlatform: true },
  ServiceFeedback:    { fkField: 'user_id',       workspace: 'platform', isPlatform: true },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate the user automatically from the request context
    let user;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (!user) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const user_id = user.id;

    const body = await req.json();
    const { action, workspace, entity, filters = {} } = body;

    if (action !== 'query') {
      return Response.json({ success: false, error: 'Only action "query" is supported' }, { status: 400 });
    }
    if (!entity) {
      return Response.json({ success: false, error: 'entity is required' }, { status: 400 });
    }

    const config = ENTITY_CONFIG[entity];
    if (!config) {
      return Response.json({ success: false, error: `Unknown entity: ${entity}` }, { status: 400 });
    }

    const entities = base44.asServiceRole.entities;

    // Platform entities — filter by their user field directly
    if (config.isPlatform) {
      const all = await entities[entity].list();
      let records = all.filter(r => r[config.fkField] === user_id);
      if (Object.keys(filters).length > 0) {
        records = records.filter(r => Object.entries(filters).every(([k, v]) => r[k] === v));
      }
      return Response.json({ success: true, entity, workspace: 'platform', user_id: 'auto-detected', count: records.length, records });
    }

    // Profile entities — query directly by user_id
    if (config.isProfile || PROFILE_ENTITIES.has(entity)) {
      const all = await entities[entity].list();
      let records = all.filter(r => r[config.fkField] === user_id || r['user_id'] === user_id);
      if (Object.keys(filters).length > 0) {
        records = records.filter(r => Object.entries(filters).every(([k, v]) => r[k] === v));
      }
      return Response.json({ success: true, entity, workspace: config.workspace, user_id: 'auto-detected', count: records.length, records });
    }

    // Non-profile entities — find profile first, then scope
    const profileWorkspace = workspace || config.workspace;
    const profileMapping = WORKSPACE_PROFILE_MAP[profileWorkspace];
    if (!profileMapping) {
      return Response.json({ success: false, error: `Unknown workspace: ${profileWorkspace}` }, { status: 400 });
    }

    const allProfiles = await entities[profileMapping.entity].list();
    const userProfiles = allProfiles.filter(p => p[profileMapping.userField] === user_id);

    if (userProfiles.length === 0) {
      return Response.json({
        success: true, entity, workspace: profileWorkspace,
        user_id: 'auto-detected',
        count: 0, records: [],
        message: 'No workspace found for this user'
      });
    }

    const profileIds = userProfiles.map(p => p.id);
    const primaryProfileId = profileIds[0];

    const allRecords = await entities[entity].list();
    let records = allRecords.filter(r => profileIds.includes(r[config.fkField]));

    if (Object.keys(filters).length > 0) {
      records = records.filter(r => Object.entries(filters).every(([k, v]) => r[k] === v));
    }

    return Response.json({
      success: true,
      entity,
      workspace: profileWorkspace,
      user_id: 'auto-detected',
      profile_id: primaryProfileId,
      count: records.length,
      records,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});