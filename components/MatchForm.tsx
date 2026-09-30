'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Panel, Label, buttonStyles, fieldBase, fieldStyles } from '@/components/ui'
import { MATCH_STATS, MAX_POTG, STATS, statApplies } from '@/lib/stats-config'
import { formatPlayerLabel, todayIso } from '@/lib/format'
import { RESULTS, type Result } from '@/lib/constants'
import {
  createGameTypeInlineAction,
  deleteMatchAction,
  saveMatchAction,
  type SaveMatchPayload,
} from '@/app/admin/matches/actions'

type Option = { id: string; name: string }

export type FormPlayer = {
  id: string
  name: string
  jersey_number: number | null
  position: string | null
  is_human: boolean
}

/** Raw text state, so a blank optional stat stays blank rather than becoming 0. */
type StatInputs = Record<string, string>

export type MatchFormInitial = {
  id: string
  season_id: string
  game_type_id: string
  played_on: string
  division: number
  opponent: string
  home_away: string
  score_us: number
  score_them: number
  opp_own_goals: number
  went_to_overtime: boolean
  went_to_pks: boolean
  pk_us: number | null
  pk_them: number | null
  result: string
  notes: string | null
  matchStats: Record<string, number | null>
  stats: {
    player_id: string
    potg_rank: number | null
    [key: string]: string | number | null
  }[]
  /** The real goal log, when one was recorded after this feature shipped. */
  goals?: { scorer_id: string; assist_id: string | null; minute: number | null }[]
}

type Line = { playerId: string; stats: StatInputs }

/** One goal slot in the form: a required scorer, an optional assist, an optional minute. */
type GoalSlot = { scorerId: string; assistId: string; minute: string }

function resizeGoalSlots(prev: GoalSlot[], target: number): GoalSlot[] {
  if (prev.length === target) return prev
  if (prev.length > target) return prev.slice(0, target)
  return [
    ...prev,
    ...Array.from({ length: target - prev.length }, () => ({
      scorerId: '',
      assistId: '',
      minute: '',
    })),
  ]
}

/**
 * Best-effort reconstruction for a match saved before the goal log existed:
 * the aggregate goals/assists counts on match_player_stats don't record which
 * assist belongs to which goal, so this produces *a* plausible pairing, not
 * necessarily the real one. Harmless, since only the tallies (not the
 * pairing) are ever persisted.
 */
function reconstructGoalSlots(stats: MatchFormInitial['stats']): GoalSlot[] {
  const slots: GoalSlot[] = []
  for (const row of stats) {
    const goals = Number(row.goals) || 0
    for (let i = 0; i < goals; i++) {
      slots.push({ scorerId: row.player_id, assistId: '', minute: '' })
    }
  }
  for (const row of stats) {
    let remaining = Number(row.assists) || 0
    if (remaining <= 0) continue
    for (const slot of slots) {
      if (remaining <= 0) break
      if (slot.assistId === '' && slot.scorerId !== row.player_id) {
        slot.assistId = row.player_id
        remaining -= 1
      }
    }
  }
  return slots
}

/** Suggested result from the scores, or the PK scores when they are filled in. */
function suggestResult(
  scoreUs: number,
  scoreThem: number,
  pkUs: number | null,
  pkThem: number | null
): Result {
  if (pkUs !== null && pkThem !== null && pkUs !== pkThem) {
    return pkUs > pkThem ? 'W' : 'L'
  }
  if (scoreUs > scoreThem) return 'W'
  if (scoreUs < scoreThem) return 'L'
  return 'D'
}

function num(value: string, fallback = 0): number {
  if (value.trim() === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback
}

/** Blank stays blank: null is "not tracked", which is not the same as 0. */
function optNum(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null
}

function toInputs(
  source: Record<string, string | number | null | undefined>
): StatInputs {
  return Object.fromEntries(
    STATS.map((stat) => {
      const raw = source[stat.key]
      if (raw === null || raw === undefined || raw === '') {
        // A required stat always has a value; an optional one may be untracked.
        return [stat.key, stat.optional ? '' : '0']
      }
      return [stat.key, String(raw)]
    })
  )
}

/**
 * A freshly added line starts fully zeroed rather than blank, since 0 is by
 * far the most common value and typing over a 0 beats typing into a dash.
 * A GK-only stat (saves) defaults to 0 for an actual keeper and stays blank
 * for anyone else, so it keeps defaulting to hidden for outfielders — see
 * `statApplies`.
 */
function blankInputs(position: string | null): StatInputs {
  return Object.fromEntries(
    STATS.map((stat) => [stat.key, stat.gkOnly && position !== 'GK' ? '' : '0'])
  )
}

const DIVISIONS = [1, 2, 3, 4, 5]

/** Stats entered as event logs (goals/cards) rather than typed per player. */
const DERIVED_STAT_KEYS = ['goals', 'assists', 'yellow_cards', 'red_cards']

/** One card in the form: who it was on, and which color. */
type CardEntry = { playerId: string; type: 'yellow' | 'red' }

/**
 * Best-effort reconstruction for a match saved before the card log existed —
 * same caveat as `reconstructGoalSlots`: order/identity of individual cards
 * isn't stored, only the per-player totals, so this just produces that many
 * rows per player.
 */
function reconstructCardEntries(stats: MatchFormInitial['stats']): CardEntry[] {
  const entries: CardEntry[] = []
  for (const row of stats) {
    const yellow = Number(row.yellow_cards) || 0
    for (let i = 0; i < yellow; i++) entries.push({ playerId: row.player_id, type: 'yellow' })
    const red = Number(row.red_cards) || 0
    for (let i = 0; i < red; i++) entries.push({ playerId: row.player_id, type: 'red' })
  }
  return entries
}

const stepperButtonBase =
  'flex shrink-0 items-center justify-center rounded-full border font-bold leading-none transition-colors disabled:opacity-30'

const stepperTones = {
  accent:
    'border-accent-line bg-accent-soft text-accent-text hover:border-accent active:bg-accent active:text-accent-fg',
  rival: 'border-rival-line bg-rival-soft text-rival-text hover:border-rival-text',
}

/** null renders as "—" (not tracked); + from there goes to 1. */
function Stepper({
  value,
  onStep,
  label,
  compact = false,
  tone = 'accent',
}: {
  value: number | null
  onStep: (delta: 1 | -1) => void
  label: string
  compact?: boolean
  tone?: keyof typeof stepperTones
}) {
  const button = `${stepperButtonBase} ${stepperTones[tone]} ${
    compact ? 'h-7 w-7 text-base' : 'h-9 w-9 text-lg'
  }`
  return (
    <div
      className={`flex items-center justify-between ${compact ? 'h-10 gap-1' : 'h-11 gap-2'}`}
    >
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={!value}
        aria-label={`Decrease ${label}`}
        className={button}
      >
        −
      </button>
      <span
        aria-live="polite"
        className={`font-bold tabular-nums ${compact ? 'text-base' : 'text-2xl'} ${
          value === null ? 'text-faint' : ''
        }`}
      >
        {value ?? '—'}
      </span>
      <button
        type="button"
        onClick={() => onStep(1)}
        aria-label={`Increase ${label}`}
        className={button}
      >
        +
      </button>
    </div>
  )
}

function SubsectionHeading({
  icon,
  title,
  meta,
  className,
}: {
  icon: string
  title: string
  meta?: string
  className: string
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className={`flex items-center gap-1.5 text-sm font-bold ${className}`}>
        <span aria-hidden>{icon}</span>
        {title}
      </h3>
      {meta && <span className="text-xs font-medium text-faint">{meta}</span>}
    </div>
  )
}

export function MatchForm({
  seasons,
  gameTypes: initialGameTypes,
  players,
  opponents,
  defaults,
  initial,
}: {
  seasons: Option[]
  gameTypes: Option[]
  players: FormPlayer[]
  opponents: string[]
  defaults: { seasonId: string; playedOn?: string }
  initial?: MatchFormInitial
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [gameTypes, setGameTypes] = useState(initialGameTypes)
  const [addingGameType, setAddingGameType] = useState(false)
  const [newGameType, setNewGameType] = useState('')

  const [playedOn, setPlayedOn] = useState(
    initial?.played_on ?? defaults.playedOn ?? todayIso()
  )
  const [seasonId, setSeasonId] = useState(initial?.season_id ?? defaults.seasonId)
  const [division, setDivision] = useState<number | null>(initial?.division ?? null)
  const [gameTypeId, setGameTypeId] = useState(
    initial?.game_type_id ?? gameTypes[0]?.id ?? ''
  )
  const [opponent, setOpponent] = useState(initial?.opponent ?? '')
  const [homeAway, setHomeAway] = useState(initial?.home_away ?? 'home')
  const [scoreUs, setScoreUs] = useState(String(initial?.score_us ?? 0))
  const [scoreThem, setScoreThem] = useState(String(initial?.score_them ?? 0))
  const [oppOwnGoals, setOppOwnGoals] = useState(String(initial?.opp_own_goals ?? 0))
  const [overtime, setOvertime] = useState(initial?.went_to_overtime ?? false)
  const [pks, setPks] = useState(initial?.went_to_pks ?? false)
  const [pkUs, setPkUs] = useState(
    initial?.pk_us !== null && initial?.pk_us !== undefined ? String(initial.pk_us) : ''
  )
  const [pkThem, setPkThem] = useState(
    initial?.pk_them !== null && initial?.pk_them !== undefined
      ? String(initial.pk_them)
      : ''
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [notesOpen, setNotesOpen] = useState(false)
  const [allowUnattributed, setAllowUnattributed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [resultTouched, setResultTouched] = useState(Boolean(initial))
  const [result, setResult] = useState<string>(initial?.result ?? 'D')

  const [lines, setLines] = useState<Line[]>(() => {
    if (initial) {
      return initial.stats.map((row) => ({
        playerId: row.player_id,
        stats: toInputs(row),
      }))
    }
    // New match: every active player is pre-listed, human and AI alike. A stat
    // row is what makes a game count as played, so AI teammates need one too.
    // Anyone who did not feature gets removed with the ✕ on their line.
    return players.map((p) => ({ playerId: p.id, stats: blankInputs(p.position) }))
  })

  /**
   * Keepers show only saves; their outfield stats sit behind a toggle. A
   * keeper who already has a non-zero outfield stat starts expanded so
   * recorded data is never hidden on load.
   */
  const [expandedKeepers, setExpandedKeepers] = useState<string[]>(() =>
    lines
      .filter((l) => {
        if (players.find((p) => p.id === l.playerId)?.position !== 'GK') return false
        return STATS.some(
          (s) =>
            !s.gkOnly &&
            !DERIVED_STAT_KEYS.includes(s.key) &&
            (optNum(l.stats[s.key]) ?? 0) > 0
        )
      })
      .map((l) => l.playerId)
  )

  /** One row per card: who it was on, and which color. */
  const [cardEntries, setCardEntries] = useState<CardEntry[]>(() =>
    initial ? reconstructCardEntries(initial.stats) : []
  )

  /**
   * One slot per Dream Team goal: a required scorer and an optional assist.
   * The slot count is driven by the score inputs (see the score/own-goals
   * handlers below), not stored independently.
   */
  const [goalSlots, setGoalSlots] = useState<GoalSlot[]>(() => {
    if (initial?.goals && initial.goals.length > 0) {
      return initial.goals.map((g) => ({
        scorerId: g.scorer_id,
        assistId: g.assist_id ?? '',
        minute: g.minute !== null && g.minute !== undefined ? String(g.minute) : '',
      }))
    }
    if (initial) return reconstructGoalSlots(initial.stats)
    return []
  })

  /**
   * Player of the match: up to three players, in the order they were picked.
   * The slot (1-3) is only there to keep them distinct in the database.
   */
  const [potgIds, setPotgIds] = useState<string[]>(() => {
    if (!initial) return []
    return initial.stats
      .filter((row) => row.potg_rank !== null)
      .sort((a, b) => (a.potg_rank ?? 0) - (b.potg_rank ?? 0))
      .map((row) => row.player_id)
  })

  const [matchStats, setMatchStats] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      MATCH_STATS.flatMap((stat) =>
        (['us', 'them'] as const).map((side) => {
          const key = `${stat.key}_${side}`
          const value = initial?.matchStats?.[key]
          return [key, value === null || value === undefined ? '' : String(value)]
        })
      )
    )
  )

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  )

  const parsedPkUs = pks && pkUs.trim() !== '' ? num(pkUs) : null
  const parsedPkThem = pks && pkThem.trim() !== '' ? num(pkThem) : null
  const suggested = suggestResult(
    num(scoreUs),
    num(scoreThem),
    parsedPkUs,
    parsedPkThem
  )
  const effectiveResult = resultTouched ? result : suggested

  const goalsByPlayer = useMemo(() => {
    const map = new Map<string, number>()
    for (const slot of goalSlots) {
      if (!slot.scorerId) continue
      map.set(slot.scorerId, (map.get(slot.scorerId) ?? 0) + 1)
    }
    return map
  }, [goalSlots])

  const assistsByPlayer = useMemo(() => {
    const map = new Map<string, number>()
    for (const slot of goalSlots) {
      if (!slot.assistId) continue
      map.set(slot.assistId, (map.get(slot.assistId) ?? 0) + 1)
    }
    return map
  }, [goalSlots])

  const cardsByPlayer = useMemo(() => {
    const yellow = new Map<string, number>()
    const red = new Map<string, number>()
    for (const card of cardEntries) {
      if (!card.playerId) continue
      const map = card.type === 'yellow' ? yellow : red
      map.set(card.playerId, (map.get(card.playerId) ?? 0) + 1)
    }
    return { yellow, red }
  }, [cardEntries])
  // Any card at all means cards are being tracked for this match: everyone
  // else defaults to 0, not "not tracked". No cards means no opinion either
  // way, same as an untouched number box always has.
  const cardsTracked = cardEntries.length > 0

  const attributedGoals = goalSlots.filter((slot) => slot.scorerId).length
  const goalTotal = attributedGoals + num(oppOwnGoals)
  const goalsMismatch = goalTotal !== num(scoreUs)

  // Soft warnings only. These are never enforced in the database, because a
  // backfilled match may have goals recorded but shots left untracked.
  const targetMismatches = lines.filter((l) => {
    const shots = optNum(l.stats.shots)
    const onTarget = optNum(l.stats.shots_on_target)
    return shots !== null && onTarget !== null && onTarget > shots
  })

  const teamShotsOff = (['us', 'them'] as const).filter((side) => {
    const shots = optNum(matchStats[`shots_${side}`])
    const onTarget = optNum(matchStats[`shots_on_target_${side}`])
    return shots !== null && onTarget !== null && onTarget > shots
  })

  const possessionUs = optNum(matchStats.possession_us)
  const possessionThem = optNum(matchStats.possession_them)
  const possessionOff =
    possessionUs !== null &&
    possessionThem !== null &&
    possessionUs + possessionThem !== 100

  const available = players.filter(
    (p) => !lines.some((l) => l.playerId === p.id)
  )

  // "Am I editing?" feedback. Every field on this form is controlled, so a
  // serialised snapshot compared against the one taken on mount is enough to
  // know whether anything has actually moved.
  const snapshot = JSON.stringify({
    playedOn,
    seasonId,
    division,
    gameTypeId,
    opponent,
    homeAway,
    scoreUs,
    scoreThem,
    oppOwnGoals,
    overtime,
    pks,
    pkUs,
    pkThem,
    notes,
    result: effectiveResult,
    matchStats,
    potgIds,
    lines,
    goalSlots,
    cardEntries,
  })
  // Captured once, on first render, then compared on every later one.
  const [initialSnapshot] = useState(snapshot)
  const dirty = snapshot !== initialSnapshot

  /** A blank ("not tracked") stat steps from 0, so + makes it 1. */
  const stepStat = (playerId: string, key: string, delta: 1 | -1) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.playerId !== playerId) return l
        const next = Math.max(0, (optNum(l.stats[key]) ?? 0) + delta)
        return { ...l, stats: { ...l.stats, [key]: String(next) } }
      })
    )
  }

  const addPlayer = (playerId: string) => {
    if (!playerId) return
    setLines((prev) =>
      prev.some((l) => l.playerId === playerId)
        ? prev
        : [
            ...prev,
            { playerId, stats: blankInputs(playerById.get(playerId)?.position ?? null) },
          ]
    )
  }

  const removePlayer = (playerId: string) => {
    setLines((prev) => prev.filter((l) => l.playerId !== playerId))
    // A player who did not appear cannot be player of the match, nor credited
    // with a goal, assist, or card.
    setPotgIds((prev) => prev.filter((id) => id !== playerId))
    setGoalSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        scorerId: slot.scorerId === playerId ? '' : slot.scorerId,
        assistId: slot.assistId === playerId ? '' : slot.assistId,
      }))
    )
    setCardEntries((prev) => prev.filter((card) => card.playerId !== playerId))
  }

  // One goal at a time, so the slot list only ever gains or loses its last
  // entry — typed input could pass through a blank value and wipe every slot.
  const stepScoreUs = (delta: 1 | -1) => {
    const next = Math.max(0, num(scoreUs) + delta)
    setScoreUs(String(next))
    setGoalSlots((prev) => resizeGoalSlots(prev, Math.max(0, next - num(oppOwnGoals))))
  }

  /** Picking a scorer/assist who isn't in the player stats list yet adds them. */
  const setGoalSlot = (
    index: number,
    field: 'scorerId' | 'assistId' | 'minute',
    value: string
  ) => {
    setGoalSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    )
    if ((field === 'scorerId' || field === 'assistId') && value) {
      addPlayer(value)
    }
  }

  const addCard = () => {
    setCardEntries((prev) => [...prev, { playerId: '', type: 'yellow' }])
  }

  const setCardType = (index: number, type: 'yellow' | 'red') => {
    setCardEntries((prev) => prev.map((c, i) => (i === index ? { ...c, type } : c)))
  }

  /** Picking a player who isn't in the player stats list yet adds them. */
  const setCardPlayer = (index: number, playerId: string) => {
    setCardEntries((prev) => prev.map((c, i) => (i === index ? { ...c, playerId } : c)))
    if (playerId) addPlayer(playerId)
  }

  const removeCard = (index: number) => {
    setCardEntries((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * Clears this player's 0s back to blank ("not tracked"). Goals and assists
   * are skipped: they are `not null default 0` in the database, so a blank
   * there would be meaningless.
   */
  const setZerosBlank = (playerId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.playerId !== playerId) return l
        const stats = { ...l.stats }
        for (const stat of STATS) {
          if (!stat.optional || DERIVED_STAT_KEYS.includes(stat.key)) continue
          if ((stats[stat.key] ?? '').trim() !== '0') continue
          stats[stat.key] = ''
        }
        return { ...l, stats }
      })
    )
  }

  const toggleKeeperStats = (playerId: string) => {
    setExpandedKeepers((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    )
  }

  const togglePotg = (playerId: string) => {
    setPotgIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : prev.length >= MAX_POTG
          ? prev
          : [...prev, playerId]
    )
  }

  const addGameType = () => {
    const name = newGameType
    startTransition(async () => {
      const res = await createGameTypeInlineAction(name)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setGameTypes((prev) => [...prev, res].sort((a, b) => a.name.localeCompare(b.name)))
      setGameTypeId(res.id)
      setNewGameType('')
      setAddingGameType(false)
      setError(null)
    })
  }

  const submit = () => {
    setError(null)
    if (division === null) {
      setError('Pick a division.')
      return
    }
    if (goalsMismatch && !allowUnattributed) {
      setError('Goals do not add up. Fix them, or tick “Save anyway”.')
      return
    }

    const payload: SaveMatchPayload = {
      ...(initial ? { id: initial.id } : {}),
      season_id: seasonId,
      game_type_id: gameTypeId,
      played_on: playedOn,
      division,
      opponent,
      home_away: homeAway,
      score_us: num(scoreUs),
      score_them: num(scoreThem),
      opp_own_goals: num(oppOwnGoals),
      went_to_overtime: overtime,
      went_to_pks: pks,
      pk_us: parsedPkUs,
      pk_them: parsedPkThem,
      result: effectiveResult,
      notes,
      matchStats: Object.fromEntries(
        Object.entries(matchStats).map(([key, value]) => [key, optNum(value)])
      ),
      stats: lines.map((l) => {
        const slot = potgIds.indexOf(l.playerId)
        return {
          player_id: l.playerId,
          potg_rank: slot === -1 ? null : slot + 1,
          ...Object.fromEntries(
            STATS.map((stat) => {
              // Goals/assists/cards come from their own event logs, not manual entry.
              if (stat.key === 'goals') return [stat.key, goalsByPlayer.get(l.playerId) ?? 0]
              if (stat.key === 'assists') {
                return [stat.key, assistsByPlayer.get(l.playerId) ?? 0]
              }
              if (stat.key === 'yellow_cards') {
                return [
                  stat.key,
                  cardsTracked ? cardsByPlayer.yellow.get(l.playerId) ?? 0 : null,
                ]
              }
              if (stat.key === 'red_cards') {
                return [stat.key, cardsTracked ? cardsByPlayer.red.get(l.playerId) ?? 0 : null]
              }
              return [
                stat.key,
                stat.optional ? optNum(l.stats[stat.key]) : num(l.stats[stat.key] ?? '0'),
              ]
            })
          ),
        }
      }),
      goals: goalSlots
        .filter((slot) => slot.scorerId)
        .map((slot) => ({
          scorer_id: slot.scorerId,
          assist_id: slot.assistId || null,
          minute: optNum(slot.minute),
        })),
      allowUnattributed,
    }

    startTransition(async () => {
      const res = await saveMatchAction(payload)
      if (res && 'error' in res) setError(res.error)
    })
  }

  const remove = () => {
    startTransition(async () => {
      const res = await deleteMatchAction(initial!.id)
      if (res && 'error' in res) {
        setError(res.error)
        setConfirmDelete(false)
      }
    })
  }

  const toggleStyles = (active: boolean) =>
    `h-10 flex-1 rounded-lg border text-sm font-semibold transition-colors ${
      active
        ? 'border-accent bg-accent-soft text-accent-text'
        : 'border-line bg-surface-2 text-muted'
    }`

  const divisionStyles = (active: boolean) =>
    `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
      active
        ? 'border-accent bg-accent-soft text-accent-text'
        : 'border-line bg-surface-2 text-muted'
    }`

  const cardToggleStyles = (active: boolean, tone: 'yellow' | 'red') =>
    `h-8 flex-1 rounded-lg border text-xs font-semibold transition-colors ${
      active
        ? tone === 'yellow'
          ? 'border-warn-line bg-warn-soft text-warn'
          : 'border-loss/40 bg-loss-soft text-loss'
        : 'border-line bg-surface text-faint'
    }`

  const opponentLabel = opponent.trim() || 'Them'

  return (
    <div className="space-y-6 pb-24">
      {/* 1. When and what */}
      <Panel className="space-y-4 p-4">
        <div>
          <Label htmlFor="played_on">Date</Label>
          <input
            id="played_on"
            type="date"
            value={playedOn}
            onChange={(e) => setPlayedOn(e.target.value)}
            className={fieldStyles}
          />
        </div>

        <div>
          <Label>Division</Label>
          <div className="flex gap-2">
            {DIVISIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDivision(d)}
                aria-pressed={division === d}
                className={divisionStyles(division === d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="season">Season</Label>
          <select
            id="season"
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className={fieldStyles}
          >
            <option value="">Select a season…</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="game_type">Game type</Label>
          {addingGameType ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newGameType}
                onChange={(e) => setNewGameType(e.target.value)}
                placeholder="e.g. Summer Cup"
                className={fieldStyles}
              />
              <button
                type="button"
                onClick={addGameType}
                disabled={pending || !newGameType.trim()}
                className={buttonStyles.primary}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingGameType(false)}
                className={buttonStyles.ghost}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <select
                id="game_type"
                value={gameTypeId}
                onChange={(e) => setGameTypeId(e.target.value)}
                className={fieldStyles}
              >
                <option value="">Select a game type…</option>
                {gameTypes.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAddingGameType(true)}
                className="mt-2 text-sm font-medium text-accent-text"
              >
                + Add new game type
              </button>
            </>
          )}
        </div>
      </Panel>

      {/* 2. Opponent & score */}
      <Panel className="space-y-3 p-4">
        <div>
          <Label htmlFor="opponent">Opponent</Label>
          <input
            id="opponent"
            list="opponent-options"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="Club name"
            className={fieldStyles}
          />
          <datalist id="opponent-options">
            {opponents.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHomeAway('home')}
            className={toggleStyles(homeAway === 'home')}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setHomeAway('away')}
            className={toggleStyles(homeAway === 'away')}
          >
            Away
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1 block truncate text-[11px] font-semibold uppercase tracking-wider text-accent-text">
              Dream Team
            </span>
            <Stepper value={num(scoreUs)} onStep={stepScoreUs} label="Dream Team score" />
          </div>
          <div>
            <span
              className="mb-1 block truncate text-[11px] font-semibold uppercase tracking-wider text-rival-text"
              title={opponentLabel}
            >
              {opponentLabel}
            </span>
            <Stepper
              value={num(scoreThem)}
              onStep={(delta) => setScoreThem(String(Math.max(0, num(scoreThem) + delta)))}
              label={`${opponentLabel} score`}
              tone="rival"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="own_goals" className="text-xs text-faint">
            Opponent own goals
            <span className="block text-[10px] text-faint/80">
              (already in our score)
            </span>
          </label>
          <input
            id="own_goals"
            type="number"
            inputMode="numeric"
            min={0}
            value={oppOwnGoals}
            onChange={(e) => {
              const value = e.target.value
              setOppOwnGoals(value)
              setGoalSlots((prev) =>
                resizeGoalSlots(prev, Math.max(0, num(scoreUs) - num(value)))
              )
            }}
            className={`${fieldBase} h-9 w-16 shrink-0 text-center`}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOvertime((v) => !v)}
            className={toggleStyles(overtime)}
          >
            Overtime
          </button>
          <button
            type="button"
            onClick={() =>
              setPks((v) => {
                if (v) {
                  setPkUs('')
                  setPkThem('')
                }
                return !v
              })
            }
            className={toggleStyles(pks)}
          >
            Penalty shootout
          </button>
        </div>

        {pks && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pk_us">PKs us (optional)</Label>
              <input
                id="pk_us"
                type="number"
                inputMode="numeric"
                min={0}
                value={pkUs}
                onChange={(e) => setPkUs(e.target.value)}
                className={`${fieldStyles} h-9`}
              />
            </div>
            <div>
              <Label htmlFor="pk_them">PKs them (optional)</Label>
              <input
                id="pk_them"
                type="number"
                inputMode="numeric"
                min={0}
                value={pkThem}
                onChange={(e) => setPkThem(e.target.value)}
                className={`${fieldStyles} h-9`}
              />
            </div>
          </div>
        )}

        <div>
          <Label>Result</Label>
          <div className="flex gap-2">
            {RESULTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setResultTouched(true)
                  setResult(r)
                }}
                className={toggleStyles(effectiveResult === r)}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-faint">
            Suggested: <span className="font-semibold text-fg">{suggested}</span>
            {effectiveResult !== suggested && ' — you have overridden it.'}
          </p>
        </div>
      </Panel>

      {/* 3. Team stats, both sides */}
      <Panel className="p-4">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <Label>Team stats</Label>
          <span className="text-xs text-faint">All optional</span>
        </div>
        <p className="mb-3 text-[11px] text-faint">
          Straight from the post-match screen. Leave anything you did not record
          empty — empty is not the same as zero.
        </p>

        <div className="space-y-3">
          {MATCH_STATS.map((stat) => (
            <div key={stat.key}>
              <span className="mb-1 block text-[11px] uppercase tracking-wider text-faint">
                {stat.label}
                {stat.percent && ' (%)'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['us', 'them'] as const).map((side) => {
                  const key = `${stat.key}_${side}`
                  return (
                    <div key={key}>
                      <label
                        htmlFor={key}
                        className={`mb-1 block truncate text-[11px] font-semibold ${
                          side === 'us' ? 'text-accent-text' : 'text-rival-text'
                        }`}
                      >
                        {side === 'us' ? 'Dream Team' : opponentLabel}
                      </label>
                      <input
                        id={key}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={stat.percent ? 100 : undefined}
                        placeholder="—"
                        value={matchStats[key] ?? ''}
                        onChange={(e) =>
                          setMatchStats((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className={`${fieldStyles} h-12 text-center text-lg font-semibold`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {teamShotsOff.length > 0 && (
          <p className="mt-3 text-xs text-warn">
            Shots on target are higher than shots for{' '}
            {teamShotsOff.length === 2
              ? 'both sides'
              : teamShotsOff[0] === 'us'
                ? 'Dream Team'
                : opponentLabel}
            . This will still save.
          </p>
        )}

        {possessionOff && (
          <p className="mt-3 text-xs text-warn">
            Possession adds up to {(possessionUs ?? 0) + (possessionThem ?? 0)}%,
            not 100%. That is fine if the game rounded it — this is only a
            reminder.
          </p>
        )}
      </Panel>

      {/* 4. Player stats */}
      <Panel className="p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <Label>Player stats</Label>
          <span className="text-xs text-faint">
            {attributedGoals} + {num(oppOwnGoals)} OG = {goalTotal} / {num(scoreUs)}
          </span>
        </div>
        <p className="mb-3 text-[11px] text-faint">
          Everyone listed here counts as having played this match. Remove anyone
          who did not feature. Stats start at 0 — use “Set 0 to blank” to mark
          them as not tracked instead.
          {potgIds.length > 0 &&
            ` · ${potgIds.length} of ${MAX_POTG} player-of-the-match picks used.`}
        </p>

        {goalSlots.length > 0 && (
          <div>
            <SubsectionHeading
              icon="⚽"
              title="Goals"
              meta={`${attributedGoals} of ${goalSlots.length} assigned`}
              className="text-accent-text"
            />
            <div className="divide-y divide-accent-line overflow-hidden rounded-xl border border-accent-line bg-accent-soft">
              {goalSlots.map((slot, index) => (
                <div key={index} className="p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-accent-text">
                      Goal {index + 1}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={130}
                      placeholder="Min"
                      aria-label={`Goal ${index + 1} minute`}
                      value={slot.minute}
                      onChange={(e) => setGoalSlot(index, 'minute', e.target.value)}
                      className={`${fieldBase} h-8 w-16 shrink-0 text-center text-xs`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-accent-text">
                        Scorer
                      </label>
                      <select
                        value={slot.scorerId}
                        onChange={(e) => setGoalSlot(index, 'scorerId', e.target.value)}
                        className={`${fieldStyles} h-10 text-sm`}
                      >
                        <option value="">Select…</option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {formatPlayerLabel(p)}
                            {p.is_human ? '' : ' — AI'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-accent-text">
                        Assist (optional)
                      </label>
                      <select
                        value={slot.assistId}
                        onChange={(e) => setGoalSlot(index, 'assistId', e.target.value)}
                        className={`${fieldStyles} h-10 text-sm`}
                      >
                        <option value="">No assist</option>
                        {players
                          .filter((p) => p.id !== slot.scorerId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatPlayerLabel(p)}
                              {p.is_human ? '' : ' — AI'}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={goalSlots.length > 0 ? 'mt-5 border-t border-line pt-5' : ''}>
          <SubsectionHeading
            icon="🟨"
            title="Cards"
            meta={
              cardEntries.length > 0
                ? `${cardEntries.filter((c) => c.type === 'yellow').length} yellow · ${
                    cardEntries.filter((c) => c.type === 'red').length
                  } red`
                : undefined
            }
            className="text-warn"
          />
          {cardEntries.length > 0 && (
            <div className="mb-2 divide-y divide-warn-line overflow-hidden rounded-xl border border-warn-line bg-warn-soft">
              {cardEntries.map((card, index) => (
                <div key={index} className="p-2.5">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCardType(index, 'yellow')}
                        className={cardToggleStyles(card.type === 'yellow', 'yellow')}
                      >
                        Yellow
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardType(index, 'red')}
                        className={cardToggleStyles(card.type === 'red', 'red')}
                      >
                        Red
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCard(index)}
                      aria-label="Remove card"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-warn hover:bg-surface hover:text-fg"
                    >
                      ✕
                    </button>
                  </div>
                  <select
                    value={card.playerId}
                    onChange={(e) => setCardPlayer(index, e.target.value)}
                    className={`${fieldStyles} h-10 text-sm`}
                  >
                    <option value="">Select player…</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatPlayerLabel(p)}
                        {p.is_human ? '' : ' — AI'}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addCard}
            className="text-sm font-semibold text-warn"
          >
            + Add card
          </button>
        </div>

        <div className="mt-5 space-y-2 border-t border-line pt-5">
          <SubsectionHeading
            icon="📊"
            title="Other stats"
            meta={`${lines.length} ${lines.length === 1 ? 'player' : 'players'}`}
            className="text-fg"
          />
          {lines.map((line) => {
            const player = playerById.get(line.playerId)
            const isPotg = potgIds.includes(line.playerId)
            const shown = STATS.filter(
              (stat) =>
                !DERIVED_STAT_KEYS.includes(stat.key) &&
                statApplies(stat, player?.position ?? null, optNum(line.stats[stat.key]))
            )
            // Counts hidden stats too, so "Set 0 to blank" still clears them
            // while a keeper's card is collapsed.
            const hasZeros = shown.some(
              (stat) => stat.optional && (line.stats[stat.key] ?? '').trim() === '0'
            )
            const isKeeper = player?.position === 'GK'
            const keeperExtras = isKeeper ? shown.filter((stat) => !stat.gkOnly) : []
            const expanded = expandedKeepers.includes(line.playerId)
            const visible = isKeeper
              ? [...shown.filter((stat) => stat.gkOnly), ...(expanded ? keeperExtras : [])]
              : shown
            return (
              <div
                key={line.playerId}
                className="rounded-xl border border-line bg-surface-2 p-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {isPotg && (
                      <span
                        aria-hidden
                        className="mr-1 text-accent-text"
                      >
                        ★
                      </span>
                    )}
                    {player ? formatPlayerLabel(player) : 'Unknown player'}
                    {player && !player.is_human && (
                      <span className="ml-2 text-xs text-faint">AI</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePlayer(line.playerId)}
                    aria-label={`Remove ${player?.name ?? 'player'}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-surface-3 hover:text-fg"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {visible.map((stat) => (
                    <div key={stat.key} className="min-w-0">
                      <span
                        title={stat.label}
                        className="mb-0.5 block truncate text-center text-[10px] font-semibold uppercase tracking-wider text-faint"
                      >
                        {stat.shortLabel}
                      </span>
                      <Stepper
                        compact
                        value={optNum(line.stats[stat.key])}
                        onStep={(delta) => stepStat(line.playerId, stat.key, delta)}
                        label={`${player?.name ?? 'player'} ${stat.label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>

                {keeperExtras.length > 0 && (
                  // A full-width disclosure row: unlike the dotted-underline
                  // helper and the bordered POTG pill, it only changes what
                  // is shown, never the data.
                  <button
                    type="button"
                    onClick={() => toggleKeeperStats(line.playerId)}
                    aria-expanded={expanded}
                    className="mt-2 flex w-full items-center justify-center gap-1 border-t border-dashed border-line pt-1.5 text-xs font-medium text-accent-text transition-colors hover:text-accent-hover"
                  >
                    {expanded ? 'Hide' : 'Show'} {keeperExtras.length} more stats
                    <span
                      aria-hidden
                      className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                    >
                      ⌄
                    </span>
                  </button>
                )}

                <div className="mt-2 flex items-center justify-between gap-2">
                  {/* A form helper, so it reads as a quiet text action rather
                      than the bordered toggle that records a stat. */}
                  <button
                    type="button"
                    onClick={() => setZerosBlank(line.playerId)}
                    disabled={!hasZeros}
                    className="rounded-lg px-1.5 py-1 text-xs font-medium text-muted underline decoration-dotted underline-offset-2 hover:text-fg disabled:no-underline disabled:opacity-40"
                  >
                    Set 0 to blank
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePotg(line.playerId)}
                    aria-pressed={isPotg}
                    disabled={!isPotg && potgIds.length >= MAX_POTG}
                    className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                      isPotg
                        ? 'border-accent bg-accent-soft text-accent-text'
                        : 'border-line text-faint disabled:opacity-40'
                    }`}
                  >
                    <span aria-hidden>★</span> Player of the match
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {available.length > 0 && (
          <div className="mt-3">
            <Label htmlFor="add-player">Add player</Label>
            <select
              id="add-player"
              value=""
              onChange={(e) => addPlayer(e.target.value)}
              className={fieldStyles}
            >
              <option value="">Add a player…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPlayerLabel(p)}
                  {p.is_human ? '' : ' — AI'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-faint">
              Only active players are listed. Reactivate someone from the
              roster to add them here.
            </p>
          </div>
        )}

        {goalsMismatch && (
          <div className="mt-4 rounded-xl border border-warn-line bg-warn-soft p-3 text-sm text-warn">
            <p>
              Player goals ({attributedGoals}) plus opponent own goals (
              {num(oppOwnGoals)}) is {goalTotal}, but the score says {num(scoreUs)}.
            </p>
            <label className="mt-3 flex items-start gap-2 text-warn">
              <input
                type="checkbox"
                checked={allowUnattributed}
                onChange={(e) => setAllowUnattributed(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[var(--dt-accent)]"
              />
              <span>Save anyway (goals not fully attributed)</span>
            </label>
          </div>
        )}

        {targetMismatches.length > 0 && (
          <p className="mt-3 text-xs text-warn">
            {targetMismatches
              .map((l) => playerById.get(l.playerId)?.name ?? 'A player')
              .join(', ')}{' '}
            {targetMismatches.length === 1 ? 'has' : 'have'} more shots on target
            than shots. This will still save.
          </p>
        )}
      </Panel>

      {/* 5. Notes */}
      <Panel className="p-4">
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          aria-expanded={notesOpen}
          className="flex w-full items-center justify-between gap-2"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Notes (optional)
          </span>
          <span
            aria-hidden
            className={`text-faint transition-transform ${notesOpen ? 'rotate-180' : ''}`}
          >
            ⌄
          </span>
        </button>
        {notesOpen && (
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${fieldStyles} mt-3 min-h-24 py-2`}
          />
        )}
      </Panel>

      {error && (
        <p className="rounded-xl border border-loss/40 bg-loss-soft px-3 py-2 text-sm text-loss">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 p-3 backdrop-blur">
        <div className="mx-auto max-w-6xl">
          <div
            aria-live="polite"
            className="mb-1.5 px-1 text-xs font-medium"
          >
            {dirty ? (
              <span className="inline-flex items-center gap-1 text-warn">
                <span aria-hidden>●</span> Unsaved changes
              </span>
            ) : initial ? (
              <span className="text-faint">No changes yet</span>
            ) : null}
          </div>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className={`${buttonStyles.secondary} flex-1`}
          >
            Cancel
          </button>
          {initial && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={buttonStyles.danger}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={pending || (Boolean(initial) && !dirty)}
            className={`${buttonStyles.primary} flex-[2]`}
          >
            {pending ? 'Saving…' : initial ? 'Save changes' : 'Save match'}
          </button>
          </div>
        </div>
      </div>

      {confirmDelete && initial && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete match"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <Panel className="w-full max-w-sm p-5">
            <h2 className="text-lg font-bold">Delete this match?</h2>
            <p className="mt-2 text-sm text-muted">
              The match against {initial.opponent} and all of its player stats
              will be removed. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={`${buttonStyles.secondary} flex-1`}
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className={`${buttonStyles.danger} flex-1`}
              >
                {pending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
