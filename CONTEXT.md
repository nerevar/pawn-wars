# Pawn Wars — AI Development Context

## Project Overview

Pawn Wars (Пешечные войны) — chess variant where each player has 8 pawns. First to promote a pawn to queen wins. Browser SPA (no build system) + Node.js testing infrastructure.

**Live URL**: GitHub Pages deployment  
**Tech stack**: Vanilla JS, Chess.js 1.1.0, Chessboard.js, jQuery

## File Structure

```
pawn-wars/
  index.html          — SPA: HTML + CSS + script loading (CDN libs + local files)
  game.js             — Board setup, move generation, win detection, pawn utilities
  strategies.js       — Evaluation functions + strategy definitions (NEW)
  ai.js               — Minimax engine with alpha-beta pruning (refactored)
  script.js           — Browser UI, modals, drag-drop, URL state persistence
  chess.js             — Vendored chess.js@1.1.0 CJS (for Node.js)
  run_ai.js           — Tournament runner CLI (refactored)
  test/
    test_runner.js     — Position test runner CLI (NEW)
    test_positions.js  — Position-based test cases (NEW)
  notes.txt           — Development notes, game URLs with known issues
  games.log           — AI match log
```

**Browser loading order**: game.js → strategies.js → ai.js → script.js  
**Node.js**: `require()` + `globalThis` assignments (see run_ai.js for pattern)

## Architecture

### Strategy Interface

A strategy is a plain object:
```js
{
    name: 'Strategy Name',
    depth: 4,                    // minimax search depth
    evaluate: function(path) {   // returns score: positive=white, negative=black
        return score;
    }
}
```

Strategies are defined in `strategies.js` → `STRATEGIES` object. The `difficultyToStrategy(level)` function maps browser difficulty levels (0-3) to strategies.

### Current Strategies

| Key | Name | Description |
|-----|------|-------------|
| `random` | Random | Returns 0 for all positions (depth 1) |
| `medium` | Medium (baseline) | **The best-performing algorithm**. Evaluates: advancement distance (*2), free path (+0.7), adjacent threats (-0.8), center column (+0.2), next-move safety (*2). Win/loss: ±100000 |
| `mediumPlusMajority` | Medium + Majority | Baseline + 0.5 * majority factor |
| `mediumPlusCaptures` | Medium + Captures | Baseline + 0.3 * capture opportunities factor |
| `advancementOnly` | Advancement Only | Only pawn advancement scoring (significantly weaker than baseline) |

### Available Factor Functions (in strategies.js)

Building blocks for composing new strategies:

- `evaluateBoardMedium(path)` — the baseline, returns score directly
- `checkGameEnd(isFinished(), path)` — ±100000 for win/loss, adjusted by path length
- `evaluatePawnAdvancement(color)` — cumulative distance bonus (fall-through switch)
- `evaluatePawnCount(color)` — 50 per pawn
- `evaluateCaptureOpportunities(color)` — safe captures +80, trades +20
- `evaluateFreePath(color)` — +100 for clear column + safe adjacent columns
- `evaluateMajority(color)` — 2-vs-1 pawn advantage in adjacent columns

### Minimax Engine (ai.js)

- Alpha-beta pruning
- Move ordering: promotions > captures > forward moves (in game.js `getMoves()`)
- `getBestRandomMove()`: picks shortest path to best score, random among ties
- `findBestMove(strategyOrDifficulty, getAllMoves)` — accepts both strategy objects and difficulty numbers

## CLI Tools

### Tournament Runner
```bash
node run_ai.js list                              # List strategies
node run_ai.js compare medium mediumPlusMajority 500   # Compare (500 games)
```
Output: win rate, 95% CI, p-value, significance test (z-test). Each tournament swaps sides (half games as white, half as black).

### Position Tests
```bash
node test/test_runner.js                         # Run all tests
node test/test_runner.js --filter "promote"      # Filter by name
node test/test_runner.js --runs 20               # Runs per test (default: 10)
```
Each test runs N times to handle minimax randomness. Pass = good move >= 80% AND bad move = 0%.

## How to Add a New Strategy

1. In `strategies.js`, add to the `STRATEGIES` object:
```js
myNewStrategy: {
    name: 'My New Strategy',
    depth: 4,
    evaluate: function(path) {
        var base = evaluateBoardMedium(path);
        if (Math.abs(base) > 50000) return base;  // game-end, don't modify
        return base
            + 0.5 * (evaluateMajority('w') - evaluateMajority('b'))
            + 0.3 * (evaluateFreePath('w') - evaluateFreePath('b'));
    },
},
```

2. Test against baseline:
```bash
node run_ai.js compare medium myNewStrategy 500
```

3. If it wins significantly (p < 0.05), add position tests to `test/test_positions.js` to catch regressions.

## How to Add a Position Test

In `test/test_positions.js`, add to `POSITION_TESTS` array:
```js
{
    name: 'description of what AI should do',
    moves: '1. d3 d5 2. e4 c6',  // PGN move sequence to set up position
    turn: 'b',                    // expected side to move
    strategy: 'medium',           // which strategy to test
    goodMoves: ['exd5'],          // AI should pick one of these (>= 80% of runs)
    badMoves: ['a3'],             // AI should never pick these (0% of runs)
},
```

## Refactoring History (2026-05-17)

### What was done
- **Created `strategies.js`**: Moved all evaluation functions from ai.js. Defined strategy interface and STRATEGIES object.
- **Cleaned `ai.js`**: Removed ~800 lines of dead code (evaluateBoard3, evaluateBoard2Deprecated, unused helpers, broken evaluateMove, logNodeFactors with undefined variable bugs). Refactored minimax/findBestMove to accept strategy objects.
- **Deleted `factors.js`**: The EVALUATION_FACTORS registry pattern was replaced by the simpler strategy interface.
- **Upgraded `run_ai.js`**: CLI interface, accepts strategy names, improved output formatting.
- **Created position test system**: test/test_runner.js + test/test_positions.js with 3 initial test cases.

### What was preserved
- `evaluateBoardMedium` — the best algorithm, unchanged
- Minimax with alpha-beta pruning — unchanged logic
- `getBestRandomMove` — shortest-path + random tie-breaking
- Browser UI (script.js) — no changes needed
- URL state persistence — works as before
- Browser difficulty levels 0-3 — mapped via `difficultyToStrategy()`

### What was removed (dead code)
- `evaluateBoard3()` — legacy difficulty-gated factor accumulation
- `evaluateBoard2Deprecated()` — old evaluation
- `evaluateBoard()` router — replaced by `strategy.evaluate()` direct call
- `logNodeFactors()` — had bugs (referenced undefined variables)
- `evaluateMove()` — broken (wrong minimax call signature)
- `getPathDepth()` — never called
- `getPieceFactors()`, `calculatePromotionDistance()`, `getCenterColumnBonus()`, `getNextMoveFree()`, `getFreePathBonus()`, `getAdjacentThreatPenalty()` — only used by deprecated code
- `getNoMovesPenalty()` — only used by deprecated code

### Design decisions
- **JS only (no Python)**: Chess.js is deeply coupled (direct `game._board[]` access), Node.js v24 is fast enough for minimax, no dual-codebase sync needed
- **No factor registry**: Plain function composition in strategy evaluate() body — weights visible in one line
- **Move-sequence tests (not FEN)**: Matches how users discover bad AI moves (from URL params / PGN)
- **Statistical testing**: z-test with p < 0.05 threshold, N=500+ recommended for detecting 5% effects

## Known Issues / TODO

From `notes.txt` — positions where the AI plays poorly:
- En passant choice errors (captured in test case 1)
- Greedy behavior: prefers score accumulation over promotion (captured in test case 3)
- Poor exchange evaluation: "шило на мыло не меняем"
- Blocking tactics: one pawn blocking 2-3 opponent pawns not valued enough
- Reserve moves: AI should save backward pawns for endgame

## Performance Benchmarks

- ~230 ms/game at depth 4 (Node.js v24)
- ~4.6s for 20-game comparison
- For N=500 (statistical significance for 5% effect): ~57s
