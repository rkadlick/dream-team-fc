'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Panel, Label, buttonStyles, fieldStyles } from '@/components/ui'
import {
  MATCH_STATS,
  MAX_POTG,
  STATS,
  emptyStats,
  statApplies,
} from '@/lib/stats-config'
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
}

type Line = { playerId: string; stats: StatInputs }

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

function blankInputs(): StatInputs {
  return toInputs(emptyStats() as Record<string, number | null>)
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
  defaults: { seasonId: string; division: number; playedOn?: string }
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
  const [division, setDivision] = useState(
    String(initial?.division ?? defaults.division)
  )
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
    return players.map((p) => ({ playerId: p.id, stats: blankInputs() }))
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

  const attributedGoals = lines.reduce(
    (sum, l) => sum + num(l.stats.goals ?? '0'),
    0
  )
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
  })
  // Captured once, on first render, then compared on every later one.
  const [initialSnapshot] = useState(snapshot)
  const dirty = snapshot !== initialSnapshot

  const setStat = (playerId: string, key: string, value: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.playerId === playerId
          ? { ...l, stats: { ...l.stats, [key]: value } }
          : l
      )
    )
  }

  const addPlayer = (playerId: string) => {
    if (!playerId) return
    setLines((prev) => [...prev, { playerId, stats: blankInputs() }])
  }

  const removePlayer = (playerId: string) => {
    setLines((prev) => prev.filter((l) => l.playerId !== playerId))
    // A player who did not appear cannot be player of the match.
    setPotgIds((prev) => prev.filter((id) => id !== playerId))
  }

  /**
   * Fills this player's blank boxes with 0; anything already typed is kept.
   * Stats that do not apply (saves for an outfielder) stay blank, otherwise
   * the 0 would make the hidden box appear.
   */
  const zeroBlanks = (playerId: string) => {
    const position = playerById.get(playerId)?.position ?? null
    setLines((prev) =>
      prev.map((l) => {
        if (l.playerId !== playerId) return l
        const stats = { ...l.stats }
        for (const stat of STATS) {
          if ((stats[stat.key] ?? '').trim() !== '') continue
          if (!statApplies(stat, position, null)) continue
          stats[stat.key] = '0'
        }
        return { ...l, stats }
      })
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
    if (goalsMismatch && !allowUnattributed) {
      setError('Goals do not add up. Fix them, or tick “Save anyway”.')
      return
    }

    const payload: SaveMatchPayload = {
      ...(initial ? { id: initial.id } : {}),
      season_id: seasonId,
      game_type_id: gameTypeId,
      played_on: playedOn,
      division: num(division, 1) || 1,
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
            STATS.map((stat) => [
              stat.key,
              stat.optional ? optNum(l.stats[stat.key]) : num(l.stats[stat.key] ?? '0'),
            ])
          ),
        }
      }),
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
    `min-h-12 flex-1 rounded-xl border text-sm font-semibold transition-colors ${
      active
        ? 'border-accent bg-accent-soft text-accent-text'
        : 'border-line bg-surface-2 text-muted'
    }`

  return (
    <div className="space-y-6 pb-24">
      {/* 1. When and what */}
      <Panel className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
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
            <Label htmlFor="division">Division</Label>
            <input
              id="division"
              type="number"
              inputMode="numeric"
              min={1}
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className={fieldStyles}
            />
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

      {/* 2. Opponent */}
      <Panel className="space-y-4 p-4">
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

        <div>
          <Label>Home or away</Label>
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
        </div>
      </Panel>

      {/* 3. Score */}
      <Panel className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="score_us">Us</Label>
            <input
              id="score_us"
              type="number"
              inputMode="numeric"
              min={0}
              value={scoreUs}
              onChange={(e) => setScoreUs(e.target.value)}
              className={`${fieldStyles} h-14 text-center text-2xl font-bold`}
            />
          </div>
          <div>
            <Label htmlFor="score_them">Them</Label>
            <input
              id="score_them"
              type="number"
              inputMode="numeric"
              min={0}
              value={scoreThem}
              onChange={(e) => setScoreThem(e.target.value)}
              className={`${fieldStyles} h-14 text-center text-2xl font-bold`}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="own_goals">Opponent own goals (already in our score)</Label>
          <input
            id="own_goals"
            type="number"
            inputMode="numeric"
            min={0}
            value={oppOwnGoals}
            onChange={(e) => setOppOwnGoals(e.target.value)}
            className={fieldStyles}
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
                className={fieldStyles}
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
                className={fieldStyles}
              />
            </div>
          </div>
        )}
      </Panel>

      {/* 4. Result */}
      <Panel className="p-4">
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
        <p className="mt-2 text-xs text-faint">
          Suggested: <span className="font-semibold text-fg">{suggested}</span>
          {effectiveResult !== suggested && ' — you have overridden it.'}
        </p>
      </Panel>

      {/* 5. Notes */}
      <Panel className="p-4">
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${fieldStyles} min-h-24 py-2`}
        />
      </Panel>

      {/* 6. Team stats, both sides */}
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
                        className="mb-1 block text-[11px] text-faint"
                      >
                        {side === 'us' ? 'Us' : 'Them'}
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
                ? 'us'
                : 'them'}
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

      {/* 7. Player stats */}
      <Panel className="p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <Label>Player stats</Label>
          <span className="text-xs text-faint">
            {attributedGoals} + {num(oppOwnGoals)} OG = {goalTotal} / {num(scoreUs)}
          </span>
        </div>
        <p className="mb-3 text-[11px] text-faint">
          Everyone listed here counts as having played this match. Remove anyone
          who did not feature. Leave a box empty for anything you did not
          track — empty is not the same as zero.
          {potgIds.length > 0 &&
            ` · ${potgIds.length} of ${MAX_POTG} player-of-the-match picks used.`}
        </p>

        <div className="space-y-2">
          {lines.map((line) => {
            const player = playerById.get(line.playerId)
            const isPotg = potgIds.includes(line.playerId)
            const shown = STATS.filter((stat) =>
              statApplies(
                stat,
                player?.position ?? null,
                optNum(line.stats[stat.key])
              )
            )
            const hasBlanks = shown.some(
              (stat) => (line.stats[stat.key] ?? '').trim() === ''
            )
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
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                  {shown.map((stat) => (
                    <div key={stat.key} className="min-w-0">
                      <label
                        htmlFor={`${line.playerId}-${stat.key}`}
                        title={stat.label}
                        className="mb-0.5 block truncate text-center text-[10px] font-semibold uppercase tracking-wider text-faint"
                      >
                        {stat.shortLabel}
                      </label>
                      <input
                        id={`${line.playerId}-${stat.key}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder="—"
                        aria-label={stat.label}
                        value={line.stats[stat.key] ?? ''}
                        onChange={(e) =>
                          setStat(line.playerId, stat.key, e.target.value)
                        }
                        className={`${fieldStyles} h-10 px-1 text-center text-base font-semibold`}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  {/* A form helper, so it reads as a quiet text action rather
                      than the bordered toggle that records a stat. */}
                  <button
                    type="button"
                    onClick={() => zeroBlanks(line.playerId)}
                    disabled={!hasBlanks}
                    className="rounded-lg px-1.5 py-1 text-xs font-medium text-muted underline decoration-dotted underline-offset-2 hover:text-fg disabled:no-underline disabled:opacity-40"
                  >
                    Set blanks to 0
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
