// worker_pool.js — Worker pool for parallel tournament execution
const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');

class WorkerPool {
    constructor(numWorkers) {
        this.numWorkers = numWorkers || Math.max(1, os.cpus().length - 1);
        this.workers = [];
        this.ready = [];
        this._initialized = false;
    }

    async init() {
        if (this._initialized) return;
        var workerPath = path.join(__dirname, 'game_worker.js');
        var promises = [];

        for (var i = 0; i < this.numWorkers; i++) {
            var worker = new Worker(workerPath);
            this.workers.push(worker);
            promises.push(new Promise(function(resolve, reject) {
                worker.once('message', function(msg) {
                    if (msg.type === 'ready') resolve();
                });
                worker.once('error', reject);
            }));
        }

        await Promise.all(promises);
        this._initialized = true;
    }

    // Run a tournament: config1 vs config2, totalGames games
    // Returns: { s1Wins, s2Wins, winRate, pValue, elapsed }
    async runTournament(config1, config2, totalGames) {
        await this.init();

        var t1 = performance.now();

        // Split games: half with config1 as white, half with config1 as black
        var halfGames = Math.floor(totalGames / 2);
        var otherHalf = totalGames - halfGames;

        // Create batches
        var batches = [];
        var batchId = 0;

        // First half: config1=white, config2=black
        var remaining1 = halfGames;
        var perWorker1 = Math.ceil(halfGames / this.numWorkers);
        for (var i = 0; i < this.numWorkers && remaining1 > 0; i++) {
            var n = Math.min(perWorker1, remaining1);
            batches.push({
                batchId: batchId++,
                strategy1Config: config1,
                strategy2Config: config2,
                numGames: n,
                config1IsWhite: true,
            });
            remaining1 -= n;
        }

        // Second half: config2=white, config1=black (swap sides)
        var remaining2 = otherHalf;
        var perWorker2 = Math.ceil(otherHalf / this.numWorkers);
        for (var i = 0; i < this.numWorkers && remaining2 > 0; i++) {
            var n = Math.min(perWorker2, remaining2);
            batches.push({
                batchId: batchId++,
                strategy1Config: config2,  // swapped
                strategy2Config: config1,  // swapped
                numGames: n,
                config1IsWhite: false,
            });
            remaining2 -= n;
        }

        // Dispatch batches to workers round-robin
        var results = await this._dispatchBatches(batches);

        // Aggregate results
        var s1Wins = 0;
        var s2Wins = 0;

        for (var i = 0; i < results.length; i++) {
            var batch = batches[i];
            var gameResults = results[i].results;

            for (var j = 0; j < gameResults.length; j++) {
                var res = gameResults[j];
                if (!res) continue;

                if (batch.config1IsWhite) {
                    // config1 was white in this batch
                    if (res.includes('w')) s1Wins++;
                    else s2Wins++;
                } else {
                    // config1 was black in this batch (sides swapped)
                    if (res.includes('b')) s1Wins++;
                    else s2Wins++;
                }
            }
        }

        var t2 = performance.now();
        var elapsed = (t2 - t1) / 1000;

        // Z-test statistics
        var N = s1Wins + s2Wins;
        var p = N > 0 ? s1Wins / N : 0.5;
        var z = N > 0 ? (p - 0.5) / Math.sqrt(0.25 / N) : 0;
        var pValue = 2 * (1 - cumulativeStdNormal(Math.abs(z)));

        var zCrit = zScore(0.975); // 95% CI
        var margin = N > 0 ? zCrit * Math.sqrt(p * (1 - p) / N) : 0;

        return {
            s1Wins: s1Wins,
            s2Wins: s2Wins,
            totalGames: N,
            winRate: p,
            pValue: pValue,
            ci: [p - margin, p + margin],
            significant: pValue < 0.05,
            elapsed: elapsed,
        };
    }

    async _dispatchBatches(batches) {
        var self = this;
        var results = new Array(batches.length);
        var pending = batches.slice(); // copy
        var batchIndexMap = {};
        for (var i = 0; i < batches.length; i++) {
            batchIndexMap[batches[i].batchId] = i;
        }

        return new Promise(function(resolve, reject) {
            var completed = 0;

            function assignWork(workerIdx) {
                if (pending.length === 0) return;
                var batch = pending.shift();
                var worker = self.workers[workerIdx];

                function onMessage(msg) {
                    if (msg.type === 'result' && msg.batchId === batch.batchId) {
                        worker.removeListener('message', onMessage);
                        results[batchIndexMap[msg.batchId]] = msg;
                        completed++;

                        if (completed === batches.length) {
                            resolve(results);
                        } else {
                            assignWork(workerIdx);
                        }
                    }
                }

                worker.on('message', onMessage);
                worker.postMessage({
                    type: 'run',
                    batchId: batch.batchId,
                    strategy1Config: batch.strategy1Config,
                    strategy2Config: batch.strategy2Config,
                    numGames: batch.numGames,
                });
            }

            // Start all workers
            for (var w = 0; w < self.numWorkers; w++) {
                assignWork(w);
            }

            // Handle edge case: no batches
            if (batches.length === 0) resolve(results);
        });
    }

    shutdown() {
        for (var i = 0; i < this.workers.length; i++) {
            this.workers[i].postMessage({ type: 'exit' });
        }
        this.workers = [];
        this._initialized = false;
    }
}

// --- Statistical helpers (duplicated from run_ai.js to avoid modifying it) ---

function cumulativeStdNormal(z) {
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989423 * Math.exp(-z * z / 2);
    var prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - prob : prob;
}

function zScore(p) {
    if (p < 0.5) return -zScore(1 - p);
    var a = [2.515517, 0.802853, 0.010328];
    var b = [1.432788, 0.189269, 0.001308];
    var t = Math.sqrt(-2 * Math.log(1 - p));
    return t - (a[0] + a[1] * t + a[2] * t * t) / (1 + b[0] * t + b[1] * t * t + b[2] * t * t * t);
}

module.exports = { WorkerPool };
