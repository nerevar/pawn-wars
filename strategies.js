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

// --- Strategy definitions ---

var STRATEGIES = {
    random: {
        name: 'Random',
        depth: 1,
        evaluate: function() { return 0; },
    },
    medium: {
        name: 'Medium (baseline)',
        depth: 4,
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
};

function difficultyToStrategy(level) {
    if (level === 0) return STRATEGIES.random;
    if (level === 1) return { ...STRATEGIES.medium, depth: 3 };
    if (level === 2) return STRATEGIES.medium;
    if (level === 3) return { ...STRATEGIES.medium, depth: 5 };
    return STRATEGIES.medium;
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
};
