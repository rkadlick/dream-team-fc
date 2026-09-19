export const POSITIONS = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST',
] as const

export type Position = (typeof POSITIONS)[number]

export const RESULTS = ['W', 'D', 'L'] as const
export type Result = (typeof RESULTS)[number]

export const HOME_AWAY = ['home', 'away'] as const
export type HomeAway = (typeof HOME_AWAY)[number]
