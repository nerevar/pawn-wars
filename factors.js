// factors.js — Factor registry + evaluation functions for weight search
// All factor functions: (color) => score (higher = better for that color)
// Used by parametric_strategy.js to compose strategies
//
// Decomposed baseline factors (evaluateMedium*) are defined in strategies.js
// and available via globalThis. They are referenced in the FACTORS registry below.

// ============================================================
// New factors
// ============================================================

function evaluatePassedPawns(color) {
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
                var enemyRow = enemies[i];
                if (color === 'w' && enemyRow > pawn.row) { isPassed = false; break; }
                if (color === 'b' && enemyRow < pawn.row) { isPassed = false; break; }
            }
            if (!isPassed) break;
        }
        if (isPassed) {
            var promotionRow = color === 'w' ? 7 : 0;
            var distance = Math.abs(pawn.row - promotionRow);
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

function evaluateBlockedPawns(color) {
    var score = 0;
    var board = game.board();
    var forward = color === 'w' ? -1 : 1;

    getPawns(color).forEach(function(pawn) {
        var boardRow = 7 - pawn.row;
        var nextRow = boardRow + forward;
        if (nextRow < 0 || nextRow > 7) return;
        if (board[nextRow][pawn.col]) {
            var hasCapture = false;
            var enemyColor = color === 'w' ? 'b' : 'w';
            if (pawn.col > 0 && board[nextRow][pawn.col - 1] &&
                board[nextRow][pawn.col - 1].color === enemyColor) {
                hasCapture = true;
            }
            if (pawn.col < 7 && board[nextRow][pawn.col + 1] &&
                board[nextRow][pawn.col + 1].color === enemyColor) {
                hasCapture = true;
            }
            if (hasCapture) {
                score -= 5;
            } else {
                score -= 15;
            }
        }
    });
    return score;
}

// Full mobility: counts all legal pawn moves (forward 1, forward 2, captures)
// without using getMoves() (which depends on game.turn())
function evaluateMobility(color) {
    var count = 0;
    var board = game.board();
    var forward = color === 'w' ? -1 : 1;
    var startBoardRow = color === 'w' ? 6 : 1; // board[] row for starting rank
    var enemyColor = color === 'w' ? 'b' : 'w';

    getPawns(color).forEach(function(pawn) {
        var boardRow = 7 - pawn.row;
        var nextRow = boardRow + forward;
        if (nextRow < 0 || nextRow > 7) return;

        // Forward 1
        if (!board[nextRow][pawn.col]) {
            count++;
            // Forward 2 (only from starting rank)
            var nextRow2 = nextRow + forward;
            if (boardRow === startBoardRow && nextRow2 >= 0 && nextRow2 < 8 && !board[nextRow2][pawn.col]) {
                count++;
            }
        }
        // Capture left
        if (pawn.col > 0 && board[nextRow][pawn.col - 1] &&
            board[nextRow][pawn.col - 1].color === enemyColor) {
            count++;
        }
        // Capture right
        if (pawn.col < 7 && board[nextRow][pawn.col + 1] &&
            board[nextRow][pawn.col + 1].color === enemyColor) {
            count++;
        }
    });
    return count;
}

function evaluateConnectedPawns(color) {
    var score = 0;
    var pawns = getPawns(color);
    var byCol = {};
    pawns.forEach(function(p) {
        if (!byCol[p.col]) byCol[p.col] = [];
        byCol[p.col].push(p);
    });
    var cols = Object.keys(byCol).map(Number).sort(function(a, b) { return a - b; });
    for (var i = 0; i < cols.length - 1; i++) {
        if (cols[i + 1] - cols[i] === 1) {
            score += 10;
        }
    }
    return score;
}

function evaluateDefendedPawns(color) {
    var score = 0;
    var board = game.board();
    var backward = color === 'w' ? 1 : -1;

    getPawns(color).forEach(function(pawn) {
        var boardRow = 7 - pawn.row;
        var defenderRow = boardRow + backward;
        if (defenderRow < 0 || defenderRow > 7) return;
        var defended = false;
        if (pawn.col > 0 && board[defenderRow][pawn.col - 1] &&
            board[defenderRow][pawn.col - 1].color === color &&
            board[defenderRow][pawn.col - 1].type === 'p') {
            defended = true;
        }
        if (!defended && pawn.col < 7 && board[defenderRow][pawn.col + 1] &&
            board[defenderRow][pawn.col + 1].color === color &&
            board[defenderRow][pawn.col + 1].type === 'p') {
            defended = true;
        }
        if (defended) score += 10;
    });
    return score;
}

// ============================================================
// Factors ported from old_factors.js (useful ones, rewritten)
// ============================================================

// Bonus for each opponent pawn blocked by OUR pawn directly in front
function evaluateOpponentBlocked(color) {
    var count = 0;
    var board = game.board();
    var enemyColor = color === 'w' ? 'b' : 'w';
    var enemyForward = enemyColor === 'w' ? -1 : 1; // enemy's forward direction in board[]

    getPawns(enemyColor).forEach(function(oppPawn) {
        var boardRow = 7 - oppPawn.row;
        var oppNextRow = boardRow + enemyForward;
        if (oppNextRow < 0 || oppNextRow > 7) return;
        var blocker = board[oppNextRow][oppPawn.col];
        if (blocker && blocker.type === 'p' && blocker.color === color) {
            count++;
        }
    });
    return count;
}

// Count of own pawns that are attacked (can be captured) by enemy pawns.
// Returns positive count; use negative weight to make it a penalty.
function evaluateThreatenedPawns(color) {
    var count = 0;
    var board = game.board();
    var enemyColor = color === 'w' ? 'b' : 'w';
    var enemyForward = enemyColor === 'w' ? -1 : 1;

    // Collect squares attacked by enemy pawns
    var attacked = {};
    getPawns(enemyColor).forEach(function(ep) {
        var attackRow = (7 - ep.row) + enemyForward;
        if (attackRow < 0 || attackRow > 7) return;
        var left = ep.col - 1;
        var right = ep.col + 1;
        if (left >= 0) attacked[attackRow + ',' + left] = true;
        if (right <= 7) attacked[attackRow + ',' + right] = true;
    });

    // Count our pawns on attacked squares
    getPawns(color).forEach(function(pawn) {
        var boardRow = 7 - pawn.row;
        if (attacked[boardRow + ',' + pawn.col]) {
            count++;
        }
    });
    return count;
}

// Isolated pawns: pawns with no friendly pawn on adjacent files.
// Returns count; use negative weight to make it a penalty.
function evaluateIsolatedPawns(color) {
    var count = 0;
    var pawns = getPawns(color);
    var pawnFiles = {};
    pawns.forEach(function(p) { pawnFiles[p.col] = true; });

    pawns.forEach(function(pawn) {
        var hasLeft = pawnFiles[pawn.col - 1];
        var hasRight = pawnFiles[pawn.col + 1];
        if (!hasLeft && !hasRight) count++;
    });
    return count;
}

// Promotion race: compares distance of best pawn to promotion for both sides.
// Returns (opponentMinDistance - ownMinDistance). Positive = we're ahead.
function evaluatePromotionRace(color) {
    var board = game.board();
    var enemyColor = color === 'w' ? 'b' : 'w';

    function bestDistance(playerColor) {
        var minDist = 99;
        var forward = playerColor === 'w' ? -1 : 1;
        getPawns(playerColor).forEach(function(pawn) {
            var boardRow = 7 - pawn.row;
            // Check if path is clear
            var clear = true;
            for (var r = boardRow + forward; r >= 0 && r < 8; r += forward) {
                if (board[r][pawn.col]) { clear = false; break; }
            }
            if (clear) {
                var promotionRow = playerColor === 'w' ? 7 : 0;
                var dist = Math.abs(pawn.row - promotionRow);
                if (dist < minDist) minDist = dist;
            }
        });
        return minDist;
    }

    var myDist = bestDistance(color);
    var oppDist = bestDistance(enemyColor);

    // If neither side has a clear path, return 0
    if (myDist >= 99 && oppDist >= 99) return 0;
    if (myDist >= 99) return -10; // we have no clear path, opponent might
    if (oppDist >= 99) return 10; // opponent has no clear path, we do

    return oppDist - myDist;
}

// ============================================================
// Factor Registry
// ============================================================

var FACTORS = {
    // --- Decomposed baseline factors (functions defined in strategies.js, via globalThis) ---
    mediumAdvancement: {
        name: 'Medium: Advancement',
        fn: function(color) { return evaluateMediumAdvancement(color); },
        range: [0, 5],
        default: 2.0,
        level: 'A',
    },
    mediumFreePath: {
        name: 'Medium: Free Path',
        fn: function(color) { return evaluateMediumFreePath(color); },
        range: [0, 3],
        default: 0.7,
        level: 'A',
    },
    mediumAdjacentThreat: {
        name: 'Medium: Adjacent Threat',
        fn: function(color) { return evaluateMediumAdjacentThreat(color); },
        range: [-3, 0],
        default: -0.8,
        level: 'A',
    },
    mediumCenterColumn: {
        name: 'Medium: Center Column',
        fn: function(color) { return evaluateMediumCenterColumn(color); },
        range: [0, 2],
        default: 0.2,
        level: 'A',
    },
    mediumNextMoveSafety: {
        name: 'Medium: Next Move Safety',
        fn: function(color) { return evaluateMediumNextMoveSafety(color); },
        range: [0, 5],
        default: 2.0,
        level: 'A',
    },

    // --- Existing factors from strategies.js (wrappers) ---
    pawnAdvancement: {
        name: 'Pawn Advancement (cumulative)',
        fn: function(color) { return evaluatePawnAdvancement(color); },
        range: [0, 3],
        default: 1.0,
        level: 'A',
    },
    pawnCount: {
        name: 'Pawn Count (Material)',
        fn: function(color) { return evaluatePawnCount(color); },
        range: [0, 2],
        default: 1.0,
        level: 'A',
    },
    captureOpportunities: {
        name: 'Capture Opportunities',
        fn: function(color) { return evaluateCaptureOpportunities(color); },
        range: [0, 2],
        default: 0.3,
        level: 'A',
    },
    freePath: {
        name: 'Free Path (full: column+adjacent)',
        fn: function(color) { return evaluateFreePath(color); },
        range: [0, 3],
        default: 0.5,
        level: 'A',
    },
    majority: {
        name: 'Majority',
        fn: function(color) { return evaluateMajority(color); },
        range: [0, 2],
        default: 0.5,
        level: 'B',
    },

    // --- New factors ---
    passedPawns: {
        name: 'Passed Pawns',
        fn: evaluatePassedPawns,
        range: [0, 5],
        default: 1.0,
        level: 'A',
    },
    blockedPawns: {
        name: 'Blocked Pawns',
        fn: evaluateBlockedPawns,
        range: [0, 3],
        default: 1.0,
        level: 'A',
    },
    mobility: {
        name: 'Mobility (full)',
        fn: evaluateMobility,
        range: [0, 3],
        default: 0.5,
        level: 'A',
    },
    connectedPawns: {
        name: 'Connected Pawns',
        fn: evaluateConnectedPawns,
        range: [0, 3],
        default: 0.5,
        level: 'B',
    },
    defendedPawns: {
        name: 'Defended Pawns',
        fn: evaluateDefendedPawns,
        range: [0, 3],
        default: 0.5,
        level: 'B',
    },

    // --- Ported from old_factors.js ---
    opponentBlocked: {
        name: 'Opponent Pawns Blocked',
        fn: evaluateOpponentBlocked,
        range: [0, 3],
        default: 0.5,
        level: 'B',
    },
    threatenedPawns: {
        name: 'Threatened Pawns',
        fn: evaluateThreatenedPawns,
        range: [-3, 0],
        default: -0.5,
        level: 'B',
    },
    isolatedPawns: {
        name: 'Isolated Pawns',
        fn: evaluateIsolatedPawns,
        range: [-3, 0],
        default: -0.3,
        level: 'B',
    },
    promotionRace: {
        name: 'Promotion Race',
        fn: evaluatePromotionRace,
        range: [0, 5],
        default: 1.0,
        level: 'A',
    },
};

module.exports = {
    FACTORS,
    evaluatePassedPawns,
    evaluateBlockedPawns,
    evaluateMobility,
    evaluateConnectedPawns,
    evaluateDefendedPawns,
    evaluateOpponentBlocked,
    evaluateThreatenedPawns,
    evaluateIsolatedPawns,
    evaluatePromotionRace,
};
