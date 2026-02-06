/**
 * 50 Scripts 2.0 - Popup Logic
 * Handles login, search, browsing, and script insertion.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // DOM References
  // ---------------------------------------------------------------------------
  const views = {
    loading: document.getElementById('view-loading'),
    config: document.getElementById('view-config'),
    login: document.getElementById('view-login'),
    main: document.getElementById('view-main'),
  };

  // Config form
  const configApiUrl = document.getElementById('config-api-url');
  const configSupabaseUrl = document.getElementById('config-supabase-url');
  const configSupabaseKey = document.getElementById('config-supabase-key');
  const configSaveBtn = document.getElementById('config-save-btn');
  const configError = document.getElementById('config-error');

  // Login form
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const showConfigFromLogin = document.getElementById('show-config-from-login');

  // Main view
  const searchInput = document.getElementById('search-input');
  const categoryTabs = document.getElementById('category-tabs');
  const resultsContainer = document.getElementById('results-container');
  const userEmail = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');
  const settingsBtn = document.getElementById('settings-btn');

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let currentCategory = 'all';
  let categories = [];
  let searchTimeout = null;
  let isLoading = false;

  // ---------------------------------------------------------------------------
  // View management
  // ---------------------------------------------------------------------------
  function showView(name) {
    Object.values(views).forEach((v) => v.classList.add('hidden'));
    if (views[name]) {
      views[name].classList.remove('hidden');
    }
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
  }

  function hideError(element) {
    element.classList.add('hidden');
    element.textContent = '';
  }

  // ---------------------------------------------------------------------------
  // Send message to background
  // ---------------------------------------------------------------------------
  function sendMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (response) => {
        resolve(response || { error: 'No response from background' });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Send message to content script (active tab)
  // ---------------------------------------------------------------------------
  async function sendToContentScript(msg) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url?.includes('web.whatsapp.com')) {
        return { error: 'WhatsApp Web nao esta aberto na aba atual.' };
      }
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, msg, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: 'Nao foi possivel conectar ao WhatsApp Web. Recarregue a pagina.' });
          } else {
            resolve(response || { error: 'No response' });
          }
        });
      });
    } catch (err) {
      return { error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Initialize
  // ---------------------------------------------------------------------------
  async function init() {
    showView('loading');

    // Check configuration
    const config = await sendMessage({ action: 'getConfig' });

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      // Need configuration first
      if (config.apiUrl) configApiUrl.value = config.apiUrl;
      showView('config');
      return;
    }

    // Check auth state
    const authState = await sendMessage({ action: 'getAuthState' });

    if (authState.isAuthenticated) {
      await enterMainView(authState.profile);
    } else {
      showView('login');
    }
  }

  async function enterMainView(profile) {
    showView('main');

    if (profile?.email) {
      userEmail.textContent = profile.email;
    }

    // Load categories
    await loadCategories();
  }

  // ---------------------------------------------------------------------------
  // Config form
  // ---------------------------------------------------------------------------
  configSaveBtn.addEventListener('click', async () => {
    hideError(configError);

    const apiUrl = configApiUrl.value.trim();
    const supabaseUrl = configSupabaseUrl.value.trim();
    const anonKey = configSupabaseKey.value.trim();

    if (!supabaseUrl || !anonKey) {
      showError(configError, 'Supabase URL e Anon Key sao obrigatorios.');
      return;
    }

    configSaveBtn.disabled = true;
    configSaveBtn.textContent = 'Salvando...';

    const result = await sendMessage({
      action: 'setConfig',
      apiUrl: apiUrl || 'http://localhost:3000',
      supabaseUrl,
      supabaseAnonKey: anonKey,
    });

    configSaveBtn.disabled = false;
    configSaveBtn.textContent = 'Salvar Configuracao';

    if (result.error) {
      showError(configError, result.error);
    } else {
      showView('login');
    }
  });

  showConfigFromLogin.addEventListener('click', async () => {
    const config = await sendMessage({ action: 'getConfig' });
    if (config.apiUrl) configApiUrl.value = config.apiUrl;
    if (config.supabaseUrl) configSupabaseUrl.value = config.supabaseUrl;
    if (config.supabaseAnonKey) configSupabaseKey.value = config.supabaseAnonKey;
    showView('config');
  });

  settingsBtn.addEventListener('click', async () => {
    const config = await sendMessage({ action: 'getConfig' });
    if (config.apiUrl) configApiUrl.value = config.apiUrl;
    if (config.supabaseUrl) configSupabaseUrl.value = config.supabaseUrl;
    if (config.supabaseAnonKey) configSupabaseKey.value = config.supabaseAnonKey;
    showView('config');
  });

  // ---------------------------------------------------------------------------
  // Login form
  // ---------------------------------------------------------------------------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(loginError);

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
      showError(loginError, 'Preencha todos os campos.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Entrando...';

    const result = await sendMessage({
      action: 'login',
      email,
      password,
    });

    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';

    if (result.error) {
      showError(loginError, result.error);
    } else {
      const authState = await sendMessage({ action: 'getAuthState' });
      await enterMainView(authState.profile);
    }
  });

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  logoutBtn.addEventListener('click', async () => {
    await sendMessage({ action: 'logout' });
    loginEmail.value = '';
    loginPassword.value = '';
    hideError(loginError);
    showView('login');
  });

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------
  async function loadCategories() {
    const result = await sendMessage({ action: 'getCategories' });

    if (result.data?.categories) {
      categories = result.data.categories;
      renderCategoryTabs();
    }
  }

  function renderCategoryTabs() {
    // Keep the "Todos" tab, remove dynamically added ones
    const existingDynamic = categoryTabs.querySelectorAll('.category-tab:not([data-category="all"])');
    existingDynamic.forEach((el) => el.remove());

    categories.forEach((cat) => {
      const tab = document.createElement('button');
      tab.className = 'category-tab';
      tab.dataset.category = cat.slug;
      tab.textContent = cat.name;
      categoryTabs.appendChild(tab);
    });
  }

  categoryTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;

    // Update active state
    categoryTabs.querySelectorAll('.category-tab').forEach((t) => {
      t.classList.remove('category-tab--active');
    });
    tab.classList.add('category-tab--active');

    currentCategory = tab.dataset.category;

    if (currentCategory === 'all') {
      // If there's a search query, re-search; otherwise show empty
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        performSearch(query);
      } else {
        renderEmpty('Busque scripts ou selecione uma categoria');
      }
    } else {
      loadCategoryScripts(currentCategory);
    }
  });

  async function loadCategoryScripts(slug) {
    renderLoading();

    const result = await sendMessage({
      action: 'getCategoryScripts',
      slug,
    });

    if (result.error) {
      renderError(result.error);
    } else {
      renderScripts(result.data?.scripts || []);
    }
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();

    if (query.length < 2) {
      if (currentCategory !== 'all') {
        loadCategoryScripts(currentCategory);
      } else {
        renderEmpty('Busque scripts ou selecione uma categoria');
      }
      return;
    }

    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 350);
  });

  async function performSearch(query) {
    renderLoading();

    const result = await sendMessage({
      action: 'searchScripts',
      query,
    });

    if (result.error) {
      renderError(result.error);
    } else {
      renderScripts(result.data?.scripts || []);
    }
  }

  // ---------------------------------------------------------------------------
  // Render functions
  // ---------------------------------------------------------------------------
  function renderLoading() {
    resultsContainer.innerHTML = `
      <div class="results-loading">
        <div class="loading-spinner loading-spinner--sm"></div>
        <span>Buscando...</span>
      </div>
    `;
  }

  function renderEmpty(message) {
    resultsContainer.innerHTML = `
      <div class="results-empty">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderError(message) {
    resultsContainer.innerHTML = `
      <div class="results-empty results-error">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderScripts(scripts) {
    if (!scripts || scripts.length === 0) {
      renderEmpty('Nenhum script encontrado.');
      return;
    }

    resultsContainer.innerHTML = '';

    scripts.forEach((script) => {
      const card = document.createElement('div');
      card.className = `script-card${script.is_locked ? ' script-card--locked' : ''}`;

      const preview = (script.content || '').substring(0, 140).replace(/\n/g, ' ');
      const planLabel = getPlanLabel(script.min_plan);

      card.innerHTML = `
        <div class="script-card__header">
          <span class="script-card__title">${escapeHtml(script.title || 'Sem titulo')}</span>
          ${planLabel ? `<span class="script-badge script-badge--${script.min_plan}">${planLabel}</span>` : ''}
        </div>
        <p class="script-card__preview">${escapeHtml(preview)}${preview.length >= 140 ? '...' : ''}</p>
        ${script.global_effectiveness
          ? `<div class="script-card__meta">
              <span class="script-card__effectiveness">${script.global_effectiveness}% eficacia</span>
            </div>`
          : ''
        }
        <div class="script-card__actions">
          ${script.is_locked
            ? `<span class="script-card__locked">Upgrade necessario</span>`
            : `
              <button class="btn btn--sm btn--primary btn-insert" data-id="${script.id}">
                Inserir no WhatsApp
              </button>
              <button class="btn btn--sm btn--outline btn-copy" data-id="${script.id}">
                Copiar
              </button>
            `
          }
        </div>
      `;

      if (!script.is_locked) {
        // Insert button
        card.querySelector('.btn-insert').addEventListener('click', async () => {
          const insertBtn = card.querySelector('.btn-insert');
          insertBtn.disabled = true;
          insertBtn.textContent = 'Inserindo...';

          const result = await sendToContentScript({
            action: 'insertScript',
            text: script.content,
          });

          insertBtn.disabled = false;
          insertBtn.textContent = 'Inserir no WhatsApp';

          if (result.error) {
            insertBtn.textContent = 'Erro!';
            setTimeout(() => {
              insertBtn.textContent = 'Inserir no WhatsApp';
            }, 2000);
          } else {
            insertBtn.textContent = 'Inserido!';
            setTimeout(() => {
              insertBtn.textContent = 'Inserir no WhatsApp';
            }, 2000);
          }

          // Record usage
          sendMessage({ action: 'recordScriptUse', scriptId: script.id });
        });

        // Copy button
        card.querySelector('.btn-copy').addEventListener('click', async () => {
          const copyBtn = card.querySelector('.btn-copy');
          try {
            await navigator.clipboard.writeText(script.content);
            copyBtn.textContent = 'Copiado!';
          } catch {
            // Fallback: use a textarea
            const ta = document.createElement('textarea');
            ta.value = script.content;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copyBtn.textContent = 'Copiado!';
          }

          setTimeout(() => {
            copyBtn.textContent = 'Copiar';
          }, 2000);

          // Record usage
          sendMessage({ action: 'recordScriptUse', scriptId: script.id });
        });
      }

      resultsContainer.appendChild(card);
    });
  }

  function getPlanLabel(plan) {
    const labels = {
      starter: '',
      professional: 'Pro',
      expert: 'Expert',
    };
    return labels[plan] || '';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Keyboard shortcut: Enter in search triggers search
  // ---------------------------------------------------------------------------
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        performSearch(query);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------
  init();
})();
