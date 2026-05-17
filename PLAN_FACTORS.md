# PLAN.md — Building the Strongest Computer Player for Pawn Battles

## 0. Project goal

The goal is to build the strongest possible computer player for **Pawn Battles**: a chess-like game played only with pawns. The project already has:

- a JavaScript game implementation;
- a minimax search tree with alpha-beta pruning;
- a black-box baseline computer player that plays reasonably well;
- a JS framework for defining strategies and board-evaluation factors;
- weight search for evaluation factors;
- strategy-vs-strategy tournaments with side switching;
- statistical-significance testing across many rounds.

This document turns practical pawn strategy, Hexapawn research, and computer-chess pawn-structure ideas into a structured backlog of possible `evaluateBoard` features and experimental directions.

The main practical objective is:

> Build a modular evaluation function that can be tuned, ablated, compared against the black-box baseline, and eventually used as a foundation for automated search, self-play, tablebase supervision, or learned evaluation.

---

## 1. Research context

### 1.1 Why Pawn Battles are strategically rich

Pawn-only chess variants look simple, but they preserve many of the deepest features of pawn endgames:

- pawn moves are mostly irreversible;
- every pawn advance changes future geometry;
- tempo matters enormously;
- zugzwang-like positions occur naturally;
- passed pawns are often decisive;
- connected pawns and pawn chains can dominate the board;
- pawn majorities can be converted into passed pawns;
- blockades may be stronger than direct advancement;
- sacrifices can create breakthroughs;
- the value of a pawn depends heavily on distance to promotion and local support.

In ordinary chess engines, pawn structure is evaluated separately because pawn configurations change more slowly than piece placement and contain long-term strategic information. In Pawn Battles, this is not merely one part of evaluation; it is almost the entire game.

### 1.2 Hexapawn as the closest research relative

The closest well-known research toy problem is **Hexapawn**, introduced by Martin Gardner. Classic Hexapawn is played on a 3×3 board with three pawns per side. A player wins by promoting a pawn, capturing all opposing pawns, or leaving the opponent with no legal move, depending on the specific rule formulation. Gardner used it as a matchbox-based learning-machine example.

Hexapawn is relevant because it is:

- deterministic;
- two-player;
- perfect-information;
- small enough to solve;
- easy to express as a game tree;
- suitable for comparing learning algorithms against minimax-optimal play;
- good for discovering human-comprehensible strategic rules.

Research on Hexapawn and other simple games has compared reinforcement-learning approaches with symbolic rule-learning systems. One useful concept from this literature is **minimax regret**: how much worse the played outcome is than the minimax-optimal outcome. This is directly relevant to your framework because your minimax implementation can potentially generate exact labels for smaller board sizes or reduced positions.

Useful references:

- Martin Gardner, *Matchbox Game-Learning Machine / Hexapawn* — classic introduction to Hexapawn and matchbox learning: <https://people.csail.mit.edu/brooks/idocs/GardnerHexapawn.pdf>
- Stephen H. Muggleton et al., *Machine Discovery of Comprehensible Strategies for Simple Games* — Hexapawn, symbolic strategies, cumulative minimax regret: <https://link.springer.com/article/10.1007/s00354-019-00054-2>
- Hocquette & Muggleton, *Can Meta-Interpretive Learning outperform Deep Reinforcement Learning of Evaluable Game Strategies?* — arXiv version: <https://arxiv.org/abs/1902.09835>
- Imperial College lecture notes on inductive programming and minimax regret: <https://www.doc.ic.ac.uk/~shm/IP/Lecture8.pdf>

### 1.3 Computer-chess pawn-structure references

The computer-chess literature contains many directly useful definitions:

- passed pawns;
- connected passed pawns;
- candidate passed pawns;
- doubled pawns;
- isolated pawns;
- backward pawns;
- pawn islands;
- pawn chains;
- pawn levers;
- blockades;
- promotion races.

Useful references:

- Chessprogramming Wiki, *Passed Pawn*: <https://www.chessprogramming.org/Passed_Pawn>
- Chessprogramming Wiki, *Candidate Passed Pawn*: <https://www.chessprogramming.org/Candidate_Passed_Pawn>
- Chessprogramming Wiki, *Connected Passed Pawns*: <https://www.chessprogramming.org/Connected_Passed_Pawns>
- Wikipedia, *Connected pawns*: <https://en.wikipedia.org/wiki/Connected_pawns>
- Thinkers Publishing sample chapter, *The Passed Pawn*: <https://thinkerspublishing.com/wp-content/uploads/2022/05/PASSED-PAWN.pdf>

---

## 2. Recommended strategy architecture

A clean strategy should separate:

1. legal move generation;
2. terminal-state detection;
3. feature extraction;
4. evaluation scoring;
5. search;
6. experimental comparison.

Suggested shape:

```js
function evaluateBoard(board, sideToMove, config) {
  const features = extractFeatures(board, sideToMove, config);
  return dotProduct(features, config.weights) + config.bias;
}
```

Feature extraction should return a transparent dictionary:

```js
{
  materialBalance: 1,
  advancementBalance: 4,
  passedPawnBalance: 2,
  connectedPawnBalance: 1,
  blockedPawnPenalty: -0.5,
  immediatePromotionThreat: 1,
  opponentImmediatePromotionThreat: -1,
  totalMobilityBalance: 3
}
```

For debugging and strategy iteration, every evaluation should optionally expose a breakdown:

```js
{
  score: 8.75,
  terms: {
    materialBalance: { value: 1, weight: 2.0, contribution: 2.0 },
    advancementBalance: { value: 4, weight: 0.6, contribution: 2.4 },
    passedPawnBalance: { value: 2, weight: 2.5, contribution: 5.0 },
    blockedPawnPenalty: { value: -1, weight: 0.7, contribution: -0.7 }
  }
}
```

This makes it much easier to inspect why a strategy preferred one move over another.

---

## 3. Feature priority levels

### Level A — must-have factors

These are likely to provide immediate playing strength:

1. material balance;
2. pawn advancement;
3. terminal win/loss detection;
4. passed pawns;
5. opponent passed pawns;
6. distance to promotion;
7. promotion threats;
8. blocked pawns;
9. legal move count / mobility;
10. pawn support / defended pawns.

### Level B — strong strategic factors

These should be tested after the base evaluation works:

1. connected pawns;
2. connected passed pawns;
3. protected passed pawns;
4. candidate passed pawns;
5. pawn chains;
6. pawn islands;
7. isolated pawns;
8. doubled pawns;
9. backward pawns;
10. pawn majorities by wing or file group;
11. breakthrough motifs;
12. blockade strength.

### Level C — advanced search-aware factors

These may require shallow lookahead, local tactical probes, or tablebase support:

1. forced promotion in N moves;
2. unstoppable passer detection;
3. race evaluation;
4. zugzwang sensitivity;
5. only-move positions;
6. tempo reserve;
7. critical-square control;
8. minimax regret labels;
9. self-play value targets;
10. move-ordering heuristics.

---

## 4. Core board-evaluation factors

### 4.1 Terminal outcome factor

Before evaluating ordinary features, terminal positions should be handled explicitly.

Possible terminal conditions depend on the exact rules of your Pawn Battles variant. Common cases:

- own pawn reaches promotion rank: win;
- opponent pawn reaches promotion rank: loss;
- opponent has no pawns: win;
- own side has no pawns: loss;
- opponent has no legal moves: win or draw, depending on rules;
- own side has no legal moves: loss or draw, depending on rules.

Implementation idea:

```js
if (isWin(board, sideToMove)) return +WIN_SCORE;
if (isLoss(board, sideToMove)) return -WIN_SCORE;
```

Use a very large score, but leave space for mate-distance or promotion-distance preferences:

```js
const WIN_SCORE = 1_000_000;
const PROMOTION_SOON_BONUS = 10_000;
```

If the engine can know win-in-N, prefer faster wins and slower losses:

```js
score = WIN_SCORE - plyDistance;
score = -WIN_SCORE + plyDistance;
```

### 4.2 Material balance

The simplest feature:

```js
materialBalance = ownPawnCount - opponentPawnCount;
```

Material matters, but in pawn-only games a single advanced passed pawn can be more important than multiple backward or blocked pawns. Therefore material should be a baseline, not the dominant factor.

Useful variants:

```js
ownPawnCount
opponentPawnCount
materialBalance
materialRatio = ownPawnCount / max(1, opponentPawnCount)
```

Expected behavior:

- positive if we have more pawns;
- negative if opponent has more pawns;
- smaller weight than decisive passed-pawn features.

### 4.3 Advancement balance

Pawns become more dangerous as they advance toward promotion.

For each pawn:

```js
advance = distanceFromStartingRank(pawn, side);
```

Or:

```js
promotionProgress = boardHeight - 1 - distanceToPromotion(pawn, side);
```

Feature variants:

```js
ownAdvancementSum - opponentAdvancementSum
ownMaxAdvancement - opponentMaxAdvancement
ownAverageAdvancement - opponentAverageAdvancement
```

Use nonlinear scoring because a pawn one step from promotion is much more valuable than a pawn on its starting rank:

```js
progressScore = progress ** 2;
```

or:

```js
progressScore = promotionDistanceWeights[distanceToPromotion];
```

Example distance weights:

```js
{
  1: 100,
  2: 30,
  3: 10,
  4: 4,
  5: 1
}
```

### 4.4 Distance to promotion

This factor focuses directly on the nearest promoting pawn.

Possible features:

```js
ownMinDistanceToPromotion
opponentMinDistanceToPromotion
promotionDistanceBalance = opponentMinDistanceToPromotion - ownMinDistanceToPromotion
```

The sign convention means: if our closest pawn is closer to promotion than the opponent’s closest pawn, the balance is positive.

This feature should become more important in simplified positions and promotion races.

### 4.5 Immediate promotion threat

Detect whether the side has a pawn that can promote on the next move.

```js
ownCanPromoteNextMove = 0 | 1
opponentCanPromoteNextMove = 0 | 1
immediatePromotionThreatBalance = ownCanPromoteNextMove - opponentCanPromoteNextMove
```

This should receive a very large weight, unless search already sees the promotion directly. Even with minimax, this factor helps move ordering and shallow searches.

### 4.6 Two-ply promotion threat

Detect whether a pawn can promote in two moves and cannot obviously be stopped.

Approximate feature:

```js
ownCanPromoteInTwo = countOwnPawns(distanceToPromotion === 2 && pathNotBlocked)
opponentCanPromoteInTwo = countOpponentPawns(distanceToPromotion === 2 && pathNotBlocked)
```

A stronger version checks whether the opponent can capture or block the pawn in time.

### 4.7 Passed pawn factor

A passed pawn is a pawn with no opposing pawns ahead of it on the same file or adjacent files. In pawn-only games this is one of the most important features.

For each own pawn:

```js
isPassed(pawn, side) = no opponent pawn exists in pawn.frontSpan on same or adjacent files
```

Features:

```js
ownPassedPawnCount
opponentPassedPawnCount
passedPawnBalance
ownPassedPawnAdvancementScore
opponentPassedPawnAdvancementScore
```

Passed pawns should be scored by advancement:

```js
passedPawnScore += passedPawnDistanceWeights[distanceToPromotion];
```

Suggested distance-based values:

```js
distance 1: enormous
 distance 2: very high
 distance 3: high
 distance 4+: moderate
```

### 4.8 Protected passed pawn

A protected passed pawn is passed and defended by another friendly pawn. It is stronger than an unsupported passed pawn because the opponent cannot capture it without consequence.

Feature:

```js
ownProtectedPassedPawns - opponentProtectedPassedPawns
```

Implementation:

```js
isProtectedPassedPawn(pawn, side) = isPassed(pawn, side) && isDefendedByFriendlyPawn(pawn, side)
```

This factor is especially important because in a pawn-only game, pawn defense is often the only defense.

### 4.9 Connected passed pawns

Connected passed pawns are two or more passed pawns on adjacent files. They are often extremely hard to stop because one pawn can support the advance of another or create multiple promotion threats.

Features:

```js
ownConnectedPassedPawnPairs
opponentConnectedPassedPawnPairs
ownConnectedPassedPawnGroups
opponentConnectedPassedPawnGroups
maxOwnConnectedPassedGroupSize
maxOpponentConnectedPassedGroupSize
```

Scoring should be nonlinear:

```js
connectedPassedScore += groupSize ** 2 * advancementMultiplier;
```

Two connected passed pawns close to promotion may be nearly decisive.

### 4.10 Candidate passed pawn

A candidate passed pawn is not yet fully passed, but can become passed after exchanges or advances. Computer-chess sources note that exact recognition can require recursive search, so engines often use approximations.

Approximate definition:

> A pawn is a candidate passer if its path forward is not controlled by more enemy pawns than friendly pawns, and if friendly pawn support can help it break through.

Features:

```js
ownCandidatePassers
opponentCandidatePassers
candidatePasserBalance
candidatePasserAdvancementBalance
```

Implementation approximation:

For each pawn:

1. examine squares in front of it;
2. count enemy pawn attacks on those squares;
3. count friendly pawn support;
4. check whether blocking enemy pawns can be challenged or exchanged;
5. assign candidate score if the pawn has a plausible route to become passed.

This is a high-value feature because it helps the engine prefer moves that create future passed pawns, not only existing ones.

---

## 5. Pawn support and structure factors

### 5.1 Defended pawn count

A pawn is defended if another friendly pawn attacks its square.

Feature:

```js
ownDefendedPawns - opponentDefendedPawns
```

Defended pawns are usually stronger because they cannot be captured for free.

### 5.2 Undefended pawn penalty

A pawn is undefended if no friendly pawn protects it.

```js
ownUndefendedPawns
opponentUndefendedPawns
undefendedPawnBalance = opponentUndefendedPawns - ownUndefendedPawns
```

This factor should not blindly punish all undefended pawns. A passed pawn one step from promotion may be strong even if undefended.

### 5.3 Hanging / loose pawn penalty

A loose pawn is undefended and attackable by an enemy pawn.

```js
isLoosePawn(pawn) = !isDefended(pawn) && isAttackedByEnemyPawn(pawn)
```

Feature:

```js
opponentLoosePawns - ownLoosePawns
```

### 5.4 Pawn chains

A pawn chain consists of diagonally connected pawns where rear pawns defend advanced pawns. Pawn chains create stable structure and space.

Features:

```js
ownPawnChainLinks
opponentPawnChainLinks
ownLongestPawnChain
opponentLongestPawnChain
pawnChainBalance
```

A chain link exists when one friendly pawn defends another friendly pawn diagonally forward.

Possible scoring:

```js
chainScore = numberOfLinks + 0.5 * longestChainLength
```

### 5.5 Chain base weakness

In chess, the base of a pawn chain is often the weak point because it is not protected by another pawn. In Pawn Battles, attacking the chain base may collapse the structure.

Feature:

```js
ownWeakChainBases
opponentWeakChainBases
weakChainBaseBalance = opponentWeakChainBases - ownWeakChainBases
```

Implementation:

1. identify pawn chains;
2. find the rearmost pawn in each chain;
3. check whether it is attacked or blockaded;
4. penalize if it is hard to defend.

### 5.6 Connected pawns

Connected pawns are pawns on adjacent files. They may be on the same rank, diagonally connected, or part of a larger structure.

Features:

```js
ownConnectedPawnPairs
opponentConnectedPawnPairs
connectedPawnBalance
```

This is weaker than connected passed pawns, but still useful as a structural feature.

### 5.7 Pawn phalanx

A phalanx is a group of friendly pawns side-by-side on the same rank. In pawn-only games, a phalanx can control many forward diagonal squares and can choose when to advance.

Feature:

```js
ownPhalanxPairs
opponentPhalanxPairs
ownMaxPhalanxWidth
opponentMaxPhalanxWidth
```

A phalanx near promotion is much more dangerous than one near the starting rank.

Suggested scoring:

```js
phalanxScore += width * rankProgressMultiplier
```

### 5.8 Pawn islands

A pawn island is a group of pawns separated from other friendly pawns by empty files. More pawn islands usually mean weaker structure.

Features:

```js
ownPawnIslands
opponentPawnIslands
pawnIslandBalance = opponentPawnIslands - ownPawnIslands
```

In small-board Pawn Battles, this may or may not matter. Test it empirically.

### 5.9 Isolated pawns

An isolated pawn has no friendly pawn on adjacent files. It cannot be defended by another pawn and may become a target.

Features:

```js
ownIsolatedPawns
opponentIsolatedPawns
isolatedPawnBalance = opponentIsolatedPawns - ownIsolatedPawns
```

Do not over-penalize isolated passed pawns close to promotion.

### 5.10 Doubled pawns

Doubled pawns are two pawns of the same color on the same file. In normal chess they are often weak because they cannot defend each other and may block each other. In Pawn Battles, the exact value depends on rules and board geometry.

Features:

```js
ownDoubledPawnFiles
opponentDoubledPawnFiles
ownDoubledPawnCount
opponentDoubledPawnCount
```

Potential penalty:

```js
doubledPawnPenalty = ownDoubledPawnCount - opponentDoubledPawnCount
```

But test carefully: doubled pawns can sometimes form useful reserves or blockades.

### 5.11 Backward pawns

A backward pawn is behind neighboring friendly pawns, cannot safely advance, and may become a weakness.

Approximate feature:

```js
isBackwardPawn(pawn) =
  hasFriendlyPawnOnAdjacentFileAhead &&
  forwardSquareIsControlledByEnemy &&
  pawnIsNotSafelyAdvanceable
```

Features:

```js
ownBackwardPawns
opponentBackwardPawns
backwardPawnBalance = opponentBackwardPawns - ownBackwardPawns
```

This is probably a Level B/C feature because definitions can be subtle.

---

## 6. Mobility, blockades, and space

### 6.1 Legal move count

Mobility matters because a side with no useful moves can be forced into zugzwang.

Feature:

```js
mobilityBalance = ownLegalMoves.length - opponentLegalMoves.length
```

Variants:

```js
ownForwardMoves
ownCaptureMoves
opponentForwardMoves
opponentCaptureMoves
```

### 6.2 Capture mobility

Captures can change material and open files.

Feature:

```js
captureMobilityBalance = ownLegalCaptures - opponentLegalCaptures
```

Be careful: a legal capture is not always good if it abandons a passer or opens a path for the opponent.

### 6.3 Quiet advancement mobility

Forward moves can create promotion threats.

Feature:

```js
quietAdvanceBalance = ownQuietAdvances - opponentQuietAdvances
```

This should interact with advancement and passed-pawn features.

### 6.4 Blocked pawns

A pawn is blocked if the square directly in front is occupied.

Features:

```js
ownBlockedPawns
opponentBlockedPawns
blockedPawnBalance = opponentBlockedPawns - ownBlockedPawns
```

Blocked pawns are bad if they cannot capture or support another pawn. They may be useful if they create a stable blockade.

### 6.5 Permanently blocked pawns

A pawn is more severely blocked if:

- the forward square is occupied;
- it has no legal captures;
- the blocking piece cannot be removed soon;
- it does not defend an important friendly pawn.

Feature:

```js
ownFrozenPawns
opponentFrozenPawns
frozenPawnBalance = opponentFrozenPawns - ownFrozenPawns
```

### 6.6 Blockade strength

A blockade can be good if one pawn stops an opponent’s dangerous passer.

Feature idea:

```js
ownEffectiveBlockades
opponentEffectiveBlockades
blockadeBalance
```

A blockade is effective if:

- it stops an opponent passed pawn;
- the blockading pawn is defended;
- the opponent cannot capture it without losing material or allowing a counter-promotion.

### 6.7 Space advantage

Space can be approximated by controlled squares in the opponent’s half.

Features:

```js
ownControlledSquaresInOpponentHalf
opponentControlledSquaresInOwnHalf
spaceBalance
```

Pawn attacks define controlled squares. Space matters because it restricts enemy movement and supports promotion.

---

## 7. Tactical factors

### 7.1 En prise pawns

A pawn is en prise if it can be captured by the opponent on the next move.

Features:

```js
ownEnPrisePawns
opponentEnPrisePawns
enPriseBalance = opponentEnPrisePawns - ownEnPrisePawns
```

Improve this by checking whether the pawn is defended.

### 7.2 Free captures

A free capture is a capture that wins a pawn without allowing immediate recapture or worse.

Approximation:

```js
freeCaptureCount = legalCaptures.filter(capture => !isRecapturableAfter(capture)).length
```

Feature:

```js
ownFreeCaptures - opponentFreeCaptures
```

This can be calculated using a shallow one-ply simulation.

### 7.3 Bad captures

Some captures are legal but strategically bad. For example:

- capture opens a path for opponent promotion;
- capture abandons a protected passer;
- capture moves away from promotion;
- capture breaks a strong chain;
- capture creates doubled or isolated pawns.

Possible feature during move ordering:

```js
moveCreatesOpponentPassedPawn
moveBreaksOwnChain
moveAbandonsBlockade
```

### 7.4 Breakthrough pattern

A breakthrough is a pawn sacrifice or advance that creates an unstoppable passed pawn.

In pawn-only games this is one of the most important tactical motifs.

Feature approaches:

1. Pattern-based detection: recognize common pawn formations where a sacrifice opens a path.
2. Search-based detection: shallow lookahead to see whether any move creates a passed pawn or forced promotion.
3. Tablebase-based detection: label positions where a sacrifice is the only winning move.

Feature examples:

```js
ownBreakthroughAvailable
opponentBreakthroughAvailable
breakthroughBalance
```

Advanced:

```js
ownForcedBreakthroughIn2
opponentForcedBreakthroughIn2
```

### 7.5 Multiple threats

A position is strong if one move creates two promotion threats or two captures.

Feature:

```js
ownDoubleThreats
opponentDoubleThreats
doubleThreatBalance
```

Implementation:

After each legal move, count opponent’s inability to stop all next-move threats.

### 7.6 Fork-like pawn attacks

A pawn move can attack two enemy pawns at once. In pawn-only games this can win material or force structure collapse.

Feature:

```js
ownPawnForkThreats
opponentPawnForkThreats
```

### 7.7 Capture race advantage

When both sides can capture, evaluate whether the sequence favors one side.

Approximation:

```js
staticExchangeEvalForPawnCapture(move)
```

This is a pawn-only version of static exchange evaluation.

---

## 8. Race and promotion factors

### 8.1 Promotion race score

When both sides have advanced pawns, the key question is: who promotes first?

Feature:

```js
raceBalance = opponentMinDistanceToPromotion - ownMinDistanceToPromotion
```

But this is not enough because side to move matters.

Refined version:

```js
ownTempoToPromotion = distanceToPromotion(ownBestPawn) - (sideToMove === ownSide ? 1 : 0)
opponentTempoToPromotion = distanceToPromotion(opponentBestPawn) - (sideToMove === opponentSide ? 1 : 0)
raceBalance = opponentTempoToPromotion - ownTempoToPromotion
```

### 8.2 Unstoppable passer

An unstoppable passer is a pawn that cannot be blocked, captured, or outraced.

Approximate conditions:

- pawn is passed;
- path to promotion is clear;
- no enemy pawn can enter its path in time;
- no enemy pawn can promote first;
- opponent has no forcing capture.

Feature:

```js
ownUnstoppablePassers
opponentUnstoppablePassers
```

This should have a huge weight.

### 8.3 Promotion square control

Even if promotion is not immediate, controlling key squares near promotion matters.

Features:

```js
ownControlsPromotionPathSquares
opponentControlsPromotionPathSquares
promotionPathControlBalance
```

For each pawn, inspect:

- the square in front;
- the promotion square;
- diagonals where enemy captures could occur;
- friendly support squares.

### 8.4 Queening path clearance

A pawn may be advanced but blocked. Score whether its path is clear.

Feature:

```js
ownClearPromotionPaths
opponentClearPromotionPaths
clearPathBalance
```

Weighted by distance to promotion.

### 8.5 Race with capture detours

Sometimes a pawn can promote faster by capturing diagonally, not by moving straight.

Advanced feature:

```js
minPromotionDistanceConsideringCaptures(pawn)
```

This requires graph search over legal pawn moves, ignoring or approximating opponent replies.

---

## 9. Majority, minority, and file-group factors

### 9.1 File majority

A majority means more pawns than the opponent in a region of the board. In pawn endgames, a majority can often create a passed pawn.

Features:

```js
ownLeftWingMajority
ownCenterMajority
ownRightWingMajority
opponentLeftWingMajority
...
```

For arbitrary board width, define file groups:

```js
left = files[0..floor(width/3)]
center = files[floor(width/3)..ceil(2*width/3)]
right = files[ceil(2*width/3)..width-1]
```

### 9.2 Local majority score

Instead of coarse wings, evaluate each file neighborhood:

```js
for each file f:
  ownLocal = own pawns on files f-1, f, f+1
  oppLocal = opponent pawns on files f-1, f, f+1
  localMajority += ownLocal - oppLocal
```

This can detect where a breakthrough is plausible.

### 9.3 Healthy majority

A majority is stronger when pawns are connected, mobile, and not doubled.

Feature:

```js
healthyMajorityScore = majorityCount + connectedBonus + mobilityBonus - doubledPenalty - blockedPenalty
```

### 9.4 Minority attack equivalent

In normal chess, a minority attack uses fewer pawns to provoke weaknesses in a larger pawn group. In Pawn Battles, this can translate into sacrificing or advancing a smaller group to create isolated, doubled, or blocked enemy pawns.

Advanced feature:

```js
ownCanDamageOpponentMajority
opponentCanDamageOwnMajority
```

This likely requires move simulation.

---

## 10. Tempo and zugzwang factors

### 10.1 Side-to-move tempo

In promotion races, side to move can be decisive.

Feature:

```js
tempoBonus = sideToMove === evaluatedSide ? 1 : -1
```

But a generic tempo bonus may be dangerous. It should be activated mostly in race-like positions.

### 10.2 Waiting move availability

Pawn-only games often have no true waiting moves, but some moves preserve structure better than others.

Feature:

```js
safeNonCommittalMoves
```

A safe noncommittal move:

- does not lose material;
- does not allow promotion;
- does not break a chain;
- does not abandon a blockade.

### 10.3 Zugzwang vulnerability

A side is vulnerable to zugzwang if every legal move worsens its position.

Approximation:

```js
zugzwangRisk = legalMoves.every(move => staticEval(after(move)) < currentEval - threshold)
```

This is search-aware and may be expensive, but it can be tested at shallow depth.

### 10.4 Only legal move positions

If the opponent has only one legal move, search can exploit it.

Feature:

```js
opponentLegalMoves === 1 ? bonus : 0
```

If we have only one legal move, apply a penalty unless it is winning.

### 10.5 Move exhaustion

In some pawn-only positions, the side with fewer safe moves loses because it must break its structure first.

Feature:

```js
safeMoveBalance = ownSafeMoves - opponentSafeMoves
```

This is stronger than raw mobility.

---

## 11. Board-control factors

### 11.1 Controlled squares

Pawns control diagonally forward squares.

Features:

```js
ownControlledSquares
opponentControlledSquares
controlBalance
```

A controlled square matters more if it is:

- in the opponent half;
- on a promotion path;
- occupied by an enemy pawn;
- a key square in front of a passed pawn.

### 11.2 Contested squares

A square is contested if both sides attack it.

Feature:

```js
contestedCriticalSquares
```

This can help evaluate whether a pawn advance is safe.

### 11.3 Safe advance squares

A pawn has a safe advance if it can move forward without becoming immediately capturable or blocked.

Feature:

```js
ownSafeAdvances
opponentSafeAdvances
safeAdvanceBalance
```

### 11.4 Unsafe advance penalty

A pawn move is unsafe if after advancing it can be captured and the capture cannot be recaptured.

Feature for move evaluation:

```js
moveCreatesLooseAdvancedPawn
```

### 11.5 Critical promotion corridor

For each pawn, define the corridor of files and ranks relevant to its promotion path: same file and adjacent files ahead.

Feature:

```js
ownCorridorDominance
opponentCorridorDominance
```

Corridor dominance includes:

- friendly attacks in corridor;
- enemy attacks in corridor;
- blockers;
- friendly support.

---

## 12. Search-related improvements

### 12.1 Move ordering

Alpha-beta pruning benefits greatly from good move ordering.

Suggested move priority:

1. immediate winning promotions;
2. moves that stop opponent immediate promotion;
3. captures of advanced passed pawns;
4. moves creating passed pawns;
5. breakthrough sacrifices;
6. protected pawn advances;
7. ordinary captures;
8. ordinary advances;
9. moves that create weaknesses.

Move-ordering features can use the same feature extractor but evaluated cheaply per move.

### 12.2 Quiescence-like extension

Pawn-only games still have tactical instability. Consider extending search in positions with:

- immediate promotion threats;
- forced captures;
- breakthrough threats;
- mutually attacking advanced pawns.

Example:

```js
if (hasImmediatePromotionThreat(board) || hasForcedCaptureSequence(board)) {
  extendDepthByOne();
}
```

### 12.3 Singular move extension

If only one move avoids immediate loss, extend that line.

```js
if (numberOfNonLosingMoves(board) === 1) extendDepthByOne();
```

### 12.4 Transposition table

Pawn-only games may have fewer transpositions than full chess because pawns move irreversibly, but captures and move orders can still transpose in some variants.

Add a transposition table keyed by:

```js
boardHash + sideToMove + depth
```

Store:

```js
{
  score,
  depth,
  boundType,
  bestMove
}
```

### 12.5 Pawn-structure cache

Because evaluation is dominated by pawn structure, cache extracted features by board hash.

```js
featureCache[boardHash] = extractFeatures(board)
```

This can speed up experiments with many weight vectors.

---

## 13. Tablebase and oracle supervision

### 13.1 Exact solver for smaller boards

For small board sizes, solve the entire game tree exactly.

For every position, compute:

```js
outcome: win | draw | loss
DTW: distance to win
DTL: distance to loss
bestMoves: [...]
```

This creates an oracle dataset.

### 13.2 Training labels from minimax

For each position:

```js
labelValue = +1 for win, 0 for draw, -1 for loss
labelDistance = distanceToTerminal
bestMove = minimaxBestMove
```

Use this to:

- evaluate handcrafted features;
- tune weights;
- train a linear model;
- train a small neural model;
- discover which factors predict optimal play.

### 13.3 Minimax regret

From the Hexapawn literature, minimax regret is a useful performance measure.

For each game:

```js
regret = minimaxOptimalOutcomeFromInitialPosition - actualOutcome
```

For a sequence of games:

```js
cumulativeMinimaxRegret = sum(regret_i)
```

This is useful when testing learning strategies or heuristic strategies on positions where the exact minimax outcome is known.

### 13.4 Position-level regret

For each move from a known position:

```js
moveRegret = optimalChildValue - chosenChildValue
```

This gives a more sensitive measure than win rate.

A strategy that loses rarely but frequently chooses suboptimal moves can be detected earlier.

---

## 14. Weight search and experiments

### 14.1 Start with small interpretable bundles

Do not tune 40 factors at once. Start with bundles:

#### Bundle 1 — Basic

```js
materialBalance
advancementBalance
mobilityBalance
```

#### Bundle 2 — Promotion

```js
minDistanceToPromotionBalance
immediatePromotionThreatBalance
passedPawnBalance
```

#### Bundle 3 — Structure

```js
connectedPawnBalance
protectedPawnBalance
isolatedPawnBalance
blockedPawnBalance
```

#### Bundle 4 — Tactical

```js
freeCaptureBalance
breakthroughAvailable
opponentPromotionThreatPenalty
```

#### Bundle 5 — Race

```js
promotionRaceBalance
unstoppablePasserBalance
clearPromotionPathBalance
```

Then combine bundles incrementally.

### 14.2 Ablation tests

For every candidate feature:

1. run strategy with feature;
2. run same strategy without feature;
3. compare against baseline and current best;
4. switch sides;
5. use enough rounds for statistical significance;
6. record confidence intervals.

A feature is valuable if it improves:

- win rate;
- regret;
- performance as both colors;
- robustness across board sizes or starting positions.

### 14.3 Weight-search methods

Possible approaches:

#### Grid search

Useful for small sets of factors.

#### Random search

Often better than grid search when many weights exist.

#### Coordinate descent

Tune one weight at a time while holding others fixed.

#### Evolutionary search

Keep top-performing weight vectors, mutate them, repeat.

#### Bayesian optimization

Useful if tournament evaluation is expensive.

#### Self-play Elo optimization

Treat each weight vector as an agent and estimate ratings.

### 14.4 Avoid overfitting to the baseline

Because the baseline is a black box, there is a risk of overfitting to its weaknesses.

Test against:

- baseline;
- older versions of your own strategy;
- random legal player;
- greedy material player;
- greedy promotion player;
- exact minimax oracle on small boards;
- self-play opponents with different weights;
- deliberately defensive and aggressive strategies.

---

## 15. Suggested feature schema

A useful feature object might look like this:

```js
const features = {
  // terminal
  terminalWin: 0,
  terminalLoss: 0,

  // material
  materialBalance: 0,

  // advancement and promotion
  advancementBalance: 0,
  maxAdvancementBalance: 0,
  minPromotionDistanceBalance: 0,
  immediatePromotionThreatBalance: 0,
  twoPlyPromotionThreatBalance: 0,

  // passers
  passedPawnBalance: 0,
  passedPawnAdvancementBalance: 0,
  protectedPassedPawnBalance: 0,
  connectedPassedPawnBalance: 0,
  candidatePasserBalance: 0,
  unstoppablePasserBalance: 0,

  // structure
  defendedPawnBalance: 0,
  loosePawnBalance: 0,
  connectedPawnBalance: 0,
  phalanxBalance: 0,
  pawnChainBalance: 0,
  weakChainBaseBalance: 0,
  isolatedPawnBalance: 0,
  doubledPawnBalance: 0,
  backwardPawnBalance: 0,
  pawnIslandBalance: 0,

  // mobility and blockade
  mobilityBalance: 0,
  captureMobilityBalance: 0,
  quietAdvanceBalance: 0,
  blockedPawnBalance: 0,
  frozenPawnBalance: 0,
  effectiveBlockadeBalance: 0,
  safeMoveBalance: 0,

  // tactics
  enPriseBalance: 0,
  freeCaptureBalance: 0,
  breakthroughBalance: 0,
  doubleThreatBalance: 0,
  pawnForkThreatBalance: 0,

  // control and space
  controlledSquareBalance: 0,
  opponentHalfControlBalance: 0,
  promotionCorridorBalance: 0,
  safeAdvanceBalance: 0,

  // race and tempo
  promotionRaceBalance: 0,
  tempoAdjustedRaceBalance: 0,
  zugzwangRiskBalance: 0,
  onlyMovePressureBalance: 0
};
```

---

## 16. Suggested first implementation order

### Phase 1 — clean baseline evaluation

Implement:

1. terminal win/loss;
2. material balance;
3. advancement balance;
4. min distance to promotion;
5. immediate promotion threat;
6. legal move count;
7. blocked pawn count.

Goal:

- get a transparent evaluation;
- verify sign conventions;
- beat random and simple greedy players;
- establish stable tournament harness.

### Phase 2 — passed-pawn engine

Implement:

1. passed pawns;
2. passed pawn advancement;
3. protected passed pawns;
4. connected passed pawns;
5. clear promotion path;
6. opponent passer penalty.

Goal:

- improve conversion of promotion advantages;
- prevent losing to opponent passers;
- compare strongly against black-box baseline.

### Phase 3 — structure engine

Implement:

1. defended pawns;
2. connected pawns;
3. pawn chains;
4. phalanxes;
5. isolated pawns;
6. doubled pawns;
7. pawn islands.

Goal:

- improve non-tactical middlegame decisions;
- prefer robust long-term structures.

### Phase 4 — tactics and race engine

Implement:

1. free captures;
2. breakthrough detection;
3. promotion race evaluation;
4. unstoppable passer detection;
5. double threats;
6. only-move and zugzwang approximations.

Goal:

- find tactical wins;
- avoid horizon-effect losses;
- improve shallow-search performance.

### Phase 5 — oracle and learning

Implement:

1. exact solver for small boards;
2. tablebase generation;
3. minimax labels;
4. move-regret measurement;
5. supervised weight fitting;
6. self-play training or evolutionary search.

Goal:

- move from handcrafted feature guessing to data-guided evaluation;
- detect which features actually predict optimal play.

---

## 17. Concrete experiments

### Experiment 1 — baseline feature ladder

Compare:

```text
A0: material only
A1: material + advancement
A2: A1 + mobility
A3: A2 + immediate promotion threat
A4: A3 + passed pawns
A5: A4 + protected/connected passers
```

Run each against:

- black-box baseline;
- random;
- greedy promotion;
- previous version.

### Experiment 2 — passed-pawn valuation curve

Test different distance-to-promotion weights:

```js
linear:      [1, 2, 3, 4, 5]
quadratic:   [1, 4, 9, 16, 25]
exponential: [1, 2, 4, 8, 16]
tactical:    [1, 3, 10, 30, 100]
```

Goal:

- find whether the game rewards slow structure or immediate promotion pressure.

### Experiment 3 — structure vs tactics

Compare:

```text
Strategy S: strong structure factors, weak tactical factors
Strategy T: weak structure factors, strong tactical/race factors
Strategy H: hybrid
```

Goal:

- understand whether Pawn Battles is mostly positional or mostly tactical under your board/rule settings.

### Experiment 4 — anti-baseline robustness

Tune one strategy only against the black-box baseline. Tune another strategy against a pool of opponents.

Then cross-test:

- baseline-tuned strategy vs opponent pool;
- pool-tuned strategy vs baseline;
- both against exact oracle positions if available.

Goal:

- detect overfitting to the black box.

### Experiment 5 — minimax-regret benchmark

For small boards:

1. solve all reachable positions;
2. sample positions;
3. let each strategy choose a move;
4. calculate move regret.

Metrics:

```text
average move regret
median move regret
% optimal moves
% blunders
regret by game phase
regret by feature pattern
```

This gives a much more detailed view than win rate alone.

---

## 18. Evaluation metrics

Use multiple metrics, not only win rate.

### Match-level metrics

```text
win rate
loss rate
draw rate
score = win + 0.5 * draw
side-specific score
confidence interval
p-value / significance
Elo estimate
```

### Position-level metrics

```text
optimal move accuracy
average move regret
blunder rate
promotion-threat missed rate
forced-win conversion rate
forced-loss resistance
```

### Feature-level diagnostics

```text
feature contribution distribution
correlation with minimax value
correlation with win probability
ablation impact
weight stability across experiments
```

### Search-level metrics

```text
nodes searched
cutoff rate
branching factor
best-move stability by depth
time per move
transposition hit rate
feature-cache hit rate
```

---

## 19. LLM-assisted implementation plan

Since the final implementation may be done with help from an LLM, each feature should be specified in a precise format.

Recommended template:

```md
## Feature: protectedPassedPawnBalance

Definition:
A pawn is a protected passed pawn if it is passed and defended by another friendly pawn.

Inputs:
- board
- side
- board width
- board height

Output:
Number:
  ownProtectedPassedPawns - opponentProtectedPassedPawns

Helper functions needed:
- getPawns(board, side)
- isPassedPawn(board, pawn, side)
- isDefendedByFriendlyPawn(board, pawn, side)

Edge cases:
- pawn on promotion rank should be handled by terminal evaluation
- doubled pawns on same file should not both automatically count as passed

Tests:
- single protected passer should return +1
- unprotected passer should return 0
- opponent protected passer should return -1
```

This reduces ambiguity and makes generated code easier to validate.

---

## 20. Example feature implementation specs

### Feature: `passedPawnBalance`

Definition:

A pawn is passed if there are no enemy pawns ahead of it on the same file or adjacent files.

Output:

```js
ownPassedPawnCount - opponentPassedPawnCount
```

Helper logic:

```js
function isPassedPawn(board, pawn, side) {
  const direction = side === WHITE ? -1 : +1;
  const enemy = opposite(side);

  for (const enemyPawn of getPawns(board, enemy)) {
    const sameOrAdjacentFile = Math.abs(enemyPawn.file - pawn.file) <= 1;
    const enemyAhead = direction === -1
      ? enemyPawn.rank < pawn.rank
      : enemyPawn.rank > pawn.rank;

    if (sameOrAdjacentFile && enemyAhead) return false;
  }
  return true;
}
```

Tests:

- no enemy pawns ahead: passed;
- enemy pawn same file ahead: not passed;
- enemy pawn adjacent file ahead: not passed;
- enemy pawn behind: still passed.

### Feature: `connectedPassedPawnBalance`

Definition:

Two passed pawns are connected if they are on adjacent files.

Output:

```js
ownConnectedPassedPairs - opponentConnectedPassedPairs
```

Optional nonlinear version:

```js
sumConnectedPassedGroupScore(own) - sumConnectedPassedGroupScore(opponent)
```

where:

```js
groupScore = groupSize ** 2 * averageAdvancementMultiplier
```

### Feature: `promotionRaceBalance`

Definition:

Compares the fastest plausible promotion for both sides.

Output:

```js
opponentTempoAdjustedDistance - ownTempoAdjustedDistance
```

If positive, our side is closer to promotion.

Edge cases:

- ignore blocked pawns or assign huge distance;
- separately handle immediate promotion;
- account for side to move.

### Feature: `breakthroughBalance`

Definition:

A breakthrough exists if there is a legal move that creates a passed pawn or forced promotion threat that the opponent cannot stop with one reply.

Approximate algorithm:

```js
for each legal move:
  next = applyMove(board, move)
  if createsPassedPawn(next, side) or createsImmediatePromotionThreat(next, side):
    if opponentCannotNeutralize(next):
      return 1
return 0
```

Output:

```js
ownBreakthroughAvailable - opponentBreakthroughAvailable
```

### Feature: `effectiveBlockadeBalance`

Definition:

A blockade is effective if a pawn blocks an opponent passed pawn and is not easily removed.

Output:

```js
ownEffectiveBlockades - opponentEffectiveBlockades
```

Implementation idea:

1. find opponent passed pawns;
2. inspect the square directly in front of each passer;
3. if occupied by own pawn, check whether own pawn is defended;
4. check whether opponent can capture or bypass;
5. score stable blockades.

---

## 21. Important design warnings

### 21.1 Do not overvalue material

In pawn-only games, promotion threats can dominate material. A side may sacrifice one or two pawns to create an unstoppable passer.

### 21.2 Do not overvalue advancement blindly

An advanced pawn can be weak if:

- it is isolated;
- it is blockaded;
- it can be captured;
- it opens an enemy passer.

### 21.3 Do not over-penalize structural weaknesses

In normal chess, isolated or doubled pawns are often weaknesses. In Pawn Battles, they may be acceptable if they create tempo, blockades, or promotion threats.

### 21.4 Search may make some features redundant

With deep enough minimax, immediate tactics are visible. But features still help:

- shallow search;
- move ordering;
- horizon-effect mitigation;
- evaluation at leaf nodes;
- weight learning.

### 21.5 Always test side bias

Because pawns move in opposite directions, bugs in feature extraction often create color bias. Every tournament should switch sides.

---

## 22. Definition of “best algorithm”

The best algorithm should not be defined only as “beats the current baseline.” A stronger definition:

A strategy is better if it:

1. beats the black-box baseline with statistical significance;
2. performs well as both sides;
3. beats a diverse pool of opponents;
4. has low minimax regret on solved small boards;
5. converts winning positions reliably;
6. resists losing positions as long as possible;
7. is stable across board sizes and initial setups;
8. does not rely on baseline-specific exploits;
9. remains explainable enough to debug;
10. is fast enough for the target UI or gameplay setting.

---

## 23. Final recommended roadmap

1. Build a transparent feature extractor with debug breakdown.
2. Implement Level A factors.
3. Run a ladder of simple strategies.
4. Add passed-pawn and promotion-race factors.
5. Add structural factors.
6. Add tactical breakthrough and blockade detection.
7. Build exact tablebases for small boards.
8. Use minimax labels and regret to validate evaluation quality.
9. Tune weights against a diverse opponent pool.
10. Keep a champion-vs-candidate tournament pipeline.
11. Use ablations to remove features that do not help.
12. Consider learned evaluation only after the handcrafted feature system is measurable and reliable.

The likely strongest practical path is not a single clever feature. It is a loop:

```text
new factor idea
→ precise implementation
→ unit tests
→ tournament comparison
→ ablation
→ regret analysis
→ weight retuning
→ champion update
```

Pawn Battles are small enough to support rigorous experiments, but rich enough that human-inspired pawn strategy can matter. The strongest engine will probably combine:

- minimax + alpha-beta;
- excellent move ordering;
- passed-pawn and promotion-race evaluation;
- breakthrough detection;
- tablebase/oracle validation;
- systematic weight optimization;
- robustness testing against many opponent types.
