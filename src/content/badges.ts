export const BADGES = [
  { id: 'first-session', name: 'First bell', detail: 'Finish your first session.' },
  { id: 'clean', name: 'Every rep', detail: 'Hit every set target in a session.' },
  { id: 'streak-3', name: 'Three straight', detail: 'Train three days in a row.' },
  { id: 'streak-7', name: 'Seven deep', detail: 'Hold a seven-day streak.' },
  { id: 'streak-14', name: 'Fortnight', detail: 'Hold a fourteen-day streak.' },
  { id: 'day-50', name: 'Fifty', detail: 'Reach 50 reps in a single day.' },
  { id: 'day-100', name: 'Hundred', detail: 'Reach 100 reps in a single day.' },
  { id: 'day-150', name: 'Volume day', detail: 'Reach 150 reps in a single day.' },
  { id: 'day-250', name: 'Tyson day', detail: 'Reach 250 reps in a single day.' },
  { id: 'life-500', name: '500 club', detail: 'Log 500 lifetime reps.' },
  { id: 'life-1000', name: 'Four figures', detail: 'Log 1,000 lifetime reps.' },
  { id: 'life-2500', name: 'Long camp', detail: 'Log 2,500 lifetime reps.' },
  { id: 'life-5000', name: 'Five thousand', detail: 'Log 5,000 lifetime reps.' },
  { id: 'sessions-10', name: 'Ten rounds', detail: 'Finish 10 sessions.' },
  { id: 'sessions-30', name: 'Fight camp', detail: 'Finish 30 sessions.' },
  { id: 'week-hit', name: 'Week closed', detail: 'Hit your days-per-week target.' },
  { id: 'comeback', name: 'Back in', detail: 'Train after seven or more days away.' },
  { id: 'double-day', name: 'Twice', detail: 'Log two sessions in one day.' },
  { id: 'stage-ready', name: 'Stage cleared', detail: 'Land three clean sessions on one stage.' },
] as const

export type BadgeId = (typeof BADGES)[number]['id']

export function badgeById(id: BadgeId) {
  return BADGES.find((badge) => badge.id === id) ?? BADGES[0]
}
