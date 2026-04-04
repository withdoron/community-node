import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Workspace → profile entity + user field
const WORKSPACE_PROFILE_MAP = {
  'field-service': { entity: 'FieldServiceProfile', userField: 'user_id' },
  'finance':       { entity: 'FinancialProfile',    userField: 'user_id' },
  'team':          { entity: 'Team',                userField: 'owner_id' },
  'property-pulse':{ entity: 'PMPropertyProfile',   userField: 'user_id' },
  'meal-prep':     { entity: 'MealPrepProfile',     userField: 'user_id' },
};

// Profile entities — queried directly by user field
const PROFILE_ENTITIES = new Set([
  'FieldServiceProfile',
  'FinancialProfile',
  'Team',
  'PMPropertyProfile',
  'MealPrepProfile',
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
  TransactionCategory: { fkField: 'profile_id', workspace: 'finance' },
  FinancialProfile:   { fkField: 'user_id',    workspace: 'finance', isProfile: true },

  // Team
  TeamMember:         { fkField: 'team_id', workspace: 'team' },
  Play:               { fkField: 'team_id', workspace: 'team' },
  PlayAssignment:     { fkField: 'team_id', workspace: 'team' },
  TeamEvent:          { fkField: 'team_id', workspace: 'team' },
  TeamMessage:        { fkField: 'team_id', workspace: 'team' },
  QuizAttempt:        { fkField: 'team_id', workspace: 'team' },
  PlayerStats:        { fkField: 'team_id', workspace: 'team' },
  TeamPhoto:          { fkField: 'team_id', workspace: 'team' },
  Team:               { fkField: 'owner_id', workspace: 'team', isProfile: true },

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

  // Meal Prep
  Recipe:             { fkField: 'profile_id', workspace: 'meal-prep' },
  RecipeIngredient:   { fkField: 'profile_id', workspace: 'meal-prep' },
  MealPrepProfile:    { fkField: 'user_id',    workspace: 'meal-prep', isProfile: true },

  // Platform
  Business:           { fkField: 'owner_user_id', workspace: 'platform', isPlatform: true },
  Event:              { fkField: 'created_by',    workspace: 'platform', isPlatform: true },
  ServiceFeedback:    { fkField: 'user_id',       workspace: 'platform', isPlatform: true },
  MylaneNote:         { fkField: 'user_id',       workspace: 'platform', isPlatform: true },
};

// Safe string comparison — handles ObjectId, number, null, undefined
function idMatch(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

Deno.serve(async (req) => {
  try {
    var base44 = createClientFromRequest(req);
    var body = await req.json();
    var action = body.action;
    var user_id = body.user_id; // optional — fallback for MCP calls
    var workspace = body.workspace;
    var entity = body.entity;
    var filters = body.filters || {};

    // Validate required parameters
    if (action !== 'query') {
      return Response.json({ success: false, error: 'Only action "query" is supported' }, { status: 400 });
    }
    if (!entity) {
      return Response.json({ success: false, error: 'entity is required' }, { status: 400 });
    }

    var config = ENTITY_CONFIG[entity];
    if (!config) {
      return Response.json({ success: false, error: 'Unknown entity: ' + entity }, { status: 400 });
    }

    var entities = base44.asServiceRole.entities;

    // ── Resolve authenticated user ──
    // Primary: auth.me() for in-app agent calls
    // Fallback: user_id parameter for MCP calls
    var resolvedUserId = null;
    try {
      var me = await base44.auth.me();
      if (me && me.id) resolvedUserId = String(me.id);
    } catch (e) {
      // auth.me() failed — MCP fallback
    }
    if (!resolvedUserId && user_id) {
      resolvedUserId = String(user_id);
    }
    if (!resolvedUserId) {
      return Response.json({ success: false, error: 'Could not identify the authenticated user.' }, { status: 401 });
    }

    // Platform entities — filter by their user field directly
    if (config.isPlatform) {
      var all = await entities[entity].list();
      var records = all.filter(function(r) { return idMatch(r[config.fkField], resolvedUserId); });
      if (Object.keys(filters).length > 0) {
        records = records.filter(function(r) { return Object.entries(filters).every(function(e) { return r[e[0]] === e[1]; }); });
      }
      return Response.json({ success: true, entity: entity, workspace: 'platform', user_id: resolvedUserId, count: records.length, records: records });
    }

    // Profile entities — query directly by user field
    if (config.isProfile || PROFILE_ENTITIES.has(entity)) {
      var profileAll = await entities[entity].list();
      var profileRecords = profileAll.filter(function(r) { return idMatch(r[config.fkField], resolvedUserId) || idMatch(r['user_id'], resolvedUserId); });
      if (Object.keys(filters).length > 0) {
        profileRecords = profileRecords.filter(function(r) { return Object.entries(filters).every(function(e) { return r[e[0]] === e[1]; }); });
      }

      return Response.json({ success: true, entity: entity, workspace: config.workspace, user_id: resolvedUserId, count: profileRecords.length, records: profileRecords });
    }

    // Non-profile entities — find profile first, then scope
    var profileWorkspace = workspace || config.workspace;
    var profileMapping = WORKSPACE_PROFILE_MAP[profileWorkspace];
    if (!profileMapping) {
      return Response.json({ success: false, error: 'Unknown workspace: ' + profileWorkspace }, { status: 400 });
    }

    var allProfiles = await entities[profileMapping.entity].list();
    var userProfiles = allProfiles.filter(function(p) { return idMatch(p[profileMapping.userField], resolvedUserId); });

    if (userProfiles.length === 0) {
      return Response.json({
        success: true, entity: entity, workspace: profileWorkspace,
        user_id: resolvedUserId,
        count: 0, records: [],
        message: 'No workspace found for this user',
      });
    }

    var profileIds = userProfiles.map(function(p) { return String(p.id); });
    var primaryProfileId = profileIds[0];

    var allRecords = await entities[entity].list();
    var scopedRecords = allRecords.filter(function(r) { return profileIds.some(function(pid) { return idMatch(r[config.fkField], pid); }); });

    if (Object.keys(filters).length > 0) {
      scopedRecords = scopedRecords.filter(function(r) { return Object.entries(filters).every(function(e) { return r[e[0]] === e[1]; }); });
    }

    return Response.json({
      success: true,
      entity: entity,
      workspace: profileWorkspace,
      user_id: resolvedUserId,
      profile_id: primaryProfileId,
      count: scopedRecords.length,
      records: scopedRecords,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
