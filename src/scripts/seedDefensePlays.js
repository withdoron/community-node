/**
 * Seed 4 defense plays for Coach Rick's team.
 * Uses the same manageTeamPlay server function as the play creation UI.
 * Creates visual renderer plays with position coordinates from formation defaults.
 */
import { base44 } from '@/api/base44Client';

const PLAYS = [
  {
    side: 'defense',
    name: 'Cover 1',
    formation: 'Cover 1',
    coach_notes: 'Three man-coverage on receivers, one deep safety at 10 yards, one rusher. Safety is the insurance policy — stops anything that gets past the corners. Good against teams that throw deep.',
    game_day: true,
    tags: 'base,pass_defense',
    assignments: [
      { position: 'CB1', start_x: 15, start_y: 45, movement_type: 'man_coverage', assignment_text: 'Cover the left receiver man-to-man. Play aggressive — you have safety help over the top, so jump short routes.' },
      { position: 'CB2', start_x: 85, start_y: 45, movement_type: 'man_coverage', assignment_text: 'Cover the right receiver man-to-man. Play aggressive — safety has your back on deep throws.' },
      { position: 'S',   start_x: 50, start_y: 25, movement_type: 'zone_coverage', assignment_text: 'Line up 10 yards deep, center of the field. Read the QB\'s eyes. Break on any deep throw. You are the last line — NEVER let anyone get behind you.' },
      { position: 'LB',  start_x: 50, start_y: 42, movement_type: 'man_coverage', assignment_text: 'Cover the center or RB — whoever releases into a route. If nobody comes out, watch for scramble and contain the middle.' },
      { position: 'R',   start_x: 55, start_y: 48, movement_type: 'blitz_rush', assignment_text: 'Start 7 yards back with hand raised. Rush the QB at the snap. Take the shortest path. Force a quick throw.' },
    ],
  },
  {
    side: 'defense',
    name: 'Cover 2 Zone',
    formation: 'Cover 2',
    coach_notes: 'Zone defense with one rusher. Two cornerbacks guard the sidelines (5 yards back). Two safeties guard the deep halves (10+ yards). Good all-around defense — covers both short outside throws and deep passes. Weakness: the middle of the field between corners and safeties.',
    game_day: false,
    tags: 'zone,pass_defense',
    assignments: [
      { position: 'CB1', start_x: 15, start_y: 40, movement_type: 'zone_coverage', assignment_text: 'Line up 5 yards back on the left sideline. Guard your sideline from the line to about 10 yards deep. Anyone who enters your zone is your responsibility.' },
      { position: 'CB2', start_x: 85, start_y: 40, movement_type: 'zone_coverage', assignment_text: 'Line up 5 yards back on the right sideline. Guard your sideline. Same job as CB1 but on the right.' },
      { position: 'S',   start_x: 35, start_y: 25, movement_type: 'zone_coverage', assignment_text: 'Line up 10 yards deep on the left half. Guard everything deep on your side. Keep receivers in front of you. Break on any throw into your zone.' },
      { position: 'LB',  start_x: 65, start_y: 25, movement_type: 'zone_coverage', assignment_text: 'Line up 10 yards deep on the right half. Guard everything deep on your side. You and Safety split the field — nothing gets over your heads.' },
      { position: 'R',   start_x: 50, start_y: 48, movement_type: 'blitz_rush', assignment_text: 'Start 7 yards back with hand raised. Rush the QB at the snap. With zone behind you, be aggressive — every zone is covered even if the QB escapes.' },
    ],
  },
  {
    side: 'defense',
    name: 'Cover 3 Zone',
    formation: 'Cover 3',
    coach_notes: 'Pure zone defense — NO rusher. Five players cover five zones. Two mid-field defenders watch for short/medium routes. Three deep defenders each guard one-third of the deep field. QB has all day to throw but every inch is covered. Good against strong-armed QBs. Weakness: no pressure on QB.',
    game_day: false,
    tags: 'zone,prevent',
    assignments: [
      { position: 'CB1', start_x: 25, start_y: 38, movement_type: 'zone_coverage', assignment_text: 'Line up 5 yards back on the left. Guard the short-to-mid zone on your side (5 to 10 yards). Watch for slants, outs, and crossing routes.' },
      { position: 'CB2', start_x: 75, start_y: 38, movement_type: 'zone_coverage', assignment_text: 'Line up 5 yards back on the right. Guard the short-to-mid zone on your side. Same as CB1 but right side.' },
      { position: 'S',   start_x: 50, start_y: 20, movement_type: 'zone_coverage', assignment_text: 'Line up 10 yards deep in the CENTER. Guard the deep middle third. Nothing gets over your head in the middle. Protect against posts and deep crosses.' },
      { position: 'LB',  start_x: 20, start_y: 20, movement_type: 'zone_coverage', assignment_text: 'Line up 10 yards deep on the LEFT third. Guard everything deep on the left. Keep receivers in front of you.' },
      { position: 'R',   start_x: 80, start_y: 20, movement_type: 'zone_coverage', assignment_text: 'Line up 10 yards deep on the RIGHT third. In Cover 3 you are NOT rushing — you are a deep zone defender. Keep everything in front of you.' },
    ],
  },
  {
    side: 'defense',
    name: 'Double Blitz',
    formation: 'Blitz',
    coach_notes: 'Aggressive — TWO rushers, three man-coverage. High risk, high reward. QB has two people coming, must throw fast. But only 3 coverage defenders — if someone gets open it\'s a big play. Use on obvious passing downs or to rattle the QB. NFL FLAG: max 2 rushers, both 7 yards back with hands raised.',
    game_day: true,
    tags: 'blitz,aggressive',
    assignments: [
      { position: 'CB1', start_x: 20, start_y: 45, movement_type: 'man_coverage', assignment_text: 'Cover the left receiver. Stay tight — you have NO safety help. If your man gets behind you, it\'s a touchdown. Play smart, don\'t gamble.' },
      { position: 'CB2', start_x: 80, start_y: 45, movement_type: 'man_coverage', assignment_text: 'Cover the right receiver. Stay tight — no safety help. This is 1-on-1, use your speed and stay between your man and the QB.' },
      { position: 'S',   start_x: 50, start_y: 35, movement_type: 'man_coverage', assignment_text: 'Cover the center or RB. You\'re the only help in the middle. If nobody comes to you, read the QB and jump the first short throw you see.' },
      { position: 'LB',  start_x: 40, start_y: 48, movement_type: 'blitz_rush', assignment_text: 'RUSHER #2. Start 7 yards back with hand raised. Rush from the LEFT side. You and R are a team — squeeze the QB from both sides.' },
      { position: 'R',   start_x: 55, start_y: 48, movement_type: 'blitz_rush', assignment_text: 'RUSHER #1. Start 7 yards back with hand raised. Rush from the RIGHT side. Coordinate with LB — one goes left, one goes right. Go for the flag!' },
    ],
  },
];

export async function seedDefensePlays(teamId, createdBy) {
  const invoke = (args) =>
    base44.functions.invoke('manageTeamPlay', { ...args, team_id: teamId });

  console.log('Seeding 4 defense plays (visual renderer)...');
  const results = [];

  for (const play of PLAYS) {
    try {
      const created = await invoke({
        action: 'create',
        entity_type: 'play',
        data: {
          team_id: teamId,
          side: play.side,
          name: play.name,
          formation: play.formation,
          coach_notes: play.coach_notes,
          game_day: play.game_day,
          tags: play.tags,
          status: 'active',
          created_by: createdBy,
          use_renderer: true,
        },
      });

      const playId = created.id;
      console.log(`Created play: ${play.name} (${playId})`);

      for (const a of play.assignments) {
        await invoke({
          action: 'create',
          entity_type: 'play_assignment',
          data: {
            play_id: playId,
            position: a.position,
            start_x: a.start_x,
            start_y: a.start_y,
            movement_type: a.movement_type,
            assignment_text: a.assignment_text,
          },
        });
      }

      console.log(`  → 5 assignments created`);
      results.push({ name: play.name, id: playId, assignments: 5 });
    } catch (err) {
      console.error(`Failed: ${play.name}:`, err);
      results.push({ name: play.name, error: err.message });
    }
  }

  console.log('Defense seed complete!', results);
  return results;
}
