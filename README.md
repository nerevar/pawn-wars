# pawn-wars
Chess pawn wars / Пешечные бои

https://nerevar.github.io/pawn-wars/

## AI search

The root search rechecks equal alpha-beta bounds with a full window before
randomly choosing among tied moves. This prevents a pruned, inferior move from
replacing a forced win. Iterative deepening searches previous best moves first;
a bounded, per-call transposition table stores exact scores and cutoff bounds.
Custom evaluators opt into caching with `transpositionSafe: true` only when their
scores depend on the position and root ply, not on move history.

`findBestMove(strategyOrDifficulty, getAllMoves, options)` retains the existing
move/score interface and reports search statistics. All-moves mode returns exact
root scores for the completed depth. Optional `maxNodes` interruption returns
only the last completed iteration, or a legal move with `score: null` if none
completed. The board and history are restored after interruption or exceptions.
No node or time budget is enabled by the UI. Level 4 remains `bestV1` at depth 5;
other difficulty depths and browser execution are unchanged.

The zero-balance factors `mediumAdjacentThreat` and `opponentBlocked` have been
removed from evaluation and tuning. Historical JSON weight files remain valid:
these two names are ignored; other unknown factor names still raise an error.

## Tests

Requires Node.js with the built-in test runner:

```sh
node --test test/search.test.js
```

The suite checks exhaustive minimax on small boards, both colours, en passant,
promotion and no-move endings, tie selection, cache bounds, state restoration,
and the browser script contract. All test positions are synthetic or built from
short, explicit opening sequences; no private game dataset is required.

The existing `node test/test_runner.js --runs 10` still has one known failing
`medium` position (choosing `d6` after `1. d4 h6 2. f3 f6 3. g3 e5 4. e3 f5
5. c3 g6 6. dxe5 b5 7. b3`). This also fails on the unchanged base version.
