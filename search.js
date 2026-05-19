// search.js — Weight search algorithms (CMA-ES, coordinate descent)
// No npm dependencies — pure JS implementations

const fs = require('fs');
const path = require('path');

// ============================================================
// CMA-ES (Covariance Matrix Adaptation Evolution Strategy)
// ============================================================

class CMAES {
    constructor(options) {
        this.factorNames = options.factorNames;     // ['passedPawns', 'blockedPawns', ...]
        this.factorRanges = options.factorRanges;   // [[0,5], [0,3], ...]
        this.N = this.factorNames.length;           // dimension

        // CMA-ES parameters
        this.lambda = options.lambda || (4 + Math.floor(3 * Math.log(this.N))); // population size
        this.mu = Math.floor(this.lambda / 2);      // number of parents

        // Recombination weights
        this.weights = [];
        var wSum = 0;
        for (var i = 0; i < this.mu; i++) {
            this.weights.push(Math.log(this.mu + 0.5) - Math.log(i + 1));
            wSum += this.weights[i];
        }
        for (var i = 0; i < this.mu; i++) this.weights[i] /= wSum;

        this.muEff = 1 / this.weights.reduce(function(s, w) { return s + w * w; }, 0);

        // Adaptation parameters
        this.cc = (4 + this.muEff / this.N) / (this.N + 4 + 2 * this.muEff / this.N);
        this.cs = (this.muEff + 2) / (this.N + this.muEff + 5);
        this.c1 = 2 / ((this.N + 1.3) * (this.N + 1.3) + this.muEff);
        this.cmu = Math.min(1 - this.c1, 2 * (this.muEff - 2 + 1 / this.muEff) / ((this.N + 2) * (this.N + 2) + this.muEff));
        this.damps = 1 + 2 * Math.max(0, Math.sqrt((this.muEff - 1) / (this.N + 1)) - 1) + this.cs;
        this.chiN = Math.sqrt(this.N) * (1 - 1 / (4 * this.N) + 1 / (21 * this.N * this.N));

        // State variables
        this.mean = options.initialMean || this._defaultMean();
        this.sigma = options.sigma || 0.3;
        this.C = options.C || identity(this.N);
        this.pc = zeros(this.N);
        this.ps = zeros(this.N);
        this.generation = options.startGeneration || 0;

        this.bestEver = null;
        this.bestEverFitness = -Infinity;
    }

    _defaultMean() {
        var mean = [];
        for (var i = 0; i < this.N; i++) {
            var r = this.factorRanges[i];
            mean.push((r[0] + r[1]) / 2);
        }
        return mean;
    }

    // Sample lambda candidates
    samplePopulation() {
        var sqrtC = choleskyDecomposition(this.C);
        var candidates = [];

        for (var i = 0; i < this.lambda; i++) {
            var z = randomNormalVector(this.N);
            var x = matVecMul(sqrtC, z);
            var candidate = [];
            for (var j = 0; j < this.N; j++) {
                var val = this.mean[j] + this.sigma * x[j];
                // Clamp to range
                val = Math.max(this.factorRanges[j][0], Math.min(this.factorRanges[j][1], val));
                candidate.push(val);
            }
            candidates.push(candidate);
        }

        return candidates;
    }

    // Convert weight vector to config object
    weightsToConfig(weights, depth, baseEval) {
        var factors = {};
        for (var i = 0; i < this.N; i++) {
            factors[this.factorNames[i]] = weights[i];
        }
        return {
            name: 'cmaes-gen' + this.generation,
            depth: depth,
            baseEval: baseEval,
            factors: factors,
        };
    }

    // Update CMA-ES state after evaluating population
    // fitnessValues[i] = fitness of candidate[i] (higher = better)
    update(candidates, fitnessValues) {
        // Sort by fitness (descending)
        var indexed = [];
        for (var i = 0; i < candidates.length; i++) {
            indexed.push({ idx: i, fitness: fitnessValues[i], x: candidates[i] });
        }
        indexed.sort(function(a, b) { return b.fitness - a.fitness; });

        // Track best ever
        if (indexed[0].fitness > this.bestEverFitness) {
            this.bestEverFitness = indexed[0].fitness;
            this.bestEver = indexed[0].x.slice();
        }

        // Compute new mean
        var oldMean = this.mean.slice();
        var newMean = zeros(this.N);
        for (var i = 0; i < this.mu; i++) {
            for (var j = 0; j < this.N; j++) {
                newMean[j] += this.weights[i] * indexed[i].x[j];
            }
        }
        this.mean = newMean;

        // Compute mean displacement
        var meanDiff = [];
        for (var j = 0; j < this.N; j++) {
            meanDiff.push((newMean[j] - oldMean[j]) / this.sigma);
        }

        // Inverse of sqrt(C) approximation (use C^(-1/2) via Cholesky)
        var invSqrtC = invertLowerTriangular(choleskyDecomposition(this.C));
        var invsC_meanDiff = matVecMul(invSqrtC, meanDiff);

        // Update evolution paths
        var hsig;
        for (var j = 0; j < this.N; j++) {
            this.ps[j] = (1 - this.cs) * this.ps[j] + Math.sqrt(this.cs * (2 - this.cs) * this.muEff) * invsC_meanDiff[j];
        }

        var psNorm = vecNorm(this.ps);
        var expectedNorm = this.chiN;
        hsig = (psNorm / Math.sqrt(1 - Math.pow(1 - this.cs, 2 * (this.generation + 1)))) < (1.4 + 2 / (this.N + 1)) * expectedNorm ? 1 : 0;

        for (var j = 0; j < this.N; j++) {
            this.pc[j] = (1 - this.cc) * this.pc[j] + hsig * Math.sqrt(this.cc * (2 - this.cc) * this.muEff) * meanDiff[j];
        }

        // Update covariance matrix
        var rank1 = outerProduct(this.pc, this.pc);
        var rankMu = zeroMatrix(this.N);
        for (var i = 0; i < this.mu; i++) {
            var diff = [];
            for (var j = 0; j < this.N; j++) {
                diff.push((indexed[i].x[j] - oldMean[j]) / this.sigma);
            }
            var outer = outerProduct(diff, diff);
            for (var r = 0; r < this.N; r++) {
                for (var c = 0; c < this.N; c++) {
                    rankMu[r][c] += this.weights[i] * outer[r][c];
                }
            }
        }

        var deltaHsig = (1 - hsig) * this.cc * (2 - this.cc);
        for (var r = 0; r < this.N; r++) {
            for (var c = 0; c < this.N; c++) {
                this.C[r][c] = (1 + this.c1 * deltaHsig - this.c1 - this.cmu) * this.C[r][c]
                    + this.c1 * rank1[r][c]
                    + this.cmu * rankMu[r][c];
            }
        }

        // Update step size
        this.sigma *= Math.exp((this.cs / this.damps) * (psNorm / this.chiN - 1));

        this.generation++;

        return {
            bestCandidate: indexed[0].x,
            bestFitness: indexed[0].fitness,
            mean: this.mean.slice(),
            sigma: this.sigma,
        };
    }

    // Serialize state for resume
    getState() {
        return {
            mean: this.mean,
            sigma: this.sigma,
            C: this.C,
            pc: this.pc,
            ps: this.ps,
            generation: this.generation,
            bestEver: this.bestEver,
            bestEverFitness: this.bestEverFitness,
        };
    }

    // Restore state from log
    restoreState(state) {
        this.mean = state.mean;
        this.sigma = state.sigma;
        this.C = state.C;
        this.pc = state.pc || zeros(this.N);
        this.ps = state.ps || zeros(this.N);
        this.generation = state.generation;
        this.bestEver = state.bestEver || null;
        this.bestEverFitness = state.bestEverFitness || -Infinity;
    }
}

// ============================================================
// Coordinate Descent
// ============================================================

class CoordinateDescent {
    constructor(options) {
        this.factorNames = options.factorNames;
        this.factorRanges = options.factorRanges;
        this.step = options.step || 0.2;
        this.sweeps = options.sweeps || 2;
    }

    // Generate all evaluation points for one factor
    getPoints(factorIdx, currentWeights) {
        var range = this.factorRanges[factorIdx];
        var points = [];
        for (var w = range[0]; w <= range[1] + 0.001; w += this.step) {
            var weights = currentWeights.slice();
            weights[factorIdx] = Math.round(w * 100) / 100; // avoid float noise
            points.push(weights);
        }
        return points;
    }

    // Convert weight vector to config
    weightsToConfig(weights, factorNames, depth, baseEval) {
        var factors = {};
        for (var i = 0; i < factorNames.length; i++) {
            factors[factorNames[i]] = weights[i];
        }
        return {
            name: 'coord-search',
            depth: depth,
            baseEval: baseEval,
            factors: factors,
        };
    }
}

// ============================================================
// Linear algebra helpers (no dependencies)
// ============================================================

function zeros(n) {
    var v = [];
    for (var i = 0; i < n; i++) v.push(0);
    return v;
}

function identity(n) {
    var m = [];
    for (var i = 0; i < n; i++) {
        m.push([]);
        for (var j = 0; j < n; j++) {
            m[i].push(i === j ? 1 : 0);
        }
    }
    return m;
}

function zeroMatrix(n) {
    var m = [];
    for (var i = 0; i < n; i++) {
        m.push(zeros(n));
    }
    return m;
}

function outerProduct(a, b) {
    var n = a.length;
    var m = [];
    for (var i = 0; i < n; i++) {
        m.push([]);
        for (var j = 0; j < n; j++) {
            m[i].push(a[i] * b[j]);
        }
    }
    return m;
}

function matVecMul(M, v) {
    var n = v.length;
    var result = zeros(n);
    for (var i = 0; i < n; i++) {
        for (var j = 0; j < n; j++) {
            result[i] += M[i][j] * v[j];
        }
    }
    return result;
}

function vecNorm(v) {
    var s = 0;
    for (var i = 0; i < v.length; i++) s += v[i] * v[i];
    return Math.sqrt(s);
}

function randomNormalVector(n) {
    var v = [];
    for (var i = 0; i < n; i++) {
        // Box-Muller transform
        var u1 = Math.random();
        var u2 = Math.random();
        v.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
    }
    return v;
}

// Cholesky decomposition: returns lower triangular L such that L * L^T = A
function choleskyDecomposition(A) {
    var n = A.length;
    var L = zeroMatrix(n);

    for (var i = 0; i < n; i++) {
        for (var j = 0; j <= i; j++) {
            var s = 0;
            for (var k = 0; k < j; k++) {
                s += L[i][k] * L[j][k];
            }
            if (i === j) {
                var val = A[i][i] - s;
                if (val <= 0) val = 1e-10; // numerical safety
                L[i][j] = Math.sqrt(val);
            } else {
                L[i][j] = (A[i][j] - s) / L[j][j];
            }
        }
    }
    return L;
}

// Invert a lower triangular matrix
function invertLowerTriangular(L) {
    var n = L.length;
    var inv = zeroMatrix(n);

    for (var i = 0; i < n; i++) {
        inv[i][i] = 1 / L[i][i];
        for (var j = i + 1; j < n; j++) {
            var s = 0;
            for (var k = i; k < j; k++) {
                s += L[j][k] * inv[k][i];
            }
            inv[j][i] = -s / L[j][j];
        }
    }
    return inv;
}

// ============================================================
// Log / Resume helpers
// ============================================================

function getLogDir() {
    var dir = path.join(__dirname, 'search_log');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getLogPath(runName) {
    var dir = getLogDir();
    // Find existing log for this run name
    var files = fs.readdirSync(dir).filter(function(f) {
        return f.endsWith('_' + runName + '.jsonl');
    });
    if (files.length > 0) {
        return path.join(dir, files[files.length - 1]); // latest
    }
    // Create new
    var ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return path.join(dir, ts + '_' + runName + '.jsonl');
}

function appendLog(logPath, obj) {
    fs.appendFileSync(logPath, JSON.stringify(obj) + '\n');
}

function readLog(logPath) {
    if (!fs.existsSync(logPath)) return [];
    var lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean);
    var entries = [];
    for (var i = 0; i < lines.length; i++) {
        try {
            entries.push(JSON.parse(lines[i]));
        } catch (e) {
            // Skip corrupted lines (crash mid-write)
        }
    }
    return entries;
}

function findLastGeneration(entries) {
    var lastGen = null;
    for (var i = entries.length - 1; i >= 0; i--) {
        if (entries[i].type === 'generation') {
            lastGen = entries[i];
            break;
        }
    }
    return lastGen;
}

module.exports = {
    CMAES,
    CoordinateDescent,
    getLogPath,
    appendLog,
    readLog,
    findLastGeneration,
};
