/**
 * 50 Scripts 2.0 - Background Service Worker
 * Handles authentication state, token storage, and API communication.
 */

const DEFAULT_API_URL = 'http://localhost:3000';
const DEFAULT_SUPABASE_URL = '';
const DEFAULT_SUPABASE_ANON_KEY = '';

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function getStorageValue(key, fallback = null) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] !== undefined ? result[key] : fallback);
    });
  });
}

async function setStorageValue(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

async function removeStorageValue(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

async function getApiUrl() {
  return getStorageValue('apiUrl', DEFAULT_API_URL);
}

async function getSupabaseConfig() {
  const url = await getStorageValue('supabaseUrl', DEFAULT_SUPABASE_URL);
  const anonKey = await getStorageValue('supabaseAnonKey', DEFAULT_SUPABASE_ANON_KEY);
  return { url, anonKey };
}

// ---------------------------------------------------------------------------
// Auth token management
// ---------------------------------------------------------------------------

async function setAuthToken(token) {
  await setStorageValue('authToken', token);
}

async function getAuthToken() {
  return getStorageValue('authToken', null);
}

async function setRefreshToken(token) {
  await setStorageValue('refreshToken', token);
}

async function getRefreshToken() {
  return getStorageValue('refreshToken', null);
}

async function setUserProfile(profile) {
  await setStorageValue('userProfile', profile);
}

async function getUserProfile() {
  return getStorageValue('userProfile', null);
}

async function clearAuth() {
  await Promise.all([
    removeStorageValue('authToken'),
    removeStorageValue('refreshToken'),
    removeStorageValue('userProfile'),
  ]);
}

// ---------------------------------------------------------------------------
// Supabase Auth helpers (direct REST calls)
// ---------------------------------------------------------------------------

async function supabaseSignIn(email, password) {
  const { url, anonKey } = await getSupabaseConfig();

  if (!url || !anonKey) {
    return { error: 'Supabase URL and Anon Key not configured. Open extension settings.' };
  }

  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error_description || data.msg || 'Erro ao fazer login' };
    }

    // Store tokens
    await setAuthToken(data.access_token);
    await setRefreshToken(data.refresh_token);

    // Store user profile basics
    if (data.user) {
      await setUserProfile({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || '',
      });
    }

    return { success: true, user: data.user };
  } catch (err) {
    console.error('[50Scripts BG] Sign in error:', err);
    return { error: 'Falha na conexao. Verifique sua internet.' };
  }
}

async function supabaseRefreshSession() {
  const { url, anonKey } = await getSupabaseConfig();
  const refreshToken = await getRefreshToken();

  if (!url || !anonKey || !refreshToken) {
    return { error: 'No refresh token available' };
  }

  try {
    const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      await clearAuth();
      return { error: 'Session expired. Please login again.' };
    }

    await setAuthToken(data.access_token);
    if (data.refresh_token) {
      await setRefreshToken(data.refresh_token);
    }

    return { success: true };
  } catch (err) {
    console.error('[50Scripts BG] Refresh error:', err);
    return { error: 'Failed to refresh session' };
  }
}

// ---------------------------------------------------------------------------
// API request helper
// ---------------------------------------------------------------------------

async function apiRequest(endpoint, options = {}) {
  const apiUrl = await getApiUrl();
  const token = await getAuthToken();
  const { url: supabaseUrl, anonKey } = await getSupabaseConfig();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Add Supabase auth headers if we have them
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (anonKey) {
    headers['apikey'] = anonKey;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;

  try {
    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If 401, try refreshing the token once
    if (response.status === 401) {
      const refreshResult = await supabaseRefreshSession();
      if (refreshResult.success) {
        const newToken = await getAuthToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        return { error: 'Sessao expirada. Faca login novamente.', status: 401 };
      }
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Request failed', status: response.status };
    }

    return { data, status: response.status };
  } catch (err) {
    console.error('[50Scripts BG] API request error:', err);
    return { error: 'Falha na conexao com o servidor.', status: 0 };
  }
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action } = message;

  // Wrap async handlers - return true to keep sendResponse channel open
  const handleAsync = async () => {
    try {
      switch (action) {
        // --- Auth ---
        case 'login': {
          const result = await supabaseSignIn(message.email, message.password);
          sendResponse(result);
          break;
        }

        case 'logout': {
          await clearAuth();
          sendResponse({ success: true });
          break;
        }

        case 'getAuthState': {
          const token = await getAuthToken();
          const profile = await getUserProfile();
          sendResponse({
            isAuthenticated: !!token,
            profile,
          });
          break;
        }

        case 'getAuthToken': {
          const token = await getAuthToken();
          sendResponse({ token });
          break;
        }

        // --- Config ---
        case 'getConfig': {
          const apiUrl = await getApiUrl();
          const sbConfig = await getSupabaseConfig();
          sendResponse({
            apiUrl,
            supabaseUrl: sbConfig.url,
            supabaseAnonKey: sbConfig.anonKey,
          });
          break;
        }

        case 'setConfig': {
          if (message.apiUrl) await setStorageValue('apiUrl', message.apiUrl);
          if (message.supabaseUrl) await setStorageValue('supabaseUrl', message.supabaseUrl);
          if (message.supabaseAnonKey) await setStorageValue('supabaseAnonKey', message.supabaseAnonKey);
          sendResponse({ success: true });
          break;
        }

        // --- API proxied requests ---
        case 'apiRequest': {
          const result = await apiRequest(message.endpoint, message.options || {});
          sendResponse(result);
          break;
        }

        case 'searchScripts': {
          const result = await apiRequest(`/api/scripts/search?q=${encodeURIComponent(message.query)}`);
          sendResponse(result);
          break;
        }

        case 'getCategories': {
          const result = await apiRequest('/api/categories');
          sendResponse(result);
          break;
        }

        case 'getCategoryScripts': {
          const result = await apiRequest(`/api/categories/${message.slug}/scripts`);
          sendResponse(result);
          break;
        }

        case 'recordScriptUse': {
          const result = await apiRequest(`/api/scripts/${message.scriptId}/use`, {
            method: 'POST',
          });
          sendResponse(result);
          break;
        }

        default:
          sendResponse({ error: `Unknown action: ${action}` });
      }
    } catch (err) {
      console.error('[50Scripts BG] Message handler error:', err);
      sendResponse({ error: err.message });
    }
  };

  handleAsync();
  return true; // Keep message channel open for async response
});

// ---------------------------------------------------------------------------
// Extension install / update
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[50Scripts] Extension installed. Configure Supabase URL and Anon Key in the popup settings.');
  }
});
