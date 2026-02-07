import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  login,
  authGet,
  authPost,
  healthCheck,
  browseScripts,
  searchScripts,
  loadDashboard,
  copyScript,
  rateScript,
  randomCategory,
  randomSearchTerm,
  randomRating,
  randomItem,
  randomInt,
} from './helpers.js';

/**
 * Stress Test — 50 Scripts 2.0
 *
 * Purpose: Determine how the application behaves under sustained high load,
 * ramping up to 5000 concurrent virtual users. This test validates throughput,
 * error rates, and latency under heavy traffic conditions.
 *
 * Stages:
 *   1. Ramp-up   →   100 VUs over 1 minute
 *   2. Sustained → 1,000 VUs for 3 minutes
 *   3. Peak      → 5,000 VUs for 2 minutes
 *   4. Ramp-down →     0 VUs over 1 minute
 *
 * Run:
 *   k6 run tests/load/stress.js
 *   k6 run --env BASE_URL=https://staging.50scripts.com tests/load/stress.js
 */

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const loginDuration = new Trend('login_duration', true);
const browseDuration = new Trend('browse_duration', true);
const searchDuration = new Trend('search_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const copyDuration = new Trend('copy_duration', true);
const rateDuration = new Trend('rate_duration', true);
const errorRate = new Rate('errors');
const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '1m', target: 100 },    // Ramp up to 100 VUs
    { duration: '3m', target: 1000 },   // Stay at 1,000 VUs
    { duration: '2m', target: 5000 },   // Peak at 5,000 VUs
    { duration: '1m', target: 0 },      // Ramp down to 0
  ],
  thresholds: {
    // Latency thresholds at different percentiles
    http_req_duration: [
      'p(50)<200',   // Median under 200ms
      'p(95)<500',   // 95th percentile under 500ms
      'p(99)<1000',  // 99th percentile under 1 second
    ],
    http_req_failed: ['rate<0.005'],      // Less than 0.5% failure rate
    // Custom thresholds
    login_duration: ['p(95)<1000'],        // Login under 1s at p95
    browse_duration: ['p(95)<600'],        // Browse under 600ms at p95
    search_duration: ['p(95)<500'],        // Search under 500ms at p95
    dashboard_duration: ['p(95)<800'],     // Dashboard under 800ms at p95
    errors: ['rate<0.01'],                 // Custom error rate under 1%
  },
  tags: {
    testType: 'stress',
    app: '50scripts',
  },
  // Discard response bodies for performance (we only check status/timings)
  discardResponseBodies: false,
  // Graceful stop so in-flight requests can complete
  gracefulStop: '30s',
};

// ---------------------------------------------------------------------------
// Setup — run once before VUs start
// ---------------------------------------------------------------------------
export function setup() {
  // Verify the app is reachable
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'setup_health' },
  });

  check(healthRes, {
    'app is reachable for stress test': (r) => r.status === 200 || r.status === 503,
  });

  return {};
}

// ---------------------------------------------------------------------------
// Scenarios — simulate realistic user journeys
// ---------------------------------------------------------------------------

/**
 * Scenario: Full authenticated user session
 * Login → Browse → Search → Copy → Rate → Dashboard
 */
function authenticatedUserFlow() {
  let token = null;
  let scriptsData = null;

  // --- Login ---
  group('Login', () => {
    const startTime = Date.now();
    const auth = login();
    loginDuration.add(Date.now() - startTime);

    if (auth && auth.token) {
      token = auth.token;
      successfulLogins.add(1);
    } else {
      failedLogins.add(1);
      errorRate.add(true);
    }
  });

  if (!token) {
    sleep(randomInt(1, 3));
    return; // Cannot continue without auth
  }

  // --- Browse Scripts ---
  group('Browse Scripts', () => {
    const startTime = Date.now();
    const responses = browseScripts(token);
    browseDuration.add(Date.now() - startTime);

    responses.forEach((res) => {
      const passed = check(res, {
        'browse status OK': (r) => r.status >= 200 && r.status < 400,
      });
      errorRate.add(!passed);
    });

    // Try to extract a script ID from the response for copy/rate
    try {
      const body = JSON.parse(responses[1].body);
      const scripts = body.data || body.scripts || body;
      if (Array.isArray(scripts) && scripts.length > 0) {
        scriptsData = scripts;
      }
    } catch {
      // Response format may vary
    }
  });

  sleep(randomInt(1, 2));

  // --- Search Scripts ---
  group('Search Scripts', () => {
    const startTime = Date.now();
    const res = searchScripts(token);
    searchDuration.add(Date.now() - startTime);

    const passed = check(res, {
      'search status OK': (r) => r.status >= 200 && r.status < 400,
    });
    errorRate.add(!passed);

    // Extract scripts from search results as fallback
    if (!scriptsData) {
      try {
        const body = JSON.parse(res.body);
        const scripts = body.data || body.scripts || body;
        if (Array.isArray(scripts) && scripts.length > 0) {
          scriptsData = scripts;
        }
      } catch {
        // Response format may vary
      }
    }
  });

  sleep(randomInt(1, 2));

  // --- Copy a Script ---
  if (scriptsData && scriptsData.length > 0) {
    group('Copy Script', () => {
      const script = randomItem(scriptsData);
      const scriptId = script.id || script.script_id;
      if (!scriptId) return;

      const startTime = Date.now();
      const res = copyScript(scriptId, token);
      copyDuration.add(Date.now() - startTime);

      const passed = check(res, {
        'copy status OK': (r) => r.status >= 200 && r.status < 400,
      });
      errorRate.add(!passed);
    });

    sleep(randomInt(1, 2));

    // --- Rate a Script ---
    group('Rate Script', () => {
      const script = randomItem(scriptsData);
      const scriptId = script.id || script.script_id;
      if (!scriptId) return;

      const startTime = Date.now();
      const res = rateScript(scriptId, token);
      rateDuration.add(Date.now() - startTime);

      const passed = check(res, {
        'rate status OK': (r) => r.status >= 200 && r.status < 400,
      });
      errorRate.add(!passed);
    });
  }

  sleep(randomInt(1, 2));

  // --- Dashboard ---
  group('Dashboard', () => {
    const startTime = Date.now();
    const res = loadDashboard(token);
    dashboardDuration.add(Date.now() - startTime);

    const passed = check(res, {
      'dashboard status OK': (r) => r.status >= 200 && r.status < 400,
    });
    errorRate.add(!passed);
  });

  sleep(randomInt(1, 3));
}

/**
 * Scenario: Anonymous browsing (no auth required)
 * Health → Categories → Search
 */
function anonymousBrowsingFlow() {
  group('Anonymous - Health', () => {
    const res = healthCheck();
    check(res, {
      'anon health OK': (r) => r.status === 200 || r.status === 503,
    });
  });

  sleep(randomInt(1, 2));

  group('Anonymous - Categories', () => {
    const res = http.get(`${BASE_URL}/api/categories`, {
      tags: { name: 'anon_categories' },
    });
    check(res, {
      'anon categories OK': (r) => r.status >= 200 && r.status < 400,
    });
  });

  sleep(randomInt(1, 2));

  group('Anonymous - Search', () => {
    const term = randomSearchTerm();
    const res = http.get(
      `${BASE_URL}/api/scripts/search?q=${encodeURIComponent(term)}`,
      { tags: { name: 'anon_search' } }
    );
    check(res, {
      'anon search OK': (r) => r.status >= 200 && r.status < 400,
    });
  });

  sleep(randomInt(2, 4));
}

// ---------------------------------------------------------------------------
// Default function — distributed VU execution
// ---------------------------------------------------------------------------
export default function () {
  // 70% of traffic is authenticated users, 30% anonymous browsers
  const rand = Math.random();

  if (rand < 0.70) {
    authenticatedUserFlow();
  } else {
    anonymousBrowsingFlow();
  }
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------
export function teardown() {
  console.log('Stress test completed.');
  console.log('Review the thresholds above to assess application health under load.');
}
