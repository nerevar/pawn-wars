#!/bin/bash
# run_overnight.sh — Overnight weight search pipeline
# Usage: bash run_overnight.sh [workers]
# Example: bash run_overnight.sh 13    (Mac M4, 14 cores)
# Example: bash run_overnight.sh 31    (Ubuntu 32 cores)
#
# Pipeline:
#   Phase 1: Ablation — test each of 14 extra factors individually (~40 min)
#   Phase 2: CMA-ES — optimize all 19 factors together (~4-6 hours)
#   Phase 3: Validate best weights vs monolithic medium on depth 5 (~10 min)

set -e

WORKERS=${1:-$(( $(nproc 2>/dev/null || sysctl -n hw.ncpu) - 1 ))}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_NAME="overnight_${TIMESTAMP}"
DEPTH=4
GAMES_ABLATION=200
GAMES_CMAES=200
GAMES_VALIDATE=500
GENERATIONS=60

echo "========================================"
echo "Pawn Wars Overnight Weight Search"
echo "========================================"
echo "Workers:      ${WORKERS}"
echo "Run name:     ${RUN_NAME}"
echo "Depth:        ${DEPTH} (search), 5 (validation)"
echo "Games:        ${GAMES_ABLATION} (ablation), ${GAMES_CMAES} (CMA-ES), ${GAMES_VALIDATE} (validation)"
echo "Generations:  ${GENERATIONS}"
echo "Started:      $(date)"
echo "========================================"
echo ""

# -------------------------------------------------------------------
# Phase 1: Ablation — test each additional factor individually
# Baseline for comparison: mediumDecomposed (identical to medium eval)
# Candidate: mediumDecomposed weights + one extra factor at default weight
# -------------------------------------------------------------------
echo "========== PHASE 1: ABLATION =========="
echo ""

EXTRA_FACTORS=(
    passedPawns
    blockedPawns
    mobility
    connectedPawns
    defendedPawns
    opponentBlocked
    threatenedPawns
    isolatedPawns
    promotionRace
    pawnAdvancement
    pawnCount
    captureOpportunities
    freePath
    majority
)

BASELINE_WEIGHTS='{"mediumAdvancement":2.0,"mediumFreePath":0.7,"mediumAdjacentThreat":-0.8,"mediumCenterColumn":0.2,"mediumNextMoveSafety":2.0}'

# Get default weight for a factor from list-factors output
get_default_weight() {
    node -e "
        const { Chess } = require('./chess.js');
        globalThis.Chess = Chess;
        globalThis.game = new Chess();
        globalThis.gameMode = 'playerw';
        globalThis.aiColor = 'b';
        const g = require('./game.js');
        globalThis.getPawns = g.getPawns;
        globalThis.isFinished = g.isFinished;
        globalThis.getMoves = g.getMoves;
        globalThis.initializeGame = g.initializeGame;
        const s = require('./strategies.js');
        Object.keys(s).forEach(k => { globalThis[k] = s[k]; });
        const { FACTORS } = require('./factors.js');
        console.log(FACTORS['$1'].default);
    "
}

ABLATION_RESULTS=""
for FACTOR in "${EXTRA_FACTORS[@]}"; do
    DEFAULT_W=$(get_default_weight "$FACTOR")
    # Build weights JSON: baseline + this factor at default weight
    WEIGHTS=$(node -e "
        var w = ${BASELINE_WEIGHTS};
        w['${FACTOR}'] = ${DEFAULT_W};
        console.log(JSON.stringify(w));
    ")

    echo "--- Ablation: ${FACTOR} (weight=${DEFAULT_W}) ---"
    RESULT=$(node search_runner.js evaluate \
        --weights "${WEIGHTS}" \
        --base none \
        --depth ${DEPTH} \
        --baseline-depth ${DEPTH} \
        --baseline mediumDecomposed \
        --games ${GAMES_ABLATION} \
        --workers ${WORKERS} 2>&1)

    echo "${RESULT}"
    echo ""

    # Extract win rate
    WIN_RATE=$(echo "${RESULT}" | grep "Candidate:" | grep -oE '[0-9]+\.[0-9]+%' | head -1)
    ABLATION_RESULTS="${ABLATION_RESULTS}${FACTOR}(${DEFAULT_W}): ${WIN_RATE}\n"
done

echo ""
echo "========== ABLATION SUMMARY =========="
echo -e "${ABLATION_RESULTS}"
echo ""

# -------------------------------------------------------------------
# Phase 2: CMA-ES — optimize all 19 factors together
# Start from decomposed baseline weights + zeros for extras
# -------------------------------------------------------------------
echo "========== PHASE 2: CMA-ES =========="
echo ""

ALL_FACTORS="mediumAdvancement,mediumFreePath,mediumAdjacentThreat,mediumCenterColumn,mediumNextMoveSafety,passedPawns,blockedPawns,mobility,connectedPawns,defendedPawns,opponentBlocked,threatenedPawns,isolatedPawns,promotionRace"

node search_runner.js cmaes \
    --factors "${ALL_FACTORS}" \
    --depth ${DEPTH} \
    --baseline-depth ${DEPTH} \
    --baseline mediumDecomposed \
    --base none \
    --games ${GAMES_CMAES} \
    --generations ${GENERATIONS} \
    --workers ${WORKERS} \
    --run-name "${RUN_NAME}"

echo ""
echo "========== CMA-ES COMPLETE =========="
echo ""

# -------------------------------------------------------------------
# Phase 3: Show results
# -------------------------------------------------------------------
echo "========== RESULTS =========="
node search_runner.js results --run-name "${RUN_NAME}"

echo ""
echo "========== DONE =========="
echo "Finished: $(date)"
echo ""
echo "Next steps:"
echo "  1. Check results above"
echo "  2. Validate best weights vs monolithic medium depth 5:"
echo "     node search_runner.js evaluate --weights '<best_weights>' --base none --depth 5 --baseline-depth 5 --baseline medium --games ${GAMES_VALIDATE} --workers ${WORKERS}"
echo "  3. Also validate vs mediumDecomposed depth 5:"
echo "     node search_runner.js evaluate --weights '<best_weights>' --base none --depth 5 --baseline-depth 5 --baseline mediumDecomposed --games ${GAMES_VALIDATE} --workers ${WORKERS}"
