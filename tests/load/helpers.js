import http from 'k6/http';
import { check } from 'k6';

/**
 * K6 Load Testing Helpers
 *
 * Shared utilities for all load test scripts.
 * Provides authentication, random data generation, and common request patterns.
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Test user pool - used to simulate concurrent sessions
// In a real run, override via K6_TEST_USERS env or pre-seed these in the DB.
// ---------------------------------------------------------------------------
const TEST_USERS = [
  { email: 'loadtest-01@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-02@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-03@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-04@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-05@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-06@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-07@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-08@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-09@test.com', password: 'LoadTest@2024!' },
  { email: 'loadtest-10@test.com', password: 'LoadTest@2024!' },
];

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Authenticate a user via Supabase GoTrue and return an access token.
 * Uses the Supabase REST auth endpoint directly.
 *
 * @param {string} [email]    - Override email (defaults to random pool user)
 * @param {string} [password] - Override password
 * @returns {{ token: string, userId: string } | null}
 */
export function login(email, password) {
  const supabaseUrl = __ENV.SUPABASE_URL || '';
  const supabaseAnonKey = __ENV.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    // Fall back to app-level auth endpoint if Supabase env not provided
    return loginViaApp(email, password);
  }

  const user = email
    ? { email, password }
    : TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  const res = http.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: user.email,
      password: user.password || password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      tags: { name: 'auth_login' },
    }
  );

  const success = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has access_token': (r) => {
      try {
        return !!JSON.parse(r.body).access_token;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    return null;
  }

  const body = JSON.parse(res.body);
  return {
    token: body.access_token,
    userId: body.user?.id || '',
  };
}

/**
 * Fallback: authenticate through the Next.js app auth endpoint.
 */
function loginViaApp(email, password) {
  const user = email
    ? { email, password }
    : TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password || password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth_login_app' },
    }
  );

  const success = check(res, {
    'app login status 200': (r) => r.status === 200,
  });

  if (!success) return null;

  try {
    const body = JSON.parse(res.body);
    return {
      token: body.token || body.access_token || '',
      userId: body.userId || body.user?.id || '',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Authenticated request helpers
// ---------------------------------------------------------------------------

/**
 * Build standard request headers, optionally with auth token.
 *
 * @param {string} [token] - Bearer token
 * @returns {object} headers
 */
export function authHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Perform an authenticated GET request.
 *
 * @param {string} path  - Relative path (e.g. '/api/scripts/search?q=vendas')
 * @param {string} token - Bearer token
 * @param {object} [params] - Additional k6 request params
 * @returns {object} k6 http response
 */
export function authGet(path, token, params = {}) {
  return http.get(`${BASE_URL}${path}`, {
    headers: authHeaders(token),
    ...params,
  });
}

/**
 * Perform an authenticated POST request.
 *
 * @param {string} path  - Relative path
 * @param {object} body  - JSON body
 * @param {string} token - Bearer token
 * @param {object} [params] - Additional k6 request params
 * @returns {object} k6 http response
 */
export function authPost(path, body, token, params = {}) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: authHeaders(token),
    ...params,
  });
}

// ---------------------------------------------------------------------------
// Random data generators
// ---------------------------------------------------------------------------

const SCRIPT_CATEGORIES = [
  'abertura', 'qualificacao', 'objecao', 'fechamento',
  'follow-up', 'pos-venda', 'prospeccao', 'apresentacao',
];

const SEARCH_TERMS = [
  'vendas', 'objecao preco', 'fechamento', 'follow up',
  'prospeccao', 'qualificacao', 'abertura', 'rapport',
  'desconto', 'concorrente', 'decisao', 'urgencia',
  'valor', 'beneficio', 'garantia', 'prazo',
];

const RATING_VALUES = [1, 2, 3, 4, 5];

/**
 * Pick a random element from an array.
 */
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a random script category slug.
 */
export function randomCategory() {
  return randomItem(SCRIPT_CATEGORIES);
}

/**
 * Get a random search query term.
 */
export function randomSearchTerm() {
  return randomItem(SEARCH_TERMS);
}

/**
 * Get a random rating value (1-5).
 */
export function randomRating() {
  return randomItem(RATING_VALUES);
}

/**
 * Generate a random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Common user action flows
// ---------------------------------------------------------------------------

/**
 * Simulate a user browsing scripts: hit categories then a specific category.
 *
 * @param {string} token - Auth token
 * @returns {object[]} Array of k6 responses
 */
export function browseScripts(token) {
  const responses = [];

  // 1. List categories
  const categoriesRes = authGet('/api/categories', token, {
    tags: { name: 'categories_list' },
  });
  responses.push(categoriesRes);

  // 2. Pick a random category and fetch its scripts
  const category = randomCategory();
  const scriptsRes = authGet(`/api/scripts/search?category=${category}`, token, {
    tags: { name: 'scripts_by_category' },
  });
  responses.push(scriptsRes);

  return responses;
}

/**
 * Simulate a search flow.
 *
 * @param {string} token - Auth token
 * @returns {object} k6 response
 */
export function searchScripts(token) {
  const term = randomSearchTerm();
  return authGet(`/api/scripts/search?q=${encodeURIComponent(term)}`, token, {
    tags: { name: 'scripts_search' },
  });
}

/**
 * Simulate copying a script (marks it as used by the user).
 *
 * @param {string} scriptId - Script UUID
 * @param {string} token    - Auth token
 * @returns {object} k6 response
 */
export function copyScript(scriptId, token) {
  return authPost(
    `/api/scripts/${scriptId}/copy`,
    {},
    token,
    { tags: { name: 'script_copy' } }
  );
}

/**
 * Simulate rating a script.
 *
 * @param {string} scriptId - Script UUID
 * @param {string} token    - Auth token
 * @returns {object} k6 response
 */
export function rateScript(scriptId, token) {
  return authPost(
    `/api/scripts/${scriptId}/rate`,
    { rating: randomRating() },
    token,
    { tags: { name: 'script_rate' } }
  );
}

/**
 * Simulate loading the dashboard.
 *
 * @param {string} token - Auth token
 * @returns {object} k6 response
 */
export function loadDashboard(token) {
  return authGet('/api/dashboard/basic', token, {
    tags: { name: 'dashboard_basic' },
  });
}

/**
 * Simulate requesting AI script generation.
 *
 * @param {string} token - Auth token
 * @returns {object} k6 response
 */
export function generateAIScript(token) {
  return authPost(
    '/api/ai/generate',
    {
      category: randomCategory(),
      context: 'Load test - geração de script para teste de carga',
      tone: 'profissional',
    },
    token,
    { tags: { name: 'ai_generate' }, timeout: '30s' }
  );
}

// ---------------------------------------------------------------------------
// Health check (unauthenticated)
// ---------------------------------------------------------------------------

/**
 * Hit the health endpoint. Does not require authentication.
 *
 * @returns {object} k6 response
 */
export function healthCheck() {
  return http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'health_check' },
  });
}

// ---------------------------------------------------------------------------
// Exports summary
// ---------------------------------------------------------------------------
export {
  BASE_URL,
  TEST_USERS,
};
