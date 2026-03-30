/**
 * Rules Quick Reference — Data-driven rules for each sport/format.
 * Components read from this config, not hardcoded.
 * Add new sports by adding a new key to RULES_DATA.
 */

export const RULES_DATA = {
  flag_football_5v5: {
    sport: 'flag_football',
    format: '5v5',
    source: 'NFL FLAG Official Rules',
    source_url: 'https://nflflag.com/coaches/flag-football-rules',
    sections: [
      {
        title: 'Defense',
        rules: [
          'Rushers must start 7 yards behind the line of scrimmage to legally rush',
          'Designated rushers must raise their hand until the snap to identify themselves',
          'Maximum of 2 designated rushers per play',
          'Rushers must rush immediately upon the snap or forfeit the right of way',
          'Once the offense hands off or pitches the ball backwards, ALL defenders may rush',
          'Defenders must pull flags — no grabbing jerseys, pushing, or tackling',
          'No defensive player may mimic the offense\'s signals to cause confusion (unsportsmanlike conduct)',
          'Interceptions are returnable for 6 points (2 points on extra point attempts)',
          'A sack occurs when the QB\'s flag is pulled behind the line of scrimmage',
          'If a sack occurs in the end zone, it is a safety',
        ],
      },
      {
        title: 'Offense',
        rules: [
          'The quarterback cannot run directly across the line of scrimmage — must hand off first',
          'The quarterback has 7 seconds to throw the ball before the play is dead (if no rush)',
          'The 7-second clock stops once the ball is handed off or pitched backwards',
          'All players are eligible receivers, including the QB after a handoff',
          'The center is eligible to receive a pass (but cannot take the first handoff)',
          'Handoffs, laterals, and pitches are allowed behind the line of scrimmage',
          'Only 1 player may be in motion at a time, moving laterally or backwards before the snap',
          'No blocking or screening — offensive players cannot impede defenders',
          'No flag guarding, stiff arms, or charging',
          'No run zones: 5 yards from each end zone and either side of midfield — must complete a pass play',
          'Ball is spotted where the ball is when the flag is pulled (not where the player\'s feet are)',
        ],
      },
      {
        title: 'General',
        rules: [
          '5 players on the field per team',
          'Two 24-minute halves with a running clock',
          'Each team gets one timeout per half',
          'Teams have 25-30 seconds to snap the ball after it is spotted',
          'All players must wear mouthguards and official NFL FLAG belts',
          'Cleats allowed (no exposed metal)',
          'No fumbles — ball is dead when it hits the ground',
          'Forward fumble is spotted where the fumble occurred; backward fumble/pitch spotted where ball lands',
          'Ball carrier is down when knee, leg, shin, or arm touches the ground',
          'Substitutions allowed on any dead ball',
          'Coaches must rotate players and ensure equal playtime',
        ],
      },
      {
        title: 'Penalties',
        subsections: [
          {
            title: 'Offensive Penalties (loss of down + yardage)',
            rules: [
              'Illegal motion / false start — 5 yards from line of scrimmage',
              'Offensive pass interference — 10 yards from line of scrimmage',
              'Flag guarding — 10 yards from spot of foul',
              'Delay of game — 5 yards (warning first)',
              'Illegal forward pass (beyond LOS) — 5 yards + loss of down',
              'Impeding the rusher — 5 yards from line of scrimmage',
            ],
          },
          {
            title: 'Defensive Penalties (automatic first down + yardage)',
            rules: [
              'Offsides — 5 yards from line of scrimmage',
              'Illegal rush (inside 7 yards) — 5 yards from line of scrimmage',
              'Defensive pass interference — ball placed at spot of foul, automatic first down',
              'Illegal contact / holding — 5 yards from spot of foul',
              'Roughing the passer — 10 yards + automatic first down',
              'Stripping / reaching into ball carrier\'s body for flag — 10 yards from spot',
              'Unsportsmanlike conduct — 10 yards',
            ],
          },
        ],
      },
    ],
    links: [
      { label: 'NFL FLAG Official Rules', url: 'https://nflflag.com/coaches/flag-football-rules' },
      { label: 'How to Play Flag Football', url: 'https://nflflag.com/coaches/flag-football-rules/how-to-play-flag-football' },
      { label: '5v5 Defense Guide', url: 'https://nflflag.com/coaches/default/flag-football-rules/5-on-5-flag-football-defense' },
      { label: '5v5 Offensive Plays', url: 'https://nflflag.com/coaches/default/flag-football-plays/5-on-5-flag-football-playbook' },
      { label: 'Flag Football Drills', url: 'https://nflflag.com/coaches/flag-football-drills' },
    ],
  },
};
