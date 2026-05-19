// search_runner.js — CLI entry point for weight search
// Usage:
//   node search_runner.js list-factors
//   node search_runner.js evaluate --weights '{"passedPawns":1.0}' --depth 4 --games 200
//   node search_runner.js coordinate --factors passedPawns --depth 4 --games 300
//   node search_runner.js cmaes --factors passedPawns,blockedPawns --depth 4 --games 200 --generations 50
//   node search_runner.js results --run-name exp1

const { WorkerPool } = require('./worker_pool.js');
const { CMAES, CoordinateDescent, getLogPath, appendLog, readLog, findLastGeneration } = require('./search.js');

// Load factors registry (needs globalThis bootstrap for existing factor functions)
const { Chess } = require('./chess.js');
globalThis.Chess = Chess;
const { getMoves, initializeGame, isFinished, getPawns } = require('./game.js');
globalThis.initializeGame = initializeGame;
globalThis.isFinished = isFinished;
globalThis.getMoves = getMoves;
globalThis.getPawns = getPawns;
const strategiesMod = require('./strategies.js');
globalThis.STRATEGIES = strategiesMod.STRATEGIES;
globalThis.checkGameEnd = strategiesMod.checkGameEnd;
globalThis.evaluateBoardMedium = strategiesMod.evaluateBoardMedium;
globalThis.evaluatePawnAdvancement = strategiesMod.evaluatePawnAdvancement;
globalThis.evaluatePawnCount = strategiesMod.evaluatePawnCount;
globalThis.evaluateCaptureOpportunities = strategiesMod.evaluateCaptureOpportunities;
globalThis.evaluateFreePath = strategiesMod.evaluateFreePath;
globalThis.evaluateMajority = strategiesMod.evaluateMajority;
globalThis.evaluateMediumAdvancement = strategiesMod.evaluateMediumAdvancement;
globalThis.evaluateMediumFreePath = strategiesMod.evaluateMediumFreePath;
globalThis.evaluateMediumAdjacentThreat = strategiesMod.evaluateMediumAdjacentThreat;
globalThis.evaluateMediumCenterColumn = strategiesMod.evaluateMediumCenterColumn;
globalThis.evaluateMediumNextMoveSafety = strategiesMod.evaluateMediumNextMoveSafety;
globalThis.game = new Chess();
globalThis.gameMode = 'playerw';
globalThis.aiColor = 'b';

const { FACTORS } = require('./factors.js');

// ============================================================
// CLI Argument Parser
// ============================================================

function parseArgs(argv) {
    var args = { _: [] };
    for (var i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) {
            var key = argv[i].slice(2);
            var next = argv[i + 1];
            if (next && !next.startsWith('--')) {
                args[key] = next;
                i++;
            } else {
                args[key] = true;
            }
        } else {
            args._.push(argv[i]);
        }
    }
    return args;
}

// ============================================================
// Commands
// ============================================================

async function cmdListFactors() {
    console.log('\nAvailable factors:');
    console.log('=' .repeat(70));
    for (var name in FACTORS) {
        var f = FACTORS[name];
        console.log('  ' + name.padEnd(25) + f.name.padEnd(25) +
            'range: [' + f.range[0] + ', ' + f.range[1] + ']  default: ' + f.default +
            '  level: ' + f.level);
    }
    console.log('');
}

function makeBaselineConfig(baselineName, depth) {
    return {
        strategyName: baselineName || 'mediumDecomposed',
        depth: depth,
    };
}

async function cmdEvaluate(args) {
    var weights = JSON.parse(args.weights || '{}');
    var depth = parseInt(args.depth) || 4;
    var baseEval = args.base || 'medium';
    var baselineDepth = parseInt(args['baseline-depth']) || depth;
    var games = parseInt(args.games) || 200;
    var workers = parseInt(args.workers) || undefined;

    var config1 = {
        name: 'candidate',
        depth: depth,
        baseEval: baseEval === 'none' ? null : baseEval,
        factors: weights,
    };

    var baselineName = args.baseline || 'mediumDecomposed';
    var config2 = makeBaselineConfig(baselineName, baselineDepth);

    console.log('\nEvaluating weights: ' + JSON.stringify(weights));
    console.log('Candidate: depth ' + depth + ', base: ' + baseEval);
    console.log('Baseline:  ' + baselineName + ' depth ' + baselineDepth);
    console.log('Games:     ' + games);
    console.log('');

    var pool = new WorkerPool(workers);
    try {
        var result = await pool.runTournament(config1, config2, games);
        printResult('Candidate', 'Baseline', result);
    } finally {
        pool.shutdown();
    }
}

async function cmdCoordinate(args) {
    var factorList = (args.factors || '').split(',').filter(Boolean);
    if (factorList.length === 0) {
        console.error('Error: --factors required');
        process.exit(1);
    }

    // Validate factors
    for (var i = 0; i < factorList.length; i++) {
        if (!FACTORS[factorList[i]]) {
            console.error('Unknown factor: ' + factorList[i]);
            process.exit(1);
        }
    }

    var depth = parseInt(args.depth) || 4;
    var baseEval = args.base || 'medium';
    var baselineDepth = parseInt(args['baseline-depth']) || depth;
    var games = parseInt(args.games) || 300;
    var step = parseFloat(args.step) || 0.2;
    var workers = parseInt(args.workers) || undefined;
    var runName = args['run-name'] || 'coord-' + factorList.join('-');

    var logPath = getLogPath(runName);
    var pool = new WorkerPool(workers);

    var cd = new CoordinateDescent({
        factorNames: factorList,
        factorRanges: factorList.map(function(n) { return FACTORS[n].range; }),
        step: step,
    });

    // Initial weights: defaults
    var currentWeights = factorList.map(function(n) { return FACTORS[n].default; });

    // Check for resume
    var existingLog = readLog(logPath);
    var completedEvals = {};
    for (var i = 0; i < existingLog.length; i++) {
        if (existingLog[i].type === 'eval') {
            completedEvals[JSON.stringify(existingLog[i].weights)] = existingLog[i];
        }
        if (existingLog[i].type === 'best-coordinate') {
            // Restore state from last completed coordinate
            currentWeights = factorList.map(function(n) { return existingLog[i].weights[n] || 0; });
        }
    }

    if (existingLog.length === 0) {
        appendLog(logPath, {
            type: 'config',
            algorithm: 'coordinate',
            factors: factorList,
            depth: depth,
            baseEval: baseEval,
            baselineDepth: baselineDepth,
            games: games,
            step: step,
            timestamp: new Date().toISOString(),
        });
    }

    console.log('\nCoordinate Descent');
    console.log('Factors: ' + factorList.join(', '));
    console.log('Depth: ' + depth + ' | Baseline depth: ' + baselineDepth + ' | Games: ' + games + ' | Step: ' + step);
    console.log('Log: ' + logPath);
    console.log('');

    var baselineName = args.baseline || 'mediumDecomposed';
    var baselineConfig = makeBaselineConfig(baselineName, baselineDepth);

    try {
        for (var sweep = 0; sweep < cd.sweeps; sweep++) {
            console.log('--- Sweep ' + (sweep + 1) + '/' + cd.sweeps + ' ---');

            for (var fi = 0; fi < factorList.length; fi++) {
                var fname = factorList[fi];
                var points = cd.getPoints(fi, currentWeights);
                var bestWinRate = -1;
                var bestWeight = currentWeights[fi];

                console.log('\n  Factor: ' + fname + ' (range ' + FACTORS[fname].range.join('-') + ', step ' + step + ')');

                for (var pi = 0; pi < points.length; pi++) {
                    var w = points[pi][fi];
                    var weightsObj = {};
                    for (var k = 0; k < factorList.length; k++) {
                        weightsObj[factorList[k]] = points[pi][k];
                    }

                    // Check if already evaluated
                    var cacheKey = JSON.stringify(weightsObj);
                    var cached = completedEvals[cacheKey];

                    var winRate;
                    if (cached) {
                        winRate = cached.winRate;
                        process.stdout.write('    w=' + w.toFixed(2) + ': ' +
                            (winRate * 100).toFixed(1) + '% (cached)\n');
                    } else {
                        var config = {
                            name: 'coord-' + fname + '-' + w.toFixed(2),
                            depth: depth,
                            baseEval: baseEval === 'none' ? null : baseEval,
                            factors: weightsObj,
                        };

                        var result = await pool.runTournament(config, baselineConfig, games);
                        winRate = result.winRate;

                        var evalEntry = {
                            type: 'eval',
                            sweep: sweep,
                            factor: fname,
                            weights: weightsObj,
                            winRate: winRate,
                            s1Wins: result.s1Wins,
                            s2Wins: result.s2Wins,
                            pValue: result.pValue,
                            elapsed: result.elapsed,
                            timestamp: new Date().toISOString(),
                        };
                        appendLog(logPath, evalEntry);
                        completedEvals[cacheKey] = evalEntry;

                        var sig = result.significant ? ' *' : '';
                        process.stdout.write('    w=' + w.toFixed(2) + ': ' +
                            (winRate * 100).toFixed(1) + '% (' + result.s1Wins + '/' + result.totalGames + ')' +
                            ' p=' + result.pValue.toFixed(4) + sig + '\n');
                    }

                    if (winRate > bestWinRate) {
                        bestWinRate = winRate;
                        bestWeight = w;
                    }
                }

                currentWeights[fi] = bestWeight;
                console.log('  => Best weight for ' + fname + ': ' + bestWeight.toFixed(2) +
                    ' (win rate: ' + (bestWinRate * 100).toFixed(1) + '%)');

                var bestWeightsObj = {};
                for (var k = 0; k < factorList.length; k++) {
                    bestWeightsObj[factorList[k]] = currentWeights[k];
                }
                appendLog(logPath, {
                    type: 'best-coordinate',
                    sweep: sweep,
                    factor: fname,
                    weights: bestWeightsObj,
                    winRate: bestWinRate,
                    timestamp: new Date().toISOString(),
                });
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('Coordinate Descent Complete');
        console.log('Best weights:');
        for (var k = 0; k < factorList.length; k++) {
            console.log('  ' + factorList[k] + ': ' + currentWeights[k].toFixed(2));
        }
    } finally {
        pool.shutdown();
    }
}

async function cmdCMAES(args) {
    var factorList = (args.factors || '').split(',').filter(Boolean);
    if (factorList.length === 0) {
        console.error('Error: --factors required');
        process.exit(1);
    }

    for (var i = 0; i < factorList.length; i++) {
        if (!FACTORS[factorList[i]]) {
            console.error('Unknown factor: ' + factorList[i]);
            process.exit(1);
        }
    }

    var depth = parseInt(args.depth) || 4;
    var baseEval = args.base || 'medium';
    var baselineDepth = parseInt(args['baseline-depth']) || depth;
    var games = parseInt(args.games) || 200;
    var maxGenerations = parseInt(args.generations) || 50;
    var workers = parseInt(args.workers) || undefined;
    var runName = args['run-name'] || 'cmaes-' + factorList.length + 'f';
    var resume = args.resume === true || args.resume === 'true';

    var logPath = getLogPath(runName);
    var pool = new WorkerPool(workers);

    var cmaesOptions = {
        factorNames: factorList,
        factorRanges: factorList.map(function(n) { return FACTORS[n].range; }),
    };

    // Resume logic
    if (resume) {
        var existingLog = readLog(logPath);
        var lastGen = findLastGeneration(existingLog);
        if (lastGen && lastGen.state) {
            console.log('Resuming from generation ' + lastGen.gen + '...');
            cmaesOptions.startGeneration = lastGen.gen + 1;
            // State will be restored after construction
        }
    }

    var cmaes = new CMAES(cmaesOptions);

    // Restore state if resuming
    if (resume) {
        var existingLog2 = readLog(logPath);
        var lastGen2 = findLastGeneration(existingLog2);
        if (lastGen2 && lastGen2.state) {
            cmaes.restoreState(lastGen2.state);
        }
    }

    // Log config if new run
    if (cmaes.generation === 0) {
        appendLog(logPath, {
            type: 'config',
            algorithm: 'cmaes',
            factors: factorList,
            depth: depth,
            baseEval: baseEval,
            baselineDepth: baselineDepth,
            games: games,
            maxGenerations: maxGenerations,
            lambda: cmaes.lambda,
            mu: cmaes.mu,
            sigma: cmaes.sigma,
            timestamp: new Date().toISOString(),
        });
    }

    var baselineName = args.baseline || 'mediumDecomposed';
    var baselineConfig = makeBaselineConfig(baselineName, baselineDepth);

    console.log('\nCMA-ES Weight Search');
    console.log('Factors:     ' + factorList.join(', '));
    console.log('Depth:       ' + depth + ' | Baseline depth: ' + baselineDepth);
    console.log('Games/eval:  ' + games);
    console.log('Lambda:      ' + cmaes.lambda + ' | Mu: ' + cmaes.mu);
    console.log('Generations: ' + maxGenerations);
    console.log('Workers:     ' + (workers || 'auto'));
    console.log('Log:         ' + logPath);
    console.log('');

    try {
        while (cmaes.generation < maxGenerations) {
            var genStart = performance.now();
            var gen = cmaes.generation;

            // Sample population
            var candidates = cmaes.samplePopulation();
            var fitnessValues = [];

            console.log('Generation ' + gen + '/' + maxGenerations +
                ' (sigma=' + cmaes.sigma.toFixed(4) + ')');

            // Evaluate each candidate
            for (var ci = 0; ci < candidates.length; ci++) {
                var config = cmaes.weightsToConfig(candidates[ci], depth,
                    baseEval === 'none' ? null : baseEval);

                var result = await pool.runTournament(config, baselineConfig, games);
                fitnessValues.push(result.winRate);

                // Log each evaluation
                var weightsObj = {};
                for (var k = 0; k < factorList.length; k++) {
                    weightsObj[factorList[k]] = Math.round(candidates[ci][k] * 1000) / 1000;
                }

                appendLog(logPath, {
                    type: 'eval',
                    gen: gen,
                    idx: ci,
                    weights: weightsObj,
                    winRate: result.winRate,
                    s1Wins: result.s1Wins,
                    s2Wins: result.s2Wins,
                    pValue: result.pValue,
                    elapsed: result.elapsed,
                    timestamp: new Date().toISOString(),
                });

                var sig = result.significant ? '*' : ' ';
                process.stdout.write('  [' + (ci + 1) + '/' + candidates.length + '] ' +
                    (result.winRate * 100).toFixed(1) + '%' + sig + '  ');

                // Print weights compactly
                var parts = [];
                for (var fname in weightsObj) {
                    parts.push(fname.slice(0, 8) + '=' + weightsObj[fname]);
                }
                process.stdout.write(parts.join(' ') + '\n');
            }

            // Update CMA-ES
            var updateResult = cmaes.update(candidates, fitnessValues);
            var genElapsed = (performance.now() - genStart) / 1000;

            // Log generation
            var genMeanObj = {};
            for (var k = 0; k < factorList.length; k++) {
                genMeanObj[factorList[k]] = Math.round(cmaes.mean[k] * 1000) / 1000;
            }
            var bestWeightsObj = {};
            if (cmaes.bestEver) {
                for (var k = 0; k < factorList.length; k++) {
                    bestWeightsObj[factorList[k]] = Math.round(cmaes.bestEver[k] * 1000) / 1000;
                }
            }

            appendLog(logPath, {
                type: 'generation',
                gen: gen,
                bestFitness: updateResult.bestFitness,
                bestWeights: bestWeightsObj,
                mean: genMeanObj,
                sigma: cmaes.sigma,
                bestEverFitness: cmaes.bestEverFitness,
                bestEverWeights: bestWeightsObj,
                elapsed: genElapsed,
                state: cmaes.getState(), // for resume
                timestamp: new Date().toISOString(),
            });

            console.log('  => Gen ' + gen + ' best: ' + (updateResult.bestFitness * 100).toFixed(1) +
                '% | ever: ' + (cmaes.bestEverFitness * 100).toFixed(1) +
                '% | sigma: ' + cmaes.sigma.toFixed(4) +
                ' | time: ' + genElapsed.toFixed(1) + 's');
            console.log('  => Mean: ' + JSON.stringify(genMeanObj));
            console.log('');

            // Early stopping if sigma is very small
            if (cmaes.sigma < 0.001) {
                console.log('Converged (sigma < 0.001). Stopping.');
                break;
            }
        }

        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('CMA-ES Complete');
        console.log('Best ever win rate: ' + (cmaes.bestEverFitness * 100).toFixed(1) + '%');
        if (cmaes.bestEver) {
            console.log('Best weights:');
            for (var k = 0; k < factorList.length; k++) {
                console.log('  ' + factorList[k] + ': ' + cmaes.bestEver[k].toFixed(3));
            }
        }
        console.log('\nTo validate with longer tournament:');
        var validateWeights = {};
        if (cmaes.bestEver) {
            for (var k = 0; k < factorList.length; k++) {
                validateWeights[factorList[k]] = Math.round(cmaes.bestEver[k] * 1000) / 1000;
            }
        }
        console.log('  node search_runner.js evaluate --weights \'' +
            JSON.stringify(validateWeights) +
            '\' --depth 5 --baseline-depth 5 --games 500');

    } finally {
        pool.shutdown();
    }
}

async function cmdResults(args) {
    var runName = args['run-name'];
    if (!runName) {
        console.error('Error: --run-name required');
        // List available logs
        var fs = require('fs');
        var path = require('path');
        var dir = path.join(__dirname, 'search_log');
        if (fs.existsSync(dir)) {
            var files = fs.readdirSync(dir).filter(function(f) { return f.endsWith('.jsonl'); });
            if (files.length > 0) {
                console.log('\nAvailable logs:');
                files.forEach(function(f) { console.log('  ' + f); });
            }
        }
        process.exit(1);
    }

    var logPath = getLogPath(runName);
    var entries = readLog(logPath);

    if (entries.length === 0) {
        console.log('No entries found in ' + logPath);
        return;
    }

    // Find config
    var config = entries.find(function(e) { return e.type === 'config'; });
    if (config) {
        console.log('\nSearch: ' + config.algorithm);
        console.log('Factors: ' + (config.factors || []).join(', '));
        console.log('Depth: ' + config.depth + ' | Baseline depth: ' + (config.baselineDepth || config.depth));
        console.log('Games/eval: ' + config.games);
    }

    // Show generation progression
    var generations = entries.filter(function(e) { return e.type === 'generation'; });
    if (generations.length > 0) {
        console.log('\nGeneration progression:');
        generations.forEach(function(g) {
            console.log('  Gen ' + g.gen + ': best=' + (g.bestFitness * 100).toFixed(1) +
                '% ever=' + ((g.bestEverFitness || g.bestFitness) * 100).toFixed(1) +
                '% sigma=' + (g.sigma || 0).toFixed(4));
        });
    }

    // Show best coordinate results
    var bestCoords = entries.filter(function(e) { return e.type === 'best-coordinate'; });
    if (bestCoords.length > 0) {
        console.log('\nCoordinate descent results:');
        bestCoords.forEach(function(bc) {
            console.log('  ' + bc.factor + ': ' + JSON.stringify(bc.weights) +
                ' -> ' + (bc.winRate * 100).toFixed(1) + '%');
        });
    }

    // Find overall best
    var evals = entries.filter(function(e) { return e.type === 'eval'; });
    if (evals.length > 0) {
        var best = evals.reduce(function(a, b) { return a.winRate > b.winRate ? a : b; });
        console.log('\nBest evaluation:');
        console.log('  Win rate: ' + (best.winRate * 100).toFixed(1) + '%');
        console.log('  Weights:  ' + JSON.stringify(best.weights));
        console.log('  p-value:  ' + (best.pValue || 0).toFixed(6));
    }

    console.log('\nTotal evaluations: ' + evals.length);
    console.log('');
}

// ============================================================
// Helpers
// ============================================================

function printResult(name1, name2, result) {
    console.log('\nTournament Results (' + result.totalGames + ' games)');
    console.log('='.repeat(50));
    console.log(name1 + ':  ' + result.s1Wins + ' wins (' + (result.s1Wins / result.totalGames * 100).toFixed(1) + '%)');
    console.log(name2 + ':  ' + result.s2Wins + ' wins (' + (result.s2Wins / result.totalGames * 100).toFixed(1) + '%)');
    console.log('');
    console.log('Difference:    ' + ((result.winRate - 0.5) * 100).toFixed(1) + '% for ' +
        (result.winRate >= 0.5 ? name1 : name2));
    console.log('95% CI:        ' + result.ci.map(function(v) { return (v * 100).toFixed(1) + '%'; }).join(' - '));
    console.log('p-value:       ' + result.pValue.toExponential(3));
    console.log('Significant:   ' + (result.significant ? 'Yes' : 'No'));
    console.log('Time:          ' + result.elapsed.toFixed(2) + 's (' +
        (result.elapsed / result.totalGames * 1000).toFixed(1) + ' ms/game)');
    console.log('');
}

function printUsage() {
    console.log('\nPawn Wars Weight Search Runner\n');
    console.log('Commands:');
    console.log('  list-factors                         List all available factors');
    console.log('  evaluate   --weights JSON [options]  Evaluate specific weights vs baseline');
    console.log('  coordinate --factors LIST [options]  Coordinate descent search');
    console.log('  cmaes      --factors LIST [options]  CMA-ES weight optimization');
    console.log('  results    --run-name NAME           Show search results');
    console.log('');
    console.log('Common options:');
    console.log('  --depth N           Search depth for candidate (default: 4)');
    console.log('  --baseline-depth N  Search depth for baseline (default: same as --depth)');
    console.log('  --base medium|none  Base evaluation (default: medium)');
    console.log('  --games N           Games per evaluation (default: 200)');
    console.log('  --workers N         Number of worker threads (default: cpu_count - 1)');
    console.log('  --run-name NAME     Name for log file (for resume)');
    console.log('  --resume            Resume from last checkpoint');
    console.log('');
    console.log('CMA-ES options:');
    console.log('  --generations N     Max generations (default: 50)');
    console.log('');
    console.log('Coordinate descent options:');
    console.log('  --step N            Weight step size (default: 0.2)');
    console.log('');
    console.log('Examples:');
    console.log('  node search_runner.js list-factors');
    console.log('  node search_runner.js evaluate --weights \'{"passedPawns":1.0}\' --games 200');
    console.log('  node search_runner.js coordinate --factors passedPawns --games 300');
    console.log('  node search_runner.js cmaes --factors passedPawns,blockedPawns,mobility \\');
    console.log('    --depth 4 --games 200 --generations 50 --run-name exp1');
    console.log('  node search_runner.js cmaes --factors passedPawns,blockedPawns \\');
    console.log('    --run-name exp1 --resume');
    console.log('');
}

// ============================================================
// Main
// ============================================================

async function main() {
    var argv = process.argv.slice(2);
    var command = argv[0];
    var args = parseArgs(argv.slice(1));

    if (!command || command === 'help' || command === '--help') {
        printUsage();
        return;
    }

    switch (command) {
        case 'list-factors':
            await cmdListFactors();
            break;
        case 'evaluate':
            await cmdEvaluate(args);
            break;
        case 'coordinate':
            await cmdCoordinate(args);
            break;
        case 'cmaes':
            await cmdCMAES(args);
            break;
        case 'results':
            await cmdResults(args);
            break;
        default:
            console.error('Unknown command: ' + command);
            printUsage();
            process.exit(1);
    }
}

main().catch(function(err) {
    console.error('Error:', err);
    process.exit(1);
});
