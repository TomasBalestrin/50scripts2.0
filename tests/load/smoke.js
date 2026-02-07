import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  login,
  authGet,
  healthCheck,
  browseScripts,
  searchScripts,
  loadDashboard,
  randomSearchTerm,
} from './helpers.js';

/**
 * Smoke Test — 50 Scripts 2.0
 *
 * Purpose: Verify that the application is functional under minimal load.
 * This test runs 10 virtual users for 30 seconds and validates that
 * all critical endpoints respond within acceptable latency thresholds.
 *
 * Run:
 *   k6 run tests/load/smoke.js
 *   k6 run --env BASE_URL=https://staging.50scripts.com tests/load/smoke.js
 */

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const healthCheckDuration = new Trend('health_check_duration', true);
const categoriesDuration = new Trend('categories_duration', true);
const searchDuration = new Trend('search_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const errorRate = new Rate('errors');

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    // Global thresholds
    http_req_duration: ['p(95)<500'],       // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],          // Less than 1% failure rate
    // Custom thresholds
    health_check_duration: ['p(95)<200'],    // Health check under 200ms
    categories_duration: ['p(95)<400'],      // Categories under 400ms
    search_duration: ['p(95)<500'],          // Search under 500ms
    dashboard_duration: ['p(95)<500'],       // Dashboard under 500ms
    errors: ['rate<0.01'],                   // Custom error rate under 1%
  },
  // Tag all requests so they show up nicely in k6 cloud / Grafana
  tags: {
    testType: 'smoke',
    app: '50scripts',
  },
};

// ---------------------------------------------------------------------------
// Setup — runs once before VUs start
// ---------------------------------------------------------------------------
export function setup() {
  // Verify the app is reachable before starting the test
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'setup_health' },
  });

  const isHealthy = check(healthRes, {
    'app is reachable': (r) => r.status === 200 || r.status === 503,
  });

  if (!isHealthy) {
    throw new Error(
      `Application is not reachable at ${BASE_URL}. ` +
      `Got status ${healthRes.status}. Aborting smoke test.`
    );
  }

  // Pre-authenticate a test user for authenticated endpoint tests
  const auth = login();
  return { token: auth ? auth.token : null };
}

// ---------------------------------------------------------------------------
// Default function — executed by each VU on each iteration
// ---------------------------------------------------------------------------
export default function (data) {
  const { token } = data;

  // ------ 1. Health Endpoint (public) --------------------------------------
  group('Health Check', () => {
    const res = healthCheck();
    healthCheckDuration.add(res.timings.duration);

    const passed = check(res, {
      'health status is 200 or 503': (r) => r.status === 200 || r.status === 503,
      'health body has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'ok' || body.status === 'degraded';
        } catch {
          return false;
        }
      },
      'health response time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(!passed);
  });

  // ------ 2. Categories Listing (public or authenticated) ------------------
  group('Categories Listing', () => {
    const res = http.get(`${BASE_URL}/api/categories`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      tags: { name: 'categories_list' },
    });
    categoriesDuration.add(res.timings.duration);

    const passed = check(res, {
      'categories status 200': (r) => r.status === 200,
      'categories returns array or object': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || (body && typeof body === 'object');
        } catch {
          return false;
        }
      },
      'categories response time < 500ms': (r) => r.timings.duration < 500,
    });

    errorRate.add(!passed);
  });

  // ------ 3. Scripts Search ------------------------------------------------
  group('Scripts Search', () => {
    const term = randomSearchTerm();
    const res = http.get(
      `${BASE_URL}/api/scripts/search?q=${encodeURIComponent(term)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        tags: { name: 'scripts_search' },
      }
    );
    searchDuration.add(res.timings.duration);

    const passed = check(res, {
      'search status 200': (r) => r.status === 200,
      'search returns data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body !== null && body !== undefined;
        } catch {
          return false;
        }
      },
      'search response time < 600ms': (r) => r.timings.duration < 600,
    });

    errorRate.add(!passed);
  });

  // ------ 4. Dashboard (authenticated) ------------------------------------
  group('Dashboard', () => {
    if (!token) {
      // Skip if no auth token is available
      return;
    }

    const res = loadDashboard(token);
    dashboardDuration.add(res.timings.duration);

    const passed = check(res, {
      'dashboard status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'dashboard response time < 600ms': (r) => r.timings.duration < 600,
    });

    errorRate.add(!passed);
  });

  // ------ 5. Feature Flags (authenticated) --------------------------------
  group('Feature Flags', () => {
    if (!token) return;

    const res = authGet('/api/feature-flags', token, {
      tags: { name: 'feature_flags' },
    });

    check(res, {
      'feature flags status 200 or 401': (r) => r.status === 200 || r.status === 401,
      'feature flags has body': (r) => r.body && r.body.length > 0,
    });
  });

  // Pause between iterations to simulate realistic user behavior
  sleep(1);
}

// ---------------------------------------------------------------------------
// Teardown — runs once after all VUs finish
// ---------------------------------------------------------------------------
export function teardown(data) {
  console.log('Smoke test completed.');
  if (!data.token) {
    console.warn(
      'Warning: Auth token was not available. ' +
      'Authenticated endpoints were skipped. ' +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY env vars for full coverage.'
    );
  }
}
