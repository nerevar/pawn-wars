// parametric_strategy.js — Builds strategy objects from JSON config
// Config is plain JSON (serializable for worker_threads)

function buildStrategy(config, FACTORS) {
    var factorEntries = [];
    for (var name in config.factors) {
        if (!FACTORS[name]) {
            throw new Error('Unknown factor: ' + name + '. Available: ' + Object.keys(FACTORS).join(', '));
        }
        factorEntries.push({ name: name, weight: config.factors[name], fn: FACTORS[name].fn });
    }

    return {
        name: config.name || 'parametric',
        depth: config.depth || 4,
        evaluate: function(path) {
            var terminal = checkGameEnd(isFinished(), path);
            if (terminal !== null) return terminal;

            var score = 0;
            if (config.baseEval === 'medium') {
                score = evaluateBoardMedium(path);
                if (Math.abs(score) > 50000) return score; // game-end from base eval
            }

            for (var i = 0; i < factorEntries.length; i++) {
                var entry = factorEntries[i];
                score += entry.weight * (entry.fn('w') - entry.fn('b'));
            }

            return score;
        }
    };
}

// Build a baseline strategy config (medium at given depth)
function baselineConfig(depth) {
    return {
        name: 'medium-d' + depth,
        depth: depth,
        baseEval: 'medium',
        factors: {},
    };
}

module.exports = { buildStrategy, baselineConfig };
