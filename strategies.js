// strategies.js
// Evaluation functions and strategy definitions for Pawn Wars AI

// --- Game end check ---

function checkGameEnd(isFinishedResult, path) {
    if (!isFinishedResult) {
        return null;
    }

    let score = 0;
    if (isFinishedResult.includes('w')) {
        score = +100000;
        if (path) {
            score += 100 - path.length;
        }
        return score;
    }
    if (isFinishedResult.includes('b')) {
        score = -100000;
        if (path) {
            score -= 100 - path.length;
        }
        return score;
    }

    return null;
}

// --- Factor functions (building blocks for strategies) ---

function evaluatePawnAdvancement(color) {
    let score = 0;
    const promotionRow = color === 'w' ? 7 : 0;
    getPawns(color).forEach(pawn => {
        const distance = Math.abs(pawn.row - promotionRow);
        // intentional fall-through: bonuses are cumulative
        switch (distance) {
            case 0: score += 10000;
            case 1: score += 1000;
            case 2: score += 100;
            default: score += (7 - distance) * 10;
        }
    });
    return score;
}

function evaluatePawnCount(color) {
    return getPawns(color).length * 50;
}

function evaluateCaptureOpportunities(color) {
    let score = 0;
    const enemyColor = color === 'w' ? 'b' : 'w';
    const forward = color === 'w' ? 1 : -1;

    getPawns(color).forEach(pawn => {
        const captureCols = [pawn.col - 1, pawn.col + 1];

        captureCols.forEach(cc => {
            if (cc < 0 || cc >= 8) return;

            const targetRow = pawn.row + forward;
            if (targetRow < 0 || targetRow >= 8) return;

            const target = game.board()[7 - targetRow][cc];
            if (target && target.color === enemyColor) {
                const attackers = [cc - 1, cc + 1].filter(dc =>
                    dc >= 0 && dc <= 7 && game.board()[7 - pawn.row][dc]?.color === color
                ).length;

                const defenders = [cc - 1, cc + 1].filter(dc =>
                    dc >= 0 && dc <= 7 && game.board()[7 - (targetRow + forward)]?.[dc]?.color === enemyColor
                ).length;

                if (attackers === 1 && defenders === 0) {
                    score += 80;
                } else if (attackers === defenders) {
                    score += 20;
                } else {
                    score += (attackers - defenders) * 40;
                }
            }
        });
    });

    return score;
}

function evaluateFreePath(color) {
    let score = 0;
    const enemyColor = color === 'w' ? 'b' : 'w';
    const forward = color === 'w' ? 1 : -1;
    const promotionRow = color === 'w' ? 7 : 0;

    getPawns(color).forEach(pawn => {
        let isRowFree = true;
        for (let r = pawn.row + forward; r !== promotionRow + forward; r += forward) {
            if (r < 0 || r > 7) break;
            if (game.board()[7 - r][pawn.col]) {
                isRowFree = false;
                break;
            }
        }

        if (isRowFree) {
            let isFullPathFree = true;
            for (let c = Math.max(pawn.col - 1, 0); c <= Math.min(pawn.col + 1, 7); ++c) {
                for (let r = pawn.row + forward; r !== promotionRow + forward; r += forward) {
                    if (r < 0 || r > 7) break;
                    if (game.board()[7 - r][c] && game.board()[7 - r][c].color === enemyColor) {
                        isFullPathFree = false;
                        break;
                    }
                }
            }
            if (isFullPathFree) {
                score += 100;
            }
        }
    });

    return score;
}

function getMajorityRowsScore(firstPawn, secondPawn, opponentPawn) {
    const myColor = firstPawn.color;
    const targetRow = { 'w': 7, 'b': 0 };

    const firstDistance = Math.abs(targetRow[myColor] - firstPawn.row);
    const secondDistance = Math.abs(targetRow[myColor] - secondPawn.row);
    const distance = Math.ceil((firstDistance + secondDistance) / 2);

    switch (distance) {
        case 0: return Infinity;
        case 1: return 1000;
        case 2: return 500;
        case 3: return 200;
        case 4: return 100;
        case 5: return 50;
    }

    return 0;
}

function evaluateMajority(color) {
    const myPawns = getPawns(color);
    const opponentColor = color === 'w' ? 'b' : 'w';
    const opponentPawns = getPawns(opponentColor);

    let totalScore = 0;

    const myPawnsByCol = {};
    myPawns.forEach(pawn => {
        if (!myPawnsByCol[pawn.col]) {
            myPawnsByCol[pawn.col] = [];
        }
        myPawnsByCol[pawn.col].push(pawn);
    });

    const columnsWithMyPawns = Object.keys(myPawnsByCol).map(Number).sort((a, b) => a - b);

    for (let i = 0; i < columnsWithMyPawns.length - 1; i++) {
        const col1 = columnsWithMyPawns[i];
        const col2 = columnsWithMyPawns[i + 1];

        if (col2 - col1 !== 1) continue;

        const myPawnsInArea = [...myPawnsByCol[col1], ...myPawnsByCol[col2]];
        if (myPawnsInArea.length < 2) continue;

        const sortedMyPawns = [...myPawnsInArea].sort((a, b) => {
            return color === 'w' ? b.row - a.row : a.row - b.row;
        });

        const firstPawn = sortedMyPawns[0];
        const secondPawn = sortedMyPawns[1];

        const mostAdvancedRow = color === 'w'
            ? Math.max(firstPawn.row, secondPawn.row)
            : Math.min(firstPawn.row, secondPawn.row);

        const relevantOpponentCols = [col1 - 1, col1, col2, col2 + 1].filter(col => col >= 0 && col <= 7);

        const opponentPawnsAhead = opponentPawns.filter(pawn => {
            if (!relevantOpponentCols.includes(pawn.col)) return false;
            return color === 'w' ? pawn.row > mostAdvancedRow : pawn.row < mostAdvancedRow;
        });

        if (opponentPawnsAhead.length === 1) {
            totalScore += getMajorityRowsScore(firstPawn, secondPawn, opponentPawnsAhead[0]);
        }
    }

    return totalScore;
}

// --- Decomposed baseline factors (individual components of evaluateBoardMedium) ---
// Each returns raw value per color; multiply by original weight to reconstruct baseline.
// Original formula: adv*2 + freePath*0.7 + adjThreat*(-0.8) + center*0.2 + nextMove*2

function evaluateMediumAdvancement(color) {
    var score = 0;
    var board = game.board();
    for (var col = 0; col < 8; col++) {
        for (var row = 0; row < 8; row++) {
            var piece = board[row][col];
            if (piece && piece.type === 'p' && piece.color === color) {
                var promotionDistance = piece.color === 'b' ? 7 - row : row;
                score += (8 - promotionDistance);
            }
        }
    }
    return score;
}

function evaluateMediumFreePath(color) {
    var score = 0;
    var board = game.board();
    for (var col = 0; col < 8; col++) {
        for (var row = 0; row < 8; row++) {
            var piece = board[row][col];
            if (piece && piece.type === 'p' && piece.color === color) {
                var isPathBlocked = false;
                if (piece.color === 'b') {
                    for (var r = row + 1; r < 8; r++) {
                        if (board[r][col]) { isPathBlocked = true; break; }
                    }
                } else {
                    for (var r = row - 1; r >= 0; r--) {
                        if (board[r][col]) { isPathBlocked = true; break; }
                    }
                }
                if (!isPathBlocked) score += 1;
            }
        }
    }
    return score;
}

function evaluateMediumAdjacentThreat(color) {
    var count = 0;
    var board = game.board();
    var enemyColor = color === 'w' ? 'b' : 'w';
    for (var col = 0; col < 8; col++) {
        for (var row = 0; row < 8; row++) {
            var piece = board[row][col];
            if (piece && piece.type === 'p' && piece.color === color) {
                if (col > 0 && board[row][col - 1] && board[row][col - 1].color === enemyColor) count++;
                if (col < 7 && board[row][col + 1] && board[row][col + 1].color === enemyColor) count++;
            }
        }
    }
    return count;
}

function evaluateMediumCenterColumn(color) {
    var count = 0;
    var board = game.board();
    for (var col = 0; col < 8; col++) {
        for (var row = 0; row < 8; row++) {
            var piece = board[row][col];
            if (piece && piece.type === 'p' && piece.color === color) {
                if (col > 0 && col < 7) count++;
            }
        }
    }
    return count;
}

function evaluateMediumNextMoveSafety(color) {
    var count = 0;
    var board = game.board();
    for (var col = 0; col < 8; col++) {
        for (var row = 0; row < 8; row++) {
            var piece = board[row][col];
            if (piece && piece.type === 'p' && piece.color === color) {
                if (piece.color === 'b') {
                    if (row + 1 < 8 && !board[row + 1][col]) {
                        var willBeFree = 0;
                        if (col > 0 && row + 2 < 8 && board[row + 2][col - 1] && board[row + 2][col - 1].color === 'w') {
                        } else if (col < 7 && row + 2 < 8 && board[row + 2][col + 1] && board[row + 2][col + 1].color === 'w') {
                        } else { willBeFree = 1; }
                        count += willBeFree;
                    }
                } else {
                    if (row - 1 >= 0 && !board[row - 1][col]) {
                        var willBeFree = 0;
                        if (col > 0 && row - 2 >= 0 && board[row - 2][col - 1] && board[row - 2][col - 1].color === 'b') {
                        } else if (col < 7 && row - 2 >= 0 && board[row - 2][col + 1] && board[row - 2][col + 1].color === 'b') {
                        } else { willBeFree = 1; }
                        count += willBeFree;
                    }
                }
            }
        }
    }
    return count;
}

// --- Baseline evaluation (the best-performing algorithm) ---

function evaluateBoardMedium(path) {
    let score = 0;
    const board = game.board();

    const isFinishedResult = checkGameEnd(isFinished(), path);
    if (isFinishedResult !== null) {
        return isFinishedResult;
    }

    for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
            const piece = board[row][col];
            if (piece && piece.type === 'p') {
                let promotionDistance;
                if (piece.color === 'b') {
                    promotionDistance = 7 - row;
                } else {
                    promotionDistance = row;
                }

                let centerColumnBonus = 0;
                if (col > 0 && col < 7) {
                    centerColumnBonus = 0.2;
                }

                let nextMoveFree = 0;
                if (piece.color === 'b') {
                    if (row + 1 < 8 && !board[row + 1][col]) {
                        let willBeFreeScore = 0;
                        if (col > 0 && row + 2 < 8 && board[row + 2][col - 1] && board[row + 2][col - 1].color === 'w') {
                        } else if (col < 7 && row + 2 < 8 && board[row + 2][col + 1] && board[row + 2][col + 1].color === 'w') {
                        } else {
                            willBeFreeScore = 1;
                        }
                        nextMoveFree += willBeFreeScore;
                    }
                } else {
                    if (row - 1 >= 0 && !board[row - 1][col]) {
                        let willBeFreeScore = 0;
                        if (col > 0 && row - 2 >= 0 && board[row - 2][col - 1] && board[row - 2][col - 1].color === 'b') {
                        } else if (col < 7 && row - 2 >= 0 && board[row - 2][col + 1] && board[row - 2][col + 1].color === 'b') {
                        } else {
                            willBeFreeScore = 1;
                        }
                        nextMoveFree += willBeFreeScore;
                    }
                }

                let freePathBonus = 0;
                if (piece.color === 'b') {
                    let isPathBlocked = false;
                    for (let r = row + 1; r < 8; r++) {
                        if (board[r][col]) {
                            isPathBlocked = true;
                            break;
                        }
                    }
                    if (!isPathBlocked) {
                        freePathBonus += 0.7;
                    }
                } else {
                    let isPathBlocked = false;
                    for (let r = row - 1; r >= 0; r--) {
                        if (board[r][col]) {
                            isPathBlocked = true;
                            break;
                        }
                    }
                    if (!isPathBlocked) {
                        freePathBonus += 0.7;
                    }
                }

                let adjacentThreatPenalty = 0;
                if (piece.color === 'b') {
                    if (col > 0 && board[row][col - 1] && board[row][col - 1].color === 'w') {
                        adjacentThreatPenalty -= 0.8;
                    }
                    if (col < 7 && board[row][col + 1] && board[row][col + 1].color === 'w') {
                        adjacentThreatPenalty -= 0.8;
                    }
                } else {
                    if (col > 0 && board[row][col - 1] && board[row][col - 1].color === 'b') {
                        adjacentThreatPenalty -= 0.8;
                    }
                    if (col < 7 && board[row][col + 1] && board[row][col + 1].color === 'b') {
                        adjacentThreatPenalty -= 0.8;
                    }
                }

                let pieceScore =
                    (8 - promotionDistance) * 2 +
                    freePathBonus +
                    adjacentThreatPenalty +
                    centerColumnBonus +
                    nextMoveFree * 2;

                if (piece.color === 'b') {
                    score -= pieceScore;
                } else {
                    score += pieceScore;
                }
            }
        }
    }

    return score;
}

// --- Best V1 factor functions (found by CMA-ES, 2026-05-19) ---
// These must be in strategies.js (not factors.js) because the browser loads strategies.js

function evaluateBestV1PassedPawns(color) {
    var score = 0;
    var enemyColor = color === 'w' ? 'b' : 'w';
    var myPawns = getPawns(color);
    var enemyPawns = getPawns(enemyColor);
    var enemyByCol = {};
    enemyPawns.forEach(function(ep) {
        if (!enemyByCol[ep.col]) enemyByCol[ep.col] = [];
        enemyByCol[ep.col].push(ep.row);
    });
    myPawns.forEach(function(pawn) {
        var isPassed = true;
        for (var dc = -1; dc <= 1; dc++) {
            var checkCol = pawn.col + dc;
            if (checkCol < 0 || checkCol > 7) continue;
            var enemies = enemyByCol[checkCol];
            if (!enemies) continue;
            for (var i = 0; i < enemies.length; i++) {
                if (color === 'w' && enemies[i] > pawn.row) { isPassed = false; break; }
                if (color === 'b' && enemies[i] < pawn.row) { isPassed = false; break; }
            }
            if (!isPassed) break;
        }
        if (isPassed) {
            var distance = Math.abs(pawn.row - (color === 'w' ? 7 : 0));
            switch (distance) {
                case 0: score += 10000; break;
                case 1: score += 100; break;
                case 2: score += 30; break;
                case 3: score += 10; break;
                case 4: score += 4; break;
                default: score += 1; break;
            }
        }
    });
    return score;
}

function evaluateBestV1Mobility(color) {
    var count = 0;
    var board = game.board();
    var forward = color === 'w' ? -1 : 1;
    var startBoardRow = color === 'w' ? 6 : 1;
    var enemyColor = color === 'w' ? 'b' : 'w';
    getPawns(color).forEach(function(pawn) {
        var boardRow = 7 - pawn.row;
        var nextRow = boardRow + forward;
        if (nextRow < 0 || nextRow > 7) return;
        if (!board[nextRow][pawn.col]) {
            count++;
            var nextRow2 = nextRow + forward;
            if (boardRow === startBoardRow && nextRow2 >= 0 && nextRow2 < 8 && !board[nextRow2][pawn.col]) count++;
        }
        if (pawn.col > 0 && board[nextRow][pawn.col - 1] && board[nextRow][pawn.col - 1].color === enemyColor) count++;
        if (pawn.col < 7 && board[nextRow][pawn.col + 1] && board[nextRow][pawn.col + 1].color === enemyColor) count++;
    });
    return count;
}

function evaluateBestV1ThreatenedPawns(color) {
    var count = 0;
    var board = game.board();
    var enemyColor = color === 'w' ? 'b' : 'w';
    var enemyForward = enemyColor === 'w' ? -1 : 1;
    var attacked = {};
    getPawns(enemyColor).forEach(function(ep) {
        var attackRow = (7 - ep.row) + enemyForward;
        if (attackRow < 0 || attackRow > 7) return;
        if (ep.col > 0) attacked[attackRow + ',' + (ep.col - 1)] = true;
        if (ep.col < 7) attacked[attackRow + ',' + (ep.col + 1)] = true;
    });
    getPawns(color).forEach(function(pawn) {
        if (attacked[(7 - pawn.row) + ',' + pawn.col]) count++;
    });
    return count;
}

function evaluateBestV1IsolatedPawns(color) {
    var count = 0;
    var pawns = getPawns(color);
    var pawnFiles = {};
    pawns.forEach(function(p) { pawnFiles[p.col] = true; });
    pawns.forEach(function(pawn) {
        if (!pawnFiles[pawn.col - 1] && !pawnFiles[pawn.col + 1]) count++;
    });
    return count;
}

function evaluateBestV1PromotionRace(color) {
    var board = game.board();
    var enemyColor = color === 'w' ? 'b' : 'w';
    function bestDist(c) {
        var min = 99, fwd = c === 'w' ? -1 : 1;
        getPawns(c).forEach(function(p) {
            var br = 7 - p.row, clear = true;
            for (var r = br + fwd; r >= 0 && r < 8; r += fwd) { if (board[r][p.col]) { clear = false; break; } }
            if (clear) { var d = Math.abs(p.row - (c === 'w' ? 7 : 0)); if (d < min) min = d; }
        });
        return min;
    }
    var my = bestDist(color), opp = bestDist(enemyColor);
    if (my >= 99 && opp >= 99) return 0;
    if (my >= 99) return -10;
    if (opp >= 99) return 10;
    return opp - my;
}

function evaluateBestV1OpponentBlocked(color) {
    var count = 0;
    var board = game.board();
    var enemyColor = color === 'w' ? 'b' : 'w';
    var enemyForward = enemyColor === 'w' ? -1 : 1;
    getPawns(enemyColor).forEach(function(op) {
        var br = 7 - op.row, nr = br + enemyForward;
        if (nr < 0 || nr > 7) return;
        var bl = board[nr][op.col];
        if (bl && bl.type === 'p' && bl.color === color) count++;
    });
    return count;
}

function evaluateBestV1BlockedPawns(color) {
    var score = 0;
    var board = game.board();
    var forward = color === 'w' ? -1 : 1;
    var enemyColor = color === 'w' ? 'b' : 'w';
    getPawns(color).forEach(function(pawn) {
        var br = 7 - pawn.row, nr = br + forward;
        if (nr < 0 || nr > 7) return;
        if (board[nr][pawn.col]) {
            var hasCapture = false;
            if (pawn.col > 0 && board[nr][pawn.col - 1] && board[nr][pawn.col - 1].color === enemyColor) hasCapture = true;
            if (pawn.col < 7 && board[nr][pawn.col + 1] && board[nr][pawn.col + 1].color === enemyColor) hasCapture = true;
            score -= hasCapture ? 5 : 15;
        }
    });
    return score;
}

function evaluateBestV1ConnectedPawns(color) {
    var score = 0;
    var pawns = getPawns(color);
    var byCol = {};
    pawns.forEach(function(p) { if (!byCol[p.col]) byCol[p.col] = []; byCol[p.col].push(p); });
    var cols = Object.keys(byCol).map(Number).sort(function(a, b) { return a - b; });
    for (var i = 0; i < cols.length - 1; i++) { if (cols[i + 1] - cols[i] === 1) score += 10; }
    return score;
}

// --- Strategy definitions ---

var STRATEGIES = {
    random: {
        name: 'Random',
        depth: 1,
        evaluate: function() { return 0; },
    },
    medium: {
        name: 'Medium (baseline)',
        depth: 5,
        evaluate: evaluateBoardMedium,
    },
    mediumPlusMajority: {
        name: 'Medium + Majority',
        depth: 4,
        evaluate: function(path) {
            var base = evaluateBoardMedium(path);
            if (Math.abs(base) > 50000) return base;
            return base + 0.5 * (evaluateMajority('w') - evaluateMajority('b'));
        },
    },
    mediumPlusCaptures: {
        name: 'Medium + Captures',
        depth: 4,
        evaluate: function(path) {
            var base = evaluateBoardMedium(path);
            if (Math.abs(base) > 50000) return base;
            return base + 0.3 * (evaluateCaptureOpportunities('w') - evaluateCaptureOpportunities('b'));
        },
    },
    advancementOnly: {
        name: 'Advancement Only',
        depth: 4,
        evaluate: function(path) {
            var result = checkGameEnd(isFinished(), path);
            if (result !== null) return result;
            return evaluatePawnAdvancement('w') - evaluatePawnAdvancement('b');
        },
    },
    bestV1: {
        name: 'Best V1 (CMA-ES 2026-05-18)',
        depth: 5,
        // CMA-ES found weights: 83% win rate vs medium depth 5 on 500 games
        evaluate: function (path) {
            var terminal = checkGameEnd(isFinished(), path);
            if (terminal !== null) return terminal;
            var w = 'w', b = 'b';
            return 4.568 * (evaluateMediumAdvancement(w) - evaluateMediumAdvancement(b))
                + 2.126 * (evaluateMediumFreePath(w) - evaluateMediumFreePath(b))
                - 2.253 * (evaluateMediumAdjacentThreat(w) - evaluateMediumAdjacentThreat(b))
                + 1.202 * (evaluateMediumCenterColumn(w) - evaluateMediumCenterColumn(b))
                + 4.800 * (evaluateMediumNextMoveSafety(w) - evaluateMediumNextMoveSafety(b))
                + 5.000 * (evaluateBestV1PassedPawns(w) - evaluateBestV1PassedPawns(b))
                + 0.059 * (evaluateBestV1BlockedPawns(w) - evaluateBestV1BlockedPawns(b))
                + 0.890 * (evaluateBestV1Mobility(w) - evaluateBestV1Mobility(b))
                + 0.128 * (evaluateBestV1ConnectedPawns(w) - evaluateBestV1ConnectedPawns(b))
                + 0.316 * (evaluateBestV1OpponentBlocked(w) - evaluateBestV1OpponentBlocked(b))
                - 1.245 * (evaluateBestV1ThreatenedPawns(w) - evaluateBestV1ThreatenedPawns(b))
                - 2.714 * (evaluateBestV1IsolatedPawns(w) - evaluateBestV1IsolatedPawns(b))
                + 1.756 * (evaluateBestV1PromotionRace(w) - evaluateBestV1PromotionRace(b));
        },
    },
    bestV2: {
        name: 'Best V2 (CMA-ES 2026-05-19)',
        depth: 5,
        // CMA-ES found weights: 54.4% win rate vs bestV1, depth 5 on 500 games
        evaluate: function (path) {
            var terminal = checkGameEnd(isFinished(), path);
            if (terminal !== null) return terminal;
            var w = 'w', b = 'b';
            return 3.801 * (evaluateMediumAdvancement(w) - evaluateMediumAdvancement(b))
                + 1.889 * (evaluateMediumFreePath(w) - evaluateMediumFreePath(b))
                - 1.727 * (evaluateMediumAdjacentThreat(w) - evaluateMediumAdjacentThreat(b))
                + 0.808 * (evaluateMediumCenterColumn(w) - evaluateMediumCenterColumn(b))
                + 4.496 * (evaluateMediumNextMoveSafety(w) - evaluateMediumNextMoveSafety(b))
                + 3.61 * (evaluateBestV1PassedPawns(w) - evaluateBestV1PassedPawns(b))
                // + 0 * (evaluateBestV1BlockedPawns(w) - evaluateBestV1BlockedPawns(b))
                + 1.028 * (evaluateBestV1Mobility(w) - evaluateBestV1Mobility(b))
                + 0.06 * (evaluateBestV1ConnectedPawns(w) - evaluateBestV1ConnectedPawns(b))
                + 1.505 * (evaluateBestV1OpponentBlocked(w) - evaluateBestV1OpponentBlocked(b))
                - 1.708 * (evaluateBestV1ThreatenedPawns(w) - evaluateBestV1ThreatenedPawns(b))
                - 2.677 * (evaluateBestV1IsolatedPawns(w) - evaluateBestV1IsolatedPawns(b))
                + 0.051 * (evaluateBestV1PromotionRace(w) - evaluateBestV1PromotionRace(b));
        },
    },
    mediumDecomposed: {
        name: 'Medium Decomposed',
        depth: 5,
        evaluate: function(path) {
            var terminal = checkGameEnd(isFinished(), path);
            if (terminal !== null) return terminal;
            var w = 'w', b = 'b';
            return 2.0 * (evaluateMediumAdvancement(w) - evaluateMediumAdvancement(b))
                 + 0.7 * (evaluateMediumFreePath(w) - evaluateMediumFreePath(b))
                 - 0.8 * (evaluateMediumAdjacentThreat(w) - evaluateMediumAdjacentThreat(b))
                 + 0.2 * (evaluateMediumCenterColumn(w) - evaluateMediumCenterColumn(b))
                 + 2.0 * (evaluateMediumNextMoveSafety(w) - evaluateMediumNextMoveSafety(b));
        },
    },
};

function difficultyToStrategy(level) {
    if (level === 0) return STRATEGIES.random;
    if (level === 1) return { ...STRATEGIES.medium, depth: 3 };
    if (level === 2) return { ...STRATEGIES.medium, depth: 4 };
    if (level === 3) return STRATEGIES.medium;
    if (level === 4) return STRATEGIES.bestV1;
    return STRATEGIES.bestV1;
}

module.exports = {
    STRATEGIES,
    difficultyToStrategy,
    checkGameEnd,
    evaluateBoardMedium,
    evaluatePawnAdvancement,
    evaluatePawnCount,
    evaluateCaptureOpportunities,
    evaluateFreePath,
    evaluateMajority,
    getMajorityRowsScore,
    evaluateMediumAdvancement,
    evaluateMediumFreePath,
    evaluateMediumAdjacentThreat,
    evaluateMediumCenterColumn,
    evaluateMediumNextMoveSafety,
};
