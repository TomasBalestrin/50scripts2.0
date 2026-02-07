import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  login,
  authGet,
  authPost,
  healthCheck,
  searchScripts,
  browseScripts,
  loadDashboard,
  copyScript,
  generateAIScript,
  randomCategory,
  randomSearchTerm,
  randomItem,
  randomInt,
} from './helpers.js';

/**
 * Spike Test — 50 Scripts 2.0
 *
 * Purpose: Simulate a sudden, extreme traffic spike to test how the
 * application handles abrupt load changes. This is common for SaaS apps
 * when a marketing campaign launches, a viral moment hits, or a webhook
 * burst arrives.
 *
 * Profile:
 *   1. Baseline  →  10 VUs for 30 seconds (warm-up)
 *   2. SPIKE     → 1,000 VUs in 10 seconds (sudden burst)
 *   3. Sustain   → 1,000 VUs for 1 minute
 *   4. Drop      →  10 VUs in 10 seconds (instant recovery test)
 *   5. Recovery  →  10 VUs for 2 minutes (verify system recovers)
 *   6. SPIKE #2  → 1,000 VUs in 10 seconds (repeat spike)
 *   7. Sustain   → 1,000 VUs for 1 minute
 *   8. Ramp down →   0 VUs over 30 seconds
 *
 * Run:
 *   k6 run tests/load/spike.js
 *   k6 run --env BASE_URL=https://staging.50scripts.com tests/load/spike.js
 */

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const spikeLoginDuration = new Trend('spike_login_duration', true);
const spikeCopyDuration = new Trend('spike_copy_duration', true);
const spikeAIDuration = new Trend('spike_ai_duration', true);
const spikeSearchDuration = new Trend('spike_search_duration', true);
const errorRate = new Rate('errors');
const spikeErrors = new Counter('spike_errors');
const spikeRequests = new Counter('spike_requests');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    // Phase 1: Baseline warm-up
    { duration: '30s', target: 10 },
    // Phase 2: SPIKE — ramp to 1000 in 10 seconds
    { duration: '10s', target: 1000 },
    // Phase 3: Sustain peak
    { duration: '1m', target: 1000 },
    // Phase 4: Sudden drop
    { duration: '10s', target: 10 },
    // Phase 5: Recovery period
    { duration: '2m', target: 10 },
    // Phase 6: SPIKE #2 — repeat to test resilience
    { duration: '10s', target: 1000 },
    // Phase 7: Sustain second peak
    { duration: '1m', target: 1000 },
    // Phase 8: Ramp down
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // During spikes, we accept slightly degraded performance
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    http_req_failed: ['rate<0.05'],          // Allow up to 5% failures during spike
    // Custom thresholds
    spike_login_duration: ['p(95)<2000'],     // Login can be slower during spike
    spike_search_duration: ['p(95)<1000'],    // Search under 1s at p95
    errors: ['rate<0.05'],                    // Custom error rate
  },
  tags: {
    testType: 'spike',
    app: '50scripts',
  },
  // Ensure we don't overwhelm the client machine
  batchPerHost: 6,
  gracefulStop: '30s',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
export function setup() {
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'setup_health' },
  });

  check(healthRes, {
    'app is reachable for spike test': (r) => r.status === 200 || r.status === 503,
  });

  // Pre-authenticate one user to have a valid token for reference
  const auth = login();
  return {
    baseToken: auth ? auth.token : null,
  };
}

// ---------------------------------------------------------------------------
// Spike Scenarios
// ---------------------------------------------------------------------------

/**
 * Scenario 1: Login Storm
 * Simulates many users trying to log in simultaneously.
 */
function loginStorm() {
  group('Spike - Login Storm', () => {
    spikeRequests.add(1);
    const startTime = Date.now();
    const auth = login();
    spikeLoginDuration.add(Date.now() - startTime);

    if (!auth || !auth.token) {
      spikeErrors.add(1);
      errorRate.add(true);
      return;
    }

    errorRate.add(false);

    // Once logged in, immediately hit the dashboard (simulates first load)
    const dashRes = loadDashboard(auth.token);
    check(dashRes, {
      'post-login dashboard OK': (r) => r.status >= 200 && r.status < 400,
    });
  });
}

/**
 * Scenario 2: Script Copy Burst
 * Simulates many users simultaneously copying scripts (e.g., after an email blast).
 */
function scriptCopyBurst(token) {
  group('Spike - Copy Burst', () => {
    if (!token) {
      // Quick login attempt
      const auth = login();
      if (!auth) {
        errorRate.add(true);
        return;
      }
      token = auth.token;
    }

    spikeRequests.add(1);

    // First, get a list of scripts to copy
    const searchRes = searchScripts(token);
    let scriptId = null;

    try {
      const body = JSON.parse(searchRes.body);
      const scripts = body.data || body.scripts || body;
      if (Array.isArray(scripts) && scripts.length > 0) {
        scriptId = randomItem(scripts).id;
      }
    } catch {
      // Could not parse scripts
    }

    if (scriptId) {
      const startTime = Date.now();
      const res = copyScript(scriptId, token);
      spikeCopyDuration.add(Date.now() - startTime);

      const passed = check(res, {
        'copy during spike OK': (r) => r.status >= 200 && r.status < 400,
      });

      if (!passed) spikeErrors.add(1);
      errorRate.add(!passed);
    }
  });
}

/**
 * Scenario 3: AI Generation Burst
 * Simulates multiple users requesting AI-generated scripts at once.
 * This is the most resource-intensive operation.
 */
function aiGenerationBurst(token) {
  group('Spike - AI Generation', () => {
    if (!token) {
      const auth = login();
      if (!auth) {
        errorRate.add(true);
        return;
      }
      token = auth.token;
    }

    spikeRequests.add(1);
    const startTime = Date.now();
    const res = generateAIScript(token);
    spikeAIDuration.add(Date.now() - startTime);

    const passed = check(res, {
      'AI generation responds': (r) => r.status >= 200 && r.status < 500,
      'AI generation not timeout': (r) => r.timings.duration < 30000,
    });

    if (!passed) spikeErrors.add(1);
    errorRate.add(!passed);
  });
}

/**
 * Scenario 4: Search Flood
 * Simulates many simultaneous search requests.
 */
function searchFlood(token) {
  group('Spike - Search Flood', () => {
    spikeRequests.add(1);
    const term = randomSearchTerm();

    const startTime = Date.now();
    const res = http.get(
      `${BASE_URL}/api/scripts/search?q=${encodeURIComponent(term)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        tags: { name: 'spike_search' },
      }
    );
    spikeSearchDuration.add(Date.now() - startTime);

    const passed = check(res, {
      'search during spike OK': (r) => r.status >= 200 && r.status < 400,
      'search during spike fast enough': (r) => r.timings.duration < 2000,
    });

    if (!passed) spikeErrors.add(1);
    errorRate.add(!passed);
  });
}

/**
 * Scenario 5: Mixed rapid-fire requests (most realistic)
 * Combines multiple actions in quick succession.
 */
function mixedRapidFire(token) {
  group('Spike - Mixed Rapid Fire', () => {
    spikeRequests.add(1);

    // Hit multiple endpoints in rapid succession without sleeping
    const batch = http.batch([
      ['GET', `${BASE_URL}/api/health`, null, { tags: { name: 'spike_health' } }],
      ['GET', `${BASE_URL}/api/categories`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        tags: { name: 'spike_categories' },
      }],
      ['GET', `${BASE_URL}/api/scripts/search?q=${encodeURIComponent(randomSearchTerm())}`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        tags: { name: 'spike_search_batch' },
      }],
    ]);

    batch.forEach((res, idx) => {
      const passed = check(res, {
        [`batch request ${idx} OK`]: (r) => r.status >= 200 && r.status < 500,
      });
      if (!passed) spikeErrors.add(1);
      errorRate.add(!passed);
    });
  });
}

// ---------------------------------------------------------------------------
// Default function — VU execution with weighted scenario selection
// ---------------------------------------------------------------------------
export default function (data) {
  const token = data.baseToken;
  const rand = Math.random();

  // Weighted distribution of spike scenarios:
  //   30% Login storms
  //   20% Script copy bursts
  //   5%  AI generation bursts (expensive, keep low)
  //   25% Search floods
  //   20% Mixed rapid-fire

  if (rand < 0.30) {
    loginStorm();
  } else if (rand < 0.50) {
    scriptCopyBurst(token);
  } else if (rand < 0.55) {
    aiGenerationBurst(token);
  } else if (rand < 0.80) {
    searchFlood(token);
  } else {
    mixedRapidFire(token);
  }

  // Minimal sleep to simulate users hammering the system
  sleep(randomInt(0, 1));
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------
export function teardown() {
  console.log('Spike test completed.');
  console.log(
    'Review spike_errors and spike_requests counters to assess resilience.'
  );
  console.log(
    'Key areas to check: ' +
    '1) Did error rates spike during the ramp? ' +
    '2) Did the system recover after the first spike? ' +
    '3) Was the second spike handled similarly to the first?'
  );
}
