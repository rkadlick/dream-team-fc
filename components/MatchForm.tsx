'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Panel, Label, buttonStyles, fieldStyles } from '@/components/ui'
import { STATS, emptyStats } from '@/lib/stats-config'
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
  stats: { player_id: string; [key: string]: string | number }[]
}

type Line = { playerId: string; stats: Record<string, number> }

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
        stats: Object.fromEntries(
          STATS.map((s) => [s.key, Number(row[s.key] ?? 0)])
        ),
      }))
    }
    // New match: every active human is pre-listed at zero.
    return players
      .filter((p) => p.is_human)
      .map((p) => ({ playerId: p.id, stats: emptyStats() }))
  })

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

  const attributedGoals = lines.reduce((sum, l) => sum + (l.stats.goals ?? 0), 0)
  const goalTotal = attributedGoals + num(oppOwnGoals)
  const goalsMismatch = goalTotal !== num(scoreUs)

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
    lines,
  })
  // Captured once, on first render, then compared on every later one.
  const [initialSnapshot] = useState(snapshot)
  const dirty = snapshot !== initialSnapshot

  const setStat = (playerId: string, key: string, value: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.playerId === playerId
          ? { ...l, stats: { ...l.stats, [key]: num(value) } }
          : l
      )
    )
  }

  const addPlayer = (playerId: string) => {
    if (!playerId) return
    setLines((prev) => [...prev, { playerId, stats: emptyStats() }])
  }

  const removePlayer = (playerId: string) => {
    setLines((prev) => prev.filter((l) => l.playerId !== playerId))
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
      stats: lines.map((l) => ({ player_id: l.playerId, ...l.stats })),
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

      {/* 6. Player stats */}
      <Panel className="p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <Label>Player stats</Label>
          <span className="text-xs text-faint">
            {attributedGoals} + {num(oppOwnGoals)} OG = {goalTotal} / {num(scoreUs)}
          </span>
        </div>

        <div className="space-y-2">
          {lines.map((line) => {
            const player = playerById.get(line.playerId)
            return (
              <div
                key={line.playerId}
                className="rounded-xl border border-line bg-surface-2 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {player ? formatPlayerLabel(player) : 'Unknown player'}
                    {player && !player.is_human && (
                      <span className="ml-2 text-xs text-faint">AI</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePlayer(line.playerId)}
                    aria-label={`Remove ${player?.name ?? 'player'}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-surface-3 hover:text-fg"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {STATS.map((stat) => (
                    <div key={stat.key}>
                      <label
                        htmlFor={`${line.playerId}-${stat.key}`}
                        className="mb-1 block text-[11px] uppercase tracking-wider text-faint"
                      >
                        {stat.label}
                      </label>
                      <input
                        id={`${line.playerId}-${stat.key}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={line.stats[stat.key] ?? 0}
                        onChange={(e) =>
                          setStat(line.playerId, stat.key, e.target.value)
                        }
                        className={`${fieldStyles} h-12 text-center text-lg font-semibold`}
                      />
                    </div>
                  ))}
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
      </Panel>

      {error && (
        <p className="rounded-xl border border-loss/40 bg-loss-soft px-3 py-2 text-sm text-loss">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/90 p-3 backdrop-blur">
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
