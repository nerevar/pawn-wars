# pawn-wars
Chess pawn wars / Пешечные бои

https://nerevar.github.io/pawn-wars/

## AI move selection

An alpha-beta cutoff can return the current best score as a bound even when a
move is worse. Before randomly choosing between apparently tied root moves,
the search rechecks an equal score with a full window. Genuine ties still allow
random choice. The existing minimax, difficulty depths and logging are retained;
level 4 remains `bestV1` at depth 5.

The zero-balance factors `mediumAdjacentThreat` and `opponentBlocked` are removed
from evaluation and tuning. Historical JSON weight files still load: these two
names are ignored; other unknown factor names remain errors.

## Tests

```sh
node --test test/search.test.js
```

The tests use synthetic positions to check exhaustive minimax, false and genuine
ties, both colours, en passant, promotion, move ordering and browser integration.

The existing `node test/test_runner.js --runs 10` still has one known failing
`medium` position (choosing `d6` after `1. d4 h6 2. f3 f6 3. g3 e5 4. e3 f5
5. c3 g6 6. dxe5 b5 7. b3`). This also fails on the unchanged base version.
