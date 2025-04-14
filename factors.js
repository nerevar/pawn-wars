const EVALUATION_FACTORS = {
    pawnCount: {
        id: 'pawnCount',
        evaluate: evaluatePawnCount,
        defaultParams: {
            pawnValue: 100
        }
    },
    pawnAdvancement: {
        id: 'pawnAdvancement',
        evaluate: evaluatePawnAdvancement,
        defaultParams: {
            nearPromotionBonus: 1000,
            almostNearPromotionBonus: 100,
            enemySideBonus: 50,
            rankBonusMultiplier: 10
        }
    },
    mediumPawnAdvancement: {
        id: 'mediumPawnAdvancement',
        evaluate: evaluateMediumPawnAdvancement,
    },
    mediumCenterColumnBonus: {
        id: 'mediumCenterColumnBonus',
        evaluate: evaluateMediumCenterColumnBonus,
    },
    mediumNextMoveSafety: {
        id: 'mediumNextMoveSafety',
        evaluate: evaluateMediumNextMoveSafety,
    },
    mediumFreePath: {
        id: 'mediumFreePath',
        evaluate: evaluateMediumFreePath,
    },
    mediumAdjacentThreat: {
        id: 'mediumAdjacentThreat',
        evaluate: evaluateMediumAdjacentThreat,
    },

    // --- Новые продвинутые факторы ---
    pawnAdvancementAdvanced: {
        id: 'pawnAdvancementAdvanced',
        evaluate: evaluatePawnAdvancementAdvanced,
        defaultParams: {
            baseScore: 10,
            rankMultiplier: 5,
            nearGoalBonus: 100,
            veryNearGoalBonus: 500
        }
    },
    passedPawns: {
        id: 'passedPawns',
        evaluate: evaluatePassedPawns,
        defaultParams: {
            passedPawnBaseBonus: 200,
            passedPawnRankMultiplier: 50,
            nearGoalPassedBonus: 150 // Добавленный параметр
        }
    },
    passedPawnsPhaseAdaptive: {
        id: 'passedPawnsPhaseAdaptive',
        evaluate: evaluatePassedPawnsPhaseAdaptive, // Используем новую функцию
        defaultParams: {
            passedPawnBaseBonus: 200, passedPawnRankMultiplier: 50, nearGoalPassedBonus: 150,
            enablePhaseAdjustment: true, endgameMultiplier: 2.0, middlegameMultiplier: 1.2,
            endgameThreshold: 8, middlegameThreshold: 12
        }
    },
    blockedPawns: {
        id: 'blockedPawns',
        evaluate: evaluateBlockedPawns,
        defaultParams: { blockedPenalty: 50 } // Положительное значение, вес будет < 0
    },
    opponentBlockedPawns: {
        id: 'opponentBlockedPawns',
        evaluate: evaluateOpponentBlockedPawns,
        defaultParams: { opponentBlockedBonus: 40 }
    },
    mobility: {
        id: 'mobility',
        evaluate: evaluateMobility,
        defaultParams: { moveBonus: 2 }
    },
    opponentRestriction: {
        id: 'opponentRestriction',
        evaluate: evaluateOpponentRestriction,
        defaultParams: { attackedSquareBonus: 1, attackedNearOpponentBonus: 5 }
    },
    connectedPawns: {
        id: 'connectedPawns',
        evaluate: evaluateConnectedPawns,
        defaultParams: { connectedPawnBonus: 15 }
    },
    openingTempo: {
        id: 'openingTempo',
        evaluate: evaluateOpeningTempo,
        defaultParams: {
            doubleMoveBonus: 5,
            centerDoubleMoveBonus: 8,
            maxEffectiveMoveNumber: 5
        }
    },
    threatenedPawns: {
        id: 'threatenedPawns',
        evaluate: evaluateThreatenedPawns,
        defaultParams: {
            threatenedPenalty: 40,             // Положительное значение, вес будет < 0
            threatenedAdvancedPenalty: 60      // Положительное значение, вес будет < 0
        }
    },
    potentialCaptures: {
        id: 'potentialCaptures',
        evaluate: evaluatePotentialCaptures,
        defaultParams: {
            captureBaseValue: 100,
            captureRankMultiplier: 20
        }
    },

    // --- Новые факторы ---
    pawnIslands: {
        id: 'pawnIslands',
        evaluate: evaluatePawnIslands,
        defaultParams: { islandPenalty: 10 } // Положительное, вес < 0
    },
    isolatedPawns: {
        id: 'isolatedPawns',
        evaluate: evaluateIsolatedPawns,
        defaultParams: { isolatedPawnPenalty: 15, isolatedAdvancedPenalty: 10 } // Положительное, вес < 0
    },
    keySquareControl: {
        id: 'keySquareControl',
        evaluate: evaluateKeySquareControl,
        defaultParams: { controlOpponentFrontBonus: 4, controlPromotionApproachBonus: 8 }
    },
    promotionRace: {
        id: 'promotionRace',
        evaluate: evaluatePromotionRace,
        defaultParams: { raceWinBonus: 300, raceAdvantageMultiplier: 50 }
    },
    pawnMajority: {
        id: 'pawnMajority',
        evaluate: evaluatePawnMajority,
        defaultParams: { majorityBonus: 20, centerWeight: 0.5 }
    },
}

function evaluatePawnAdvancement(color, params) {
    const {
        winScore = 10000,
        nearPromotionBonus = 1000,
        almostNearPromotionBonus = 100,
        enemySideBonus = 50,
        rankDistanceBonus = 10,
    } = params;

    // бонус за расстояние до финиша
    let score = 0;
    const promotionRow = color === 'w' ? 7 : 0;
    getPawns(color).forEach(pawn => {
        const distance = Math.abs(pawn.row - promotionRow);
        switch (distance) {
            case 0: score += winScore;  // победа
            case 1: score += nearPromotionBonus;  // предпоследний ряд - почти победа
            case 2: score += almostNearPromotionBonus;  // бонус за 6ю для белых и 3ю для черных горизонталь
            case 3: score += enemySideBonus;  // бонус за преодоление экватора
            default: score += (7 - distance) * rankDistanceBonus; // бонус за расстояние для остальных клеток
        }
    });
    return score;
}

/**
 * Фактор: Продвижение пешки (Medium)
 * Оценка: Сумма (8 - расстояние_до_превращения) для всех пешек.
 * Вес в оригинале: 2.0
 */
function evaluateMediumPawnAdvancement(color, params) {
    let score = 0;
    const pawns = getPawns(color);

    pawns.forEach(pawn => {
        let promotionDistance;
        if (pawn.color === 'b') { // Черные идут к ряду 7 (индекс)
            promotionDistance = 7 - pawn.row;
        } else { // Белые идут к ряду 0 (индекс)
            promotionDistance = pawn.row;
        }
        // Оригинальная логика: (8 - promotionDistance)
        score += (8 - promotionDistance);
    });
    return score; // Вес 2.0 будет применен в конфиге
}

/**
 * Фактор: Бонус за центр (Medium)
 * Оценка: Количество пешек в колонках 1-6 (индексы).
 * Вес в оригинале: 0.2
 */
function evaluateMediumCenterColumnBonus(color, params) {
    let count = 0;
    const pawns = getPawns(color);

    pawns.forEach(pawn => {
        // Center column bonus
        if (pawn.col > 0 && pawn.col < 7) {
            count++; // Считаем пешки в центре
        }
    });
    return count; // Вес 0.2 будет применен в конфиге
}

/**
 * Фактор: Безопасность следующего хода (Medium)
 * Оценка: Количество пешек, которые могут безопасно пойти на 1 вперед.
 * Вес в оригинале: 2.0
 */
function evaluateMediumNextMoveSafety(color, params) {
    let nextMoveFreeCount = 0;
    const pawns = getPawns(color);
    const board = game.board();

    pawns.forEach(pawn => {
        // Prioritize: Is the pawn on the next move free?
        let isPotentiallyFree = false; // Флаг, что ход вперед возможен
        let willBeSafeScore = 0;    // Оригинальная переменная (0 или 1)

        if (pawn.color === 'b') {
            // Check if the pawn can move forward one square
            const nextRow = pawn.row + 1;
            if (nextRow < 8 && !board[nextRow][pawn.col]) {
                isPotentiallyFree = true;
                // Check if there are any white pawns that could capture after it moves
                // Оригинальная логика проверки безопасности:
                const checkRow = pawn.row + 2; // Ряд, где могла бы стоять атакующая пешка (не совсем корректно, но сохраняем)
                if (checkRow < 8) { // Проверка в пределах доски
                    const canBeCapturedFromLeft = pawn.col > 0 && board[checkRow][pawn.col - 1] && board[checkRow][pawn.col - 1].color === 'w';
                    const canBeCapturedFromRight = pawn.col < 7 && board[checkRow][pawn.col + 1] && board[checkRow][pawn.col + 1].color === 'w';

                    if (!canBeCapturedFromLeft && !canBeCapturedFromRight) {
                        willBeSafeScore = 1; // Считается безопасным по ОРИГИНАЛЬНОЙ логике
                    }
                } else {
                    // Если checkRow за доской, то атаковать оттуда не могут
                    willBeSafeScore = 1;
                }
            }
        } else { // color === 'w'
            // Check if the pawn can move forward one square
            const nextRow = pawn.row - 1;
            if (nextRow >= 0 && !board[nextRow][pawn.col]) {
                isPotentiallyFree = true;
                // Check if there are any black pawns that could capture after it moves
                // Оригинальная логика проверки безопасности:
                const checkRow = pawn.row - 2; // Ряд, где могла бы стоять атакующая пешка
                if (checkRow >= 0) { // Проверка в пределах доски
                    const canBeCapturedFromLeft = pawn.col > 0 && board[checkRow][pawn.col - 1] && board[checkRow][pawn.col - 1].color === 'b';
                    const canBeCapturedFromRight = pawn.col < 7 && board[checkRow][pawn.col + 1] && board[checkRow][pawn.col + 1].color === 'b';

                    if (!canBeCapturedFromLeft && !canBeCapturedFromRight) {
                        willBeSafeScore = 1; // Считается безопасным по ОРИГИНАЛЬНОЙ логике
                    }
                } else {
                    // Если checkRow за доской, то атаковать оттуда не могут
                    willBeSafeScore = 1;
                }
            }
        }

        // Суммируем только если ход вперед вообще возможен И он безопасен
        if (isPotentiallyFree && willBeSafeScore === 1) {
            nextMoveFreeCount += 1; // Используем счетчик вместо оригинальной переменной
        }
    });

    return nextMoveFreeCount; // Вес 2.0 будет применен в конфиге
}


/**
 * Фактор: Свободный путь (Medium)
 * Оценка: Количество пешек, перед которыми нет фигур на их вертикали.
 * Вес в оригинале: 0.7
 */
function evaluateMediumFreePath(color, params) {
    let freePathCount = 0;
    const pawns = getPawns(color);
    const board = game.board();

    pawns.forEach(pawn => {
        // Free path bonus (no pieces in front)
        let isPathBlocked = false;
        if (pawn.color === 'b') {
            for (let r = pawn.row + 1; r < 8; r++) {
                if (board[r][pawn.col]) {
                    isPathBlocked = true;
                    break;
                }
            }
        } else { // White
            for (let r = pawn.row - 1; r >= 0; r--) {
                if (board[r][pawn.col]) {
                    isPathBlocked = true;
                    break;
                }
            }
        }
        if (!isPathBlocked) {
            freePathCount++; // Считаем пешки со свободным путем
        }
    });
    return freePathCount; // Вес 0.7 будет применен в конфиге
}

/**
 * Фактор: Боковая угроза (Medium) - Наличие вражеской пешки на той же строке рядом.
 * Оценка: Количество таких ситуаций для всех пешек цвета.
 * Вес в оригинале: -0.8 (штраф)
 */
function evaluateMediumAdjacentThreat(color, params) {
    let threatCount = 0;
    const pawns = getPawns(color);
    const opponentColor = color === 'w' ? 'b' : 'w';
    const board = game.board();

    pawns.forEach(pawn => {
        // Adjacent columns blocked penalty (Discourage being captured - по оригинальному комменту)
        // Проверяем слева
        if (pawn.col > 0 && board[pawn.row][pawn.col - 1] && board[pawn.row][pawn.col - 1].color === opponentColor && board[pawn.row][pawn.col - 1].type === 'p') { // Добавил проверку на пешку
            threatCount++;
        }
        // Проверяем справа
        if (pawn.col < 7 && board[pawn.row][pawn.col + 1] && board[pawn.row][pawn.col + 1].color === opponentColor && board[pawn.row][pawn.col + 1].type === 'p') { // Добавил проверку на пешку
            threatCount++;
        }
    });
    // Возвращаем ПОЛОЖИТЕЛЬНОЕ количество угроз.
    // Отрицательный вес в конфиге сделает это штрафом.
    return threatCount;
}

// =======================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (могут понадобиться)
// =======================================================================

/**
 * Проверяет, находится ли клетка в пределах доски.
 * @param {number} r - Индекс ряда (0-7)
 * @param {number} c - Индекс колонки (0-7)
 * @returns {boolean}
 */
function isSafe(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

/**
 * Получает фигуру на клетке или null.
 * @param {number} r - Индекс ряда
 * @param {number} c - Индекс колонки
 * @param {Array<Array<object|null>>} board - Доска (результат game.board())
 * @returns {object|null} Фигура или null.
 */
function getPiece(r, c, board) {
    if (!isSafe(r, c)) return null;
    return board[r][c];
}

// =======================================================================
// ФАКТОРЫ ОЦЕНКИ
// =======================================================================

/**
 * ФАКТОР: Продвижение пешек (Улучшенный)
 * Оценка: Бонус за близость к полю превращения. Бонус растет нелинейно.
 * Гиперпараметры: baseScore, rankMultiplier, nearGoalBonus, veryNearGoalBonus
 */
function evaluatePawnAdvancementAdvanced(color, params = {}) {
    const {
        baseScore = 10,         // Базовая ценность пешки
        rankMultiplier = 5,     // Множитель за каждую пройденную горизонталь
        nearGoalBonus = 100,    // Доп. бонус за 2 шага до цели
        veryNearGoalBonus = 500 // Доп. бонус за 1 шаг до цели
    } = params;

    let score = 0;
    const pawns = getPawns(color);
    const promotionRank = (color === 'w') ? 0 : 7; // Куда стремимся
    const startRank = (color === 'w') ? 6 : 1;     // Откуда стартуем (для расчета прогресса)

    pawns.forEach(pawn => {
        const currentRank = pawn.row;
        const distanceToGoal = Math.abs(currentRank - promotionRank);
        const ranksAdvanced = Math.abs(currentRank - startRank);

        let pawnScore = baseScore + ranksAdvanced * rankMultiplier;

        // Нелинейные бонусы за близость к цели
        if (distanceToGoal === 1) {
            pawnScore += veryNearGoalBonus;
        } else if (distanceToGoal === 2) {
            pawnScore += nearGoalBonus;
        }
        // Можно добавить еще бонусы/штрафы за начальные ряды, если нужно

        score += pawnScore;
    });
    return score;
}


/**
 * ФАКТОР: Проходные пешки (Passed Pawns)
 * Оценка: Большой бонус за пешки, перед которыми нет пешек противника на их и соседних вертикалях.
 * Бонус зависит от продвинутости пешки.
 * Гиперпараметры: passedPawnBaseBonus, passedPawnRankMultiplier
 */
function evaluatePassedPawns(color, params = {}) {
    const {
        passedPawnBaseBonus = 200,        // Базовый бонус за статус проходной
        passedPawnRankMultiplier = 50    // Доп. бонус за каждую пройденную горизонталь проходной пешки
    } = params;

    let score = 0;
    const pawns = getPawns(color);
    const opponentColor = (color === 'w') ? 'b' : 'w';
    const board = game.board();
    const direction = (color === 'w') ? -1 : 1; // Направление движения
    const startRank = (color === 'w') ? 6 : 1;

    pawns.forEach(pawn => {
        let isPassed = true;
        // Проверяем все клетки перед пешкой на этой и соседних вертикалях
        for (let c = pawn.col - 1; c <= pawn.col + 1; c++) {
            if (c < 0 || c > 7) continue; // За пределами доски

            for (let r = pawn.row + direction; isSafe(r, c); r += direction) {
                const piece = getPiece(r, c, board);
                if (piece && piece.type === 'p' && piece.color === opponentColor) {
                    isPassed = false;
                    break; // Нашли блокирующую пешку противника
                }
            }
            if (!isPassed) break; // Нет смысла проверять другие вертикали
        }

        if (isPassed) {
            const ranksAdvanced = Math.abs(pawn.row - startRank);
            score += passedPawnBaseBonus + ranksAdvanced * passedPawnRankMultiplier;
            // Дополнительный бонус, если проходная близка к цели? Можно добавить.
            const distanceToGoal = Math.abs(pawn.row - (color === 'w' ? 0 : 7));
            if (distanceToGoal <= 2) {
                score += params.nearGoalPassedBonus || 150; // Пример доп. бонуса
            }
        }
    });
    return score;
}


/**
 * ФАКТОР: Проходные пешки (Passed Pawns) - с адаптацией к стадии игры
 * Оценка: Большой бонус за пешки, перед которыми нет пешек противника на их и соседних вертикалях.
 * Бонус зависит от продвинутости пешки и СТАДИИ ИГРЫ.
 * Гиперпараметры: ..., endgameMultiplier, middlegameThreshold, endgameThreshold
 */
function evaluatePassedPawnsPhaseAdaptive(color, params = {}) {
    const {
        passedPawnBaseBonus = 200,
        passedPawnRankMultiplier = 50,
        nearGoalPassedBonus = 150,
        // Параметры для адаптации
        enablePhaseAdjustment = true, // Включить адаптацию?
        endgameMultiplier = 2.0,    // Насколько умножить бонус в эндшпиле
        middlegameMultiplier = 1.2, // Насколько умножить бонус в миттельшпиле
        endgameThreshold = 8,       // Меньше или равно стольки пешек = эндшпиль
        middlegameThreshold = 12    // Меньше или равно стольки пешек = миттельшпиль (иначе - дебют)
    } = params;

    let score = 0;
    const pawns = getPawns(color);
    const opponentColor = (color === 'w') ? 'b' : 'w';
    const board = game.board();
    const direction = (color === 'w') ? -1 : 1;
    const startRank = (color === 'w') ? 6 : 1;

    // Определяем стадию игры, если адаптация включена
    let phaseMultiplier = 1.0;
    if (enablePhaseAdjustment) {
        const totalPawns = getPawns(null).length; // Получаем всех пешек
        if (totalPawns <= endgameThreshold) {
            phaseMultiplier = endgameMultiplier;
        } else if (totalPawns <= middlegameThreshold) {
            phaseMultiplier = middlegameMultiplier;
        }
        // Иначе phaseMultiplier = 1.0 (дебют)
    }

    pawns.forEach(pawn => {
        let isPassed = true;
        // ... (логика проверки isPassed остается той же) ...
        for (let c = pawn.col - 1; c <= pawn.col + 1; c++) {
            if (c < 0 || c > 7) continue;
            for (let r = pawn.row + direction; isSafe(r, c); r += direction) {
                const piece = getPiece(r, c, board);
                if (piece && piece.type === 'p' && piece.color === opponentColor) {
                    isPassed = false;
                    break;
                }
            }
            if (!isPassed) break;
        }

        if (isPassed) {
            const ranksAdvanced = Math.abs(pawn.row - startRank);
            let pawnScore = passedPawnBaseBonus + ranksAdvanced * passedPawnRankMultiplier;
            const distanceToGoal = Math.abs(pawn.row - (color === 'w' ? 0 : 7));
            if (distanceToGoal <= 2) {
                pawnScore += nearGoalPassedBonus;
            }
            // Применяем множитель стадии игры
            score += pawnScore * phaseMultiplier;
        }
    });
    return score;
}


/**
 * ФАКТОР: Заблокированные свои пешки
 * Оценка: Штраф за каждую пешку, которая не может сделать ход вперед (упирается в фигуру).
 * Гиперпараметры: blockedPenalty
 */
function evaluateBlockedPawns(color, params = {}) {
    const { blockedPenalty = 50 } = params; // Штраф за каждую блокированную пешку

    let blockedCount = 0;
    const pawns = getPawns(color);
    const board = game.board();
    const direction = (color === 'w') ? -1 : 1;

    pawns.forEach(pawn => {
        const forwardRow = pawn.row + direction;
        if (!isSafe(forwardRow, pawn.col)) { // Пешка уже на последней линии (должна была превратиться)
            return;
        }
        // Проверяем клетку прямо перед пешкой
        const frontPiece = getPiece(forwardRow, pawn.col, board);
        if (frontPiece) { // Клетка занята - пешка блокирована
            blockedCount++;
        }
    });
    // Возвращаем ПОЛОЖИТЕЛЬНОЕ число блокированных пешек.
    // Отрицательный вес в конфиге сделает это штрафом.
    return blockedCount * blockedPenalty; // Можно вернуть просто count, а вес задать в конфиге
}


/**
 * ФАКТОР: Блокировка пешек противника (Простая)
 * Оценка: Бонус за каждую пешку противника, которая блокирована НАШЕЙ пешкой.
 * Гиперпараметры: opponentBlockedBonus
 */
function evaluateOpponentBlockedPawns(color, params = {}) {
    const { opponentBlockedBonus = 40 } = params; // Бонус за блокировку пешки врага

    let blockedOpponentCount = 0;
    const opponentColor = (color === 'w') ? 'b' : 'w';
    const opponentPawns = getPawns(opponentColor);
    const board = game.board();
    const opponentDirection = (opponentColor === 'w') ? -1 : 1;

    opponentPawns.forEach(oppPawn => {
        const forwardRow = oppPawn.row + opponentDirection;
        if (!isSafe(forwardRow, oppPawn.col)) return; // Враг у цели

        const frontPiece = getPiece(forwardRow, oppPawn.col, board);
        // Если клетка перед врагом занята НАШЕЙ пешкой
        if (frontPiece && frontPiece.type === 'p' && frontPiece.color === color) {
            blockedOpponentCount++;
        }
    });
    return blockedOpponentCount * opponentBlockedBonus;
}


/**
 * ФАКТОР: Продвинутые блокады (1 наша пешка блокирует 2 или 3 вражеские)
 * Оценка: Дополнительный бонус за эффективные блокады.
 * Гиперпараметры: block2Bonus, block3Bonus
 */
function evaluateAdvancedBlockades(color, params = {}) {
    const { block2Bonus = 70, block3Bonus = 150 } = params;

    let score = 0;
    const myPawns = getPawns(color);
    const opponentColor = (color === 'w') ? 'b' : 'w';
    const board = game.board();
    const opponentDirection = (opponentColor === 'w') ? -1 : 1;

    myPawns.forEach(myPawn => {
        let blockedCount = 0;
        // Проверяем, стоят ли вражеские пешки прямо перед нашей пешкой по диагонали (с точки зрения врага)
        // То есть, на ряд ближе к нам, по бокам от нас

        const checkRow = myPawn.row - opponentDirection; // Ряд, где могли бы стоять враги, чтобы наша пешка их блокировала

        if (!isSafe(checkRow, 0)) return; // Если ряд за пределами доски

        // Враг слева (относительно нас)
        const leftOpp = getPiece(checkRow, myPawn.col - 1, board);
        if (leftOpp && leftOpp.color === opponentColor && leftOpp.type === 'p') {
            // Проверяем, действительно ли НАША пешка блокирует ход этой вражеской пешке
            if (getPiece(checkRow + opponentDirection, myPawn.col - 1, board) === myPawn) { // Ход вперед для врага упирается в нас? Это не так работает.
                // Наша пешка myPawn стоит на [myPawn.row, myPawn.col].
                // Враг leftOpp стоит на [checkRow, myPawn.col - 1].
                // Ход вперед для врага leftOpp - это поле [checkRow + opponentDirection, myPawn.col - 1], т.е. [myPawn.row, myPawn.col - 1].
                // Наша пешка НЕ блокирует его ход вперед.
                // Этот фактор, как описано ("блокирует 2 или 3"), сложен.
                // Давайте переформулируем: "Наша пешка АТАКУЕТ поля, куда могли бы пойти 2 или 3 вражеские пешки".
                // Или: "Наша пешка стоит ПЕРЕД 'вилкой'/'треугольником' вражеских пешек".

                // Попробуем вариант "Пешка стоит перед треугольником":
                // Наша пешка P на [r, c]. Треугольник врагов T1, T2, T3.
                // Если мы белые (идем к row 0), то враги черные (идут к row 7).
                // Враги могут стоять на [r+1, c-1], [r+1, c+1] и возможно [r+2, c]? Или [r+1, c]?
                // Пример: Белая пешка e4. Черные c5, d5, e5? Или c5, e5?
                // Пешка на e4 блокирует ходы вперед d5 и e5.
                // Давайте считать, сколько вражеских пешек не могут пойти вперед ИЗ-ЗА нашей пешки.
                blockedCount = 0; // Перенесем сюда
                if (leftOpp && leftOpp.color === opponentColor && leftOpp.type === 'p') {
                    const oppForwardRow = leftOpp.row + opponentDirection;
                    if (isSafe(oppForwardRow, leftOpp.col) && getPiece(oppForwardRow, leftOpp.col, board) === myPawn) {
                        blockedCount++;
                    }
                }
                // Враг справа (относительно нас)
                const rightOpp = getPiece(checkRow, myPawn.col + 1, board);
                if (rightOpp && rightOpp.color === opponentColor && rightOpp.type === 'p') {
                    const oppForwardRow = rightOpp.row + opponentDirection;
                    if (isSafe(oppForwardRow, rightOpp.col) && getPiece(oppForwardRow, rightOpp.col, board) === myPawn) {
                        blockedCount++;
                    }
                }
                // Враг прямо перед нами (уже блокирован кем-то другим или нами)
                // Этот фактор дублирует evaluateOpponentBlockedPawns, его тут не считаем.
            }
        }

        // Применяем бонус, если одна наша пешка блокирует >1 врага
        if (blockedCount === 2) {
            score += block2Bonus;
        } else if (blockedCount >= 3) { // >= 3 на случай странных позиций
            score += block3Bonus;
        }
    });
    return score;
}


/**
 * ФАКТОР: Мобильность (количество легальных ходов)
 * Оценка: Бонус за общее количество доступных ходов для всех пешек.
 * Гиперпараметры: moveBonus
 */
function evaluateMobility(color, params = {}) {
    const { moveBonus = 2 } = params;
    let legalMovesCount = 0;
    const pawns = getPawns(color);
    const board = game.board();
    const direction = (color === 'w') ? -1 : 1;
    const startRank = (color === 'w') ? 6 : 1;
    const opponentColor = (color === 'w') ? 'b' : 'w';

    pawns.forEach(pawn => {
        // 1. Ход вперед на 1 клетку
        const r1 = pawn.row + direction;
        const c1 = pawn.col;
        if (isSafe(r1, c1) && !getPiece(r1, c1, board)) {
            legalMovesCount++;
            // 2. Ход вперед на 2 клетки (только с начальной позиции)
            if (pawn.row === startRank) {
                const r2 = pawn.row + 2 * direction;
                if (isSafe(r2, c1) && !getPiece(r2, c1, board)) {
                    legalMovesCount++;
                }
            }
        }
        // 3. Взятие влево
        const cLeft = pawn.col - 1;
        if (isSafe(r1, cLeft)) {
            const captureLeft = getPiece(r1, cLeft, board);
            if (captureLeft && captureLeft.color === opponentColor) {
                legalMovesCount++;
            }
        }
        // 4. Взятие вправо
        const cRight = pawn.col + 1;
        if (isSafe(r1, cRight)) {
            const captureRight = getPiece(r1, cRight, board);
            if (captureRight && captureRight.color === opponentColor) {
                legalMovesCount++;
            }
        }
        // 5. Взятие на проходе (En Passant) - ОПЦИОНАЛЬНО, если правила поддерживают
        // Требует информации о последнем ходе противника (был ли это двойной ход пешки рядом)
        // Если игра не поддерживает En Passant, этот пункт пропускаем.
    });

    return legalMovesCount * moveBonus;
}

/**
 * ФАКТОР: Ограничение противника
 * Оценка: Штраф оппоненту (т.е. бонус нам) за клетки, которые атакованы нашими пешками.
 * Особенно ценно атаковать клетки прямо перед пешками противника.
 * Гиперпараметры: attackedSquareBonus, attackedNearOpponentBonus
 */
function evaluateOpponentRestriction(color, params = {}) {
    const { attackedSquareBonus = 1, attackedNearOpponentBonus = 5 } = params;

    let restrictionScore = 0;
    const myPawns = getPawns(color);
    const board = game.board();
    const direction = (color === 'w') ? -1 : 1;
    const opponentColor = (color === 'w') ? 'b' : 'w';
    const opponentDirection = -direction;

    // Собираем все клетки, атакованные нашими пешками
    const attackedSquares = new Set(); // Используем Set для хранения уникальных координат "row,col"

    myPawns.forEach(pawn => {
        const attackRow = pawn.row + direction;
        // Атака влево
        const attackColLeft = pawn.col - 1;
        if (isSafe(attackRow, attackColLeft)) {
            attackedSquares.add(`${attackRow},${attackColLeft}`);
        }
        // Атака вправо
        const attackColRight = pawn.col + 1;
        if (isSafe(attackRow, attackColRight)) {
            attackedSquares.add(`${attackRow},${attackColRight}`);
        }
    });

    restrictionScore += attackedSquares.size * attackedSquareBonus;

    // Дополнительный бонус, если атакованная клетка находится прямо перед пешкой противника
    const opponentPawns = getPawns(opponentColor);
    opponentPawns.forEach(oppPawn => {
        const oppForwardRow = oppPawn.row + opponentDirection;
        const oppForwardCol = oppPawn.col;
        if (attackedSquares.has(`${oppForwardRow},${oppForwardCol}`)) {
            restrictionScore += attackedNearOpponentBonus;
        }
    });

    return restrictionScore;
}


/**
 * ФАКТОР: Связанные пешки (Поддерживающие друг друга)
 * Оценка: Бонус за пешки, которые защищены другими своими пешками.
 * Гиперпараметры: connectedPawnBonus
 */
function evaluateConnectedPawns(color, params = {}) {
    const { connectedPawnBonus = 15 } = params;
    let score = 0;
    const myPawns = getPawns(color);
    const board = game.board();
    const direction = (color === 'w') ? -1 : 1;
    const defenseRow = color === 'w' ? 1 : -1; // Ряд ОТКУДА нас защищают

    // Создаем Set с позициями наших пешек для быстрой проверки защиты
    const myPawnPositions = new Set();
    myPawns.forEach(p => myPawnPositions.add(`${p.row},${p.col}`));

    myPawns.forEach(pawn => {
        let isProtected = false;
        // Проверяем защитника слева сзади
        const protectorRow = pawn.row + defenseRow;
        const protectorColLeft = pawn.col - 1;
        if (myPawnPositions.has(`${protectorRow},${protectorColLeft}`)) {
            isProtected = true;
        }
        // Проверяем защитника справа сзади
        if (!isProtected) {
            const protectorColRight = pawn.col + 1;
            if (myPawnPositions.has(`${protectorRow},${protectorColRight}`)) {
                isProtected = true;
            }
        }

        if (isProtected) {
            score += connectedPawnBonus;
            // Можно добавить бонус в зависимости от ряда пешки (защищенная продвинутая пешка ценнее)
            // score += connectedPawnBonus + Math.abs(pawn.row - (color === 'w' ? 6 : 1));
        }
    });
    return score;
}

/**
 * ФАКТОР: Темп в дебюте (Двойные ходы) - Версия с game.moveNumber()
 * Оценка: Небольшой бонус за сделанные двойные ходы пешками (особенно центральными).
 * Этот фактор имеет смысл только на ранней стадии игры.
 * Гиперпараметры: doubleMoveBonus, centerDoubleMoveBonus, maxEffectiveMoveNumber
 */
function evaluateOpeningTempo(color, params = {}) {
    // Используем game.moveNumber()
    const currentMoveNumber = typeof game.moveNumber === 'function' ? game.moveNumber() : 100; // Заглушка, если нет

    const {
        doubleMoveBonus = 5,
        centerDoubleMoveBonus = 8,  // Доп. бонус за центральные (c, d, e, f -> 2, 3, 4, 5)
        maxEffectiveMoveNumber = 5  // Учитываем только первые N ходов БЕЛЫХ (т.е. ходы 1, 2, 3, 4, 5)
    } = params;

    // Фактор активен только в начале партии
    if (currentMoveNumber > maxEffectiveMoveNumber) {
        return 0;
    }

    let score = 0;
    const pawns = getPawns(color);
    const expectedDoubleRank = (color === 'w') ? 4 : 3; // Куда пешка приходит после двойного хода

    pawns.forEach(pawn => {
        // Простая эвристика: если пешка на 4/5 ряду (для белых/черных),
        // считаем, что она сделала двойной ход.
        // Ограничения: не учитывает взятия, не знает наверняка.
        // Точнее было бы хранить флаг "уже ходила" для каждой пешки.
        if (pawn.row === expectedDoubleRank) {
            if (pawn.col >= 2 && pawn.col <= 5) { // Центральные колонки
                score += centerDoubleMoveBonus;
            } else {
                score += doubleMoveBonus;
            }
        }
    });

    // Дополнительно: можно давать бонус, только если ХОДЯЩИЙ цвет = color.
    // Это будет стимулировать делать ход, а не просто оценивать позицию.
    // if (game.turn() === color) {
    //     return score;
    // } else {
    //     return 0; // Бонус только за активный темп
    // }
    // Пока оставим просто оценку позиции.

    return score;
}


/**
 * ФАКТОР: Атакуемые свои пешки
 * Оценка: Штраф за каждую нашу пешку, атакованную пешкой противника.
 * Гиперпараметры: threatenedPenalty, threatenedAdvancedPenalty
 */
function evaluateThreatenedPawns(color, params = {}) {
    const {
        threatenedPenalty = 40,             // Базовый штраф
        threatenedAdvancedPenalty = 60      // Доп. штраф, если атакована продвинутая пешка
    } = params;

    let penaltyScore = 0;
    const myPawns = getPawns(color);
    const opponentColor = (color === 'w') ? 'b' : 'w';
    const opponentPawns = getPawns(opponentColor);
    const board = game.board();
    const opponentDirection = (opponentColor === 'w') ? -1 : 1;
    const startRank = (color === 'w') ? 6 : 1; // Наш стартовый ряд

    // Собираем все клетки, атакованные врагом
    const opponentAttackedSquares = new Set();
    opponentPawns.forEach(oppPawn => {
        const attackRow = oppPawn.row + opponentDirection;
        // Атака влево (с точки зрения врага)
        const attackColLeft = oppPawn.col - 1;
        if (isSafe(attackRow, attackColLeft)) {
            opponentAttackedSquares.add(`${attackRow},${attackColLeft}`);
        }
        // Атака вправо
        const attackColRight = oppPawn.col + 1;
        if (isSafe(attackRow, attackColRight)) {
            opponentAttackedSquares.add(`${attackRow},${attackColRight}`);
        }
    });

    // Проверяем, какие наши пешки стоят на атакованных клетках
    myPawns.forEach(myPawn => {
        if (opponentAttackedSquares.has(`${myPawn.row},${myPawn.col}`)) {
            let currentPenalty = threatenedPenalty;
            // Увеличиваем штраф, если атакована продвинутая пешка
            const ranksAdvanced = Math.abs(myPawn.row - startRank);
            if (ranksAdvanced >= 3) { // Пример: продвинута на 3+ ряда
                currentPenalty += threatenedAdvancedPenalty;
            }
            penaltyScore += currentPenalty;
        }
    });

    // Возвращаем ПОЛОЖИТЕЛЬНЫЙ счет штрафа. Отрицательный вес сделает его штрафом.
    return penaltyScore;
}


/**
 * ФАКТОР: Ценность потенциальных взятий (Исправленная версия)
 * Оценка: Суммарная ценность пешек противника, которых мы можем съесть на следующем ходу.
 * Ценность зависит от продвинутости вражеской пешки.
 * Гиперпараметры: captureBaseValue, captureRankMultiplier
 */
function evaluatePotentialCaptures(color, params = {}) {
    // Используем nullish coalescing (??) для НАДЕЖНОГО применения дефолтов,
    // даже если в params передано null или undefined.
    const captureBaseValue = params.captureBaseValue ?? 100;
    const captureRankMultiplier = params.captureRankMultiplier ?? 20;

    // Дополнительная проверка: убедимся, что полученные значения - числа.
    if (typeof captureBaseValue !== 'number' || typeof captureRankMultiplier !== 'number' || isNaN(captureBaseValue) || isNaN(captureRankMultiplier)) {
        console.error(`[evaluatePotentialCaptures] Ошибка: Некорректные параметры! BaseValue: ${captureBaseValue}, RankMultiplier: ${captureRankMultiplier}. Возвращаем 0.`);
        return 0; // Безопасный выход при неверных параметрах
    }

    let captureValueScore = 0;
    const myPawns = getPawns(color);
    if (!myPawns) { // Защита на случай, если getPawns вернет что-то неожиданное
        console.error(`[evaluatePotentialCaptures] Ошибка: getPawns(${color}) вернул некорректное значение.`);
        return 0;
    }

    const opponentColor = (color === 'w') ? 'b' : 'w';
    const opponentStartRank = (opponentColor === 'w') ? 6 : 1; // Надежно
    const board = game.board();
    if (!board) {
        console.error(`[evaluatePotentialCaptures] Ошибка: getBoardCached() вернул некорректное значение.`);
        return 0;
    }

    const direction = (color === 'w') ? -1 : 1;

    myPawns.forEach(pawn => {
        // Проверка структуры своей пешки (на всякий случай)
        if (typeof pawn?.row !== 'number' || typeof pawn?.col !== 'number') {
            console.warn(`[evaluatePotentialCaptures] Пропуск некорректного объекта своей пешки:`, pawn);
            return; // Переход к следующей пешке в forEach
        }

        const attackRow = pawn.row + direction;

        // Функция для проверки и расчета взятия (чтобы избежать дублирования)
        const checkCapture = (col) => {
            if (isSafe(attackRow, col)) {
                const targetPiece = getPiece(attackRow, col, board);

                // Проверяем, что это пешка противника и у нее есть числовой row
                if (targetPiece &&
                    targetPiece.color === opponentColor &&
                    targetPiece.type === 'p' && // Убедимся, что это пешка
                    typeof targetPiece.row === 'number' &&
                    !isNaN(targetPiece.row)) // Доп. проверка на NaN
                {
                    const ranksAdvancedOpponent = Math.abs(targetPiece.row - opponentStartRank);

                    // Проверяем результат Math.abs перед использованием
                    if (!isNaN(ranksAdvancedOpponent)) {
                        // Все проверки пройдены, добавляем к счету
                        captureValueScore += captureBaseValue + ranksAdvancedOpponent * captureRankMultiplier;
                    } else {
                        // Этого не должно происходить при проверке targetPiece.row, но логируем на всякий случай
                        console.warn(`[evaluatePotentialCaptures] ranksAdvancedOpponent is NaN!`, { targetPiece, opponentStartRank });
                    }
                }
            }
        };

        // Проверка взятия влево
        checkCapture(pawn.col - 1);

        // Проверка взятия вправо
        checkCapture(pawn.col + 1);

        // En Passant capture evaluation? (Если игра поддерживает)
    });

    // Финальная проверка итогового счета (паранойя)
    if (isNaN(captureValueScore)) {
        console.error(`[evaluatePotentialCaptures] Итоговый captureValueScore стал NaN! Возвращаем 0.`, { color, params });
        return 0;
    }

    return captureValueScore;
}


/**
 * ФАКТОР: Материальное преимущество (простой счет пешек)
 * Оценка: Количество пешек на доске.
 * Гиперпараметры: pawnValue (хотя обычно вес фактора важнее)
 */
function evaluatePawnCount(color, params = {}) {
    const { pawnValue = 100 } = params; // Базовая ценность пешки
    // getPawns уже использует глобальное состояние
    const count = getPawns(color).length;
    return count * pawnValue; // Возвращаем общую стоимость
}

/**
 * ФАКТОР: Пешечные острова
 * Оценка: Штраф за количество изолированных групп пешек. Меньше островов = лучше структура.
 * Гиперпараметры: islandPenalty
 */
function evaluatePawnIslands(color, params = {}) {
    const { islandPenalty = 10 } = params;
    const pawns = getPawns(color);
    if (pawns.length === 0) return 0;

    // Используем Set для отслеживания посещенных пешек
    const visited = new Set();
    let islandCount = 0;

    function findConnections(pawn, currentIslandPawns) {
        const key = `${pawn.row},${pawn.col}`;
        if (visited.has(key)) return;
        visited.add(key);

        // Ищем соседей по горизонтали и диагонали (в пределах 1 клетки)
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const neighborRow = pawn.row + dr;
                const neighborCol = pawn.col + dc;

                // Ищем соседа в исходном списке пешек (не очень эффективно, лучше строить карту)
                const neighborPawn = currentIslandPawns.find(p => p.row === neighborRow && p.col === neighborCol);
                if (neighborPawn) {
                    findConnections(neighborPawn, currentIslandPawns);
                }

                // Оптимизация: Построить Set позиций `{row},{col}` один раз и проверять наличие соседа в нем
            }
        }
    }

    // Проходим по всем пешкам, если еще не посещена - начинаем поиск нового острова
    pawns.forEach(pawn => {
        if (!visited.has(`${pawn.row},${pawn.col}`)) {
            islandCount++;
            findConnections(pawn, pawns); // Передаем весь список для поиска связей
        }
    });

    // Штраф пропорционален количеству островов (чем больше, тем хуже)
    // Можно сделать нелинейно: 1 остров = 0 штрафа, 2 = мало, 3+ = много.
    let penalty = 0;
    if (islandCount > 1) {
        penalty = (islandCount - 1) * islandPenalty;
    }

    // Возвращаем ПОЛОЖИТЕЛЬНОЕ значение штрафа
    return penalty;
}

/**
 * ФАКТОР: Изолированные пешки
 * Оценка: Штраф за пешки, не имеющие дружественных пешек на соседних вертикалях.
 * Гиперпараметры: isolatedPawnPenalty, isolatedAdvancedPenalty
 */
function evaluateIsolatedPawns(color, params = {}) {
    const { isolatedPawnPenalty = 15, isolatedAdvancedPenalty = 10 } = params;
    let penaltyScore = 0;
    const pawns = getPawns(color);
    const startRank = (color === 'w') ? 6 : 1;

    // Создаем Set с колонками, где есть наши пешки
    const pawnFiles = new Set(pawns.map(p => p.col));

    pawns.forEach(pawn => {
        const hasLeftNeighbor = pawnFiles.has(pawn.col - 1);
        const hasRightNeighbor = pawnFiles.has(pawn.col + 1);

        if (!hasLeftNeighbor && !hasRightNeighbor) {
            let currentPenalty = isolatedPawnPenalty;
            // Дополнительный штраф, если изолированная пешка продвинута (более уязвима?)
            const ranksAdvanced = Math.abs(pawn.row - startRank);
            if (ranksAdvanced >= 3) {
                currentPenalty += isolatedAdvancedPenalty;
            }
            penaltyScore += currentPenalty;
        }
    });
    // Возвращаем ПОЛОЖИТЕЛЬНОЕ значение штрафа
    return penaltyScore;
}

/**
 * ФАКТОР: Контроль ключевых полей
 * Оценка: Бонус за атаку или занятие важных полей.
 * Важные поля: поля перед вражескими пешками, поля для блокады, поля на пути проходных, пред-предпоследняя горизонталь.
 * Гиперпараметры: controlOpponentFrontBonus, controlPromotionApproachBonus
 */
function evaluateKeySquareControl(color, params = {}) {
    const { controlOpponentFrontBonus = 4, controlPromotionApproachBonus = 8 } = params;

    let score = 0;
    const myPawns = getPawns(color);
    const opponentColor = (color === 'w') ? 'b' : 'w';
    const opponentPawns = getPawns(opponentColor);
    const board = game.board();
    const direction = (color === 'w') ? -1 : 1;
    const opponentDirection = -direction;
    const promotionApproachRank = (color === 'w') ? 1 : 6; // Пред-предпоследний ряд

    // 1. Собираем все поля, атакованные НАШИМИ пешками
    const myAttackedSquares = new Set();
    myPawns.forEach(pawn => {
        const attackRow = pawn.row + direction;
        const attackColLeft = pawn.col - 1;
        const attackColRight = pawn.col + 1;
        if (isSafe(attackRow, attackColLeft)) myAttackedSquares.add(`${attackRow},${attackColLeft}`);
        if (isSafe(attackRow, attackColRight)) myAttackedSquares.add(`${attackRow},${attackColRight}`);
    });

    // 2. Добавляем поля, ЗАНЯТЫЕ нашими пешками (для контроля занятием)
    myPawns.forEach(pawn => myAttackedSquares.add(`${pawn.row},${pawn.col}`)); // Или использовать отдельный Set? Пока добавим сюда.

    // 3. Проверяем контроль полей перед пешками противника
    opponentPawns.forEach(oppPawn => {
        const oppFrontRow = oppPawn.row + opponentDirection;
        const oppFrontCol = oppPawn.col;
        if (myAttackedSquares.has(`${oppFrontRow},${oppFrontCol}`)) {
            score += controlOpponentFrontBonus;
        }
    });

    // 4. Проверяем контроль полей на пред-предпоследней горизонтали
    for (let c = 0; c < 8; c++) {
        if (myAttackedSquares.has(`${promotionApproachRank},${c}`)) {
            score += controlPromotionApproachBonus;
            // Возможно, бонус стоит давать только если поле не атаковано врагом?
        }
    }

    // Можно добавить контроль других ключевых полей (например, центр доски на ранней стадии)

    return score;
}

/**
 * ФАКТОР: Гонка проходных
 * Оценка: Сравнивает "скорость" лучших проходных пешек обеих сторон.
 * Учитывает только те проходные, у которых путь действительно свободен.
 * Гиперпараметры: raceWinBonus, raceAdvantageMultiplier
 */
function evaluatePromotionRace(color, params = {}) {
    const { raceWinBonus = 300, raceAdvantageMultiplier = 50 } = params;

    const opponentColor = (color === 'w') ? 'b' : 'w';
    const board = game.board();

    // Находит лучшую (ближайшую к цели) проходную пешку с чистым путем
    const findBestRacer = (playerColor) => {
        const pawns = getPawns(playerColor);
        const playerDirection = (playerColor === 'w') ? -1 : 1;
        const playerPromotionRank = (playerColor === 'w') ? 0 : 7;
        let bestDistance = Infinity; // Ищем минимальное расстояние

        pawns.forEach(pawn => {
            // Быстрая проверка на проходную (без учета соседних вертикалей - упрощение!)
            let isPathClear = true;
            for (let r = pawn.row + playerDirection; isSafe(r, pawn.col); r += playerDirection) {
                if (getPiece(r, pawn.col, board)) {
                    isPathClear = false;
                    break;
                }
            }

            if (isPathClear) {
                // Проверка на блокировку врагом спереди (не проходная) - ДЛЯ УПРОЩЕНИЯ ПОКА ПРОПУСТИМ
                // Нужно еще проверить, что на соседних вертикалях впереди нет врагов - ПОКА ПРОПУСТИМ

                const distance = Math.abs(pawn.row - playerPromotionRank);
                if (distance < bestDistance) {
                    bestDistance = distance;
                }
            }
        });
        // Возвращаем количество ходов до превращения (0 - уже там, 1 - след. ход)
        return bestDistance;
    };

    const myBestDistance = findBestRacer(color);
    const opponentBestDistance = findBestRacer(opponentColor);

    // Если ни у кого нет явного "гонщика", фактор неактивен
    if (myBestDistance === Infinity && opponentBestDistance === Infinity) {
        return 0;
    }

    let score = 0;
    // Сравниваем количество ходов до цели
    if (myBestDistance <= opponentBestDistance) {
        // Мы выигрываем гонку или идем наравне (нужно поощрять)
        score += raceWinBonus;
        // Дополнительный бонус за разницу в дистанции
        if (opponentBestDistance !== Infinity) {
            score += (opponentBestDistance - myBestDistance) * raceAdvantageMultiplier;
        }
    } else {
        // Оппонент выигрывает гонку - штраф для нас (или бонус для него)
        // Здесь возвращаем 0, т.к. оценка для `color`. Негамакс сделает свое дело.
        // Или можно вернуть отрицательное значение:
        // score -= raceWinBonus;
        // score -= (myBestDistance - opponentBestDistance) * raceAdvantageMultiplier;
        // Оставим пока 0, чтобы не дублировать оценку противника.
    }


    // Уточнение: Если мой ход (game.turn() == color), и я на 1 ход ближе - это почти победа!
    if (game.turn() === color && myBestDistance === 1 && myBestDistance < opponentBestDistance) {
        score *= 1.5; // Увеличиваем бонус, если наш ход и мы в шаге от победы в гонке
    }


    return score;
}


/**
 * ФАКТОР: Пешечное большинство на фланге
 * Оценка: Бонус за наличие большего числа пешек на одном из флангов (ферзевый: a-c, центр: d-e, королевский: f-h).
 * Это создает потенциал для проходной в эндшпиле.
 * Гиперпараметры: majorityBonus, centerWeight
 */
function evaluatePawnMajority(color, params = {}) {
    const { majorityBonus = 20, centerWeight = 0.5 } = params; // Центральное большинство менее ценно (сложнее реализовать)

    const opponentColor = (color === 'w') ? 'b' : 'w';
    const myPawns = getPawns(color);
    const opponentPawns = getPawns(opponentColor);

    const countPawnsOnFlank = (pawns, minCol, maxCol) => {
        return pawns.filter(p => p.col >= minCol && p.col <= maxCol).length;
    };

    let score = 0;

    // Ферзевый фланг (a-c / 0-2)
    const myQueenSide = countPawnsOnFlank(myPawns, 0, 2);
    const oppQueenSide = countPawnsOnFlank(opponentPawns, 0, 2);
    if (myQueenSide > oppQueenSide) score += majorityBonus;

    // Центр (d-e / 3-4)
    const myCenter = countPawnsOnFlank(myPawns, 3, 4);
    const oppCenter = countPawnsOnFlank(opponentPawns, 3, 4);
    if (myCenter > oppCenter) score += majorityBonus * centerWeight;

    // Королевский фланг (f-h / 5-7)
    const myKingSide = countPawnsOnFlank(myPawns, 5, 7);
    const oppKingSide = countPawnsOnFlank(opponentPawns, 5, 7);
    if (myKingSide > oppKingSide) score += majorityBonus;

    return score;
}


module.exports = {
    EVALUATION_FACTORS,
}