/**
 * 50 Scripts 2.0 - Content Script for WhatsApp Web
 * Injects the scripts button next to the chat input and handles text insertion.
 */

(function () {
  'use strict';

  // Avoid double-injection
  if (window.__50scripts_injected) return;
  window.__50scripts_injected = true;

  const BUTTON_ID = 'scripts50-inject-btn';
  const PANEL_ID = 'scripts50-panel';
  const PREFIX = 'scripts50';

  let currentObserver = null;
  let panelVisible = false;

  // ---------------------------------------------------------------------------
  // Utility: wait for an element matching a selector
  // ---------------------------------------------------------------------------
  function waitForElement(selector, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for element: ${selector}`));
      }, timeout);
    });
  }

  // ---------------------------------------------------------------------------
  // Find the WhatsApp chat footer (input area)
  // ---------------------------------------------------------------------------
  function findChatFooter() {
    // WhatsApp Web uses a footer element containing the input area
    // The contenteditable div is inside the footer
    const selectors = [
      'footer',
      '[data-testid="conversation-compose-box-input"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][role="textbox"]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function findInputField() {
    const selectors = [
      '[data-testid="conversation-compose-box-input"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][role="textbox"]',
      'footer div[contenteditable="true"]',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function findInputContainer() {
    const input = findInputField();
    if (!input) return null;

    // Walk up to find a reasonable container to place our button next to
    let container = input.closest('footer') || input.parentElement?.parentElement?.parentElement;
    return container;
  }

  // ---------------------------------------------------------------------------
  // Insert text into WhatsApp input field
  // ---------------------------------------------------------------------------
  function insertTextIntoChat(text) {
    try {
      const input = findInputField();
      if (!input) {
        console.warn('[50Scripts] Could not find WhatsApp input field');
        showToast('Erro: campo de texto nao encontrado. Abra uma conversa primeiro.');
        return false;
      }

      // Focus the input
      input.focus();

      // Clear existing content
      input.textContent = '';

      // Use the document.execCommand approach which works well with React-based inputs
      // This simulates a real user paste action
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      });

      input.dispatchEvent(pasteEvent);

      // Fallback: if paste didn't work, set innerHTML directly and dispatch events
      if (!input.textContent || input.textContent.trim() === '') {
        input.textContent = text;

        // Dispatch input event so React picks up the change
        input.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text,
        }));
      }

      // Ensure WhatsApp sees the change by also firing a generic Event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      showToast('Script inserido com sucesso!');
      return true;
    } catch (err) {
      console.error('[50Scripts] Error inserting text:', err);
      showToast('Erro ao inserir script. Tente copiar manualmente.');
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Toast notification
  // ---------------------------------------------------------------------------
  function showToast(message, duration = 3000) {
    // Remove existing toast
    const existing = document.getElementById(`${PREFIX}-toast`);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = `${PREFIX}-toast`;
    toast.className = `${PREFIX}-toast`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add(`${PREFIX}-toast--visible`);
    });

    setTimeout(() => {
      toast.classList.remove(`${PREFIX}-toast--visible`);
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ---------------------------------------------------------------------------
  // Create the inject button
  // ---------------------------------------------------------------------------
  function createButton() {
    // Don't create if already exists
    if (document.getElementById(BUTTON_ID)) return;

    const footer = findChatFooter();
    if (!footer) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.className = `${PREFIX}-btn`;
    btn.title = '50 Scripts - Inserir script';
    btn.setAttribute('aria-label', '50 Scripts - Inserir script');

    // SVG icon: stylized "50S" text
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 5h6v2H6v2h4v2H6v4H4V5z" fill="currentColor"/>
        <path d="M12 5h4a3 3 0 0 1 0 6h-2v4h-2V5zm2 4h2a1 1 0 1 0 0-2h-2v2z" fill="currentColor"/>
        <path d="M19 9l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    });

    // Insert button into footer area
    // Try to find the row of action buttons (attach, emoji, etc.)
    const footerEl = document.querySelector('footer');
    if (footerEl) {
      // Look for the row containing buttons (usually has emoji, attach, etc.)
      const buttonRow = footerEl.querySelector('[data-testid="compose-btn-attach"]')?.parentElement
        || footerEl.querySelector('button')?.parentElement
        || footerEl;

      if (buttonRow && buttonRow !== footerEl) {
        buttonRow.insertBefore(btn, buttonRow.firstChild);
      } else {
        // Fallback: prepend to footer
        footerEl.insertBefore(btn, footerEl.firstChild);
      }
    } else {
      // Last fallback: add near input
      const input = findInputField();
      if (input && input.parentElement) {
        input.parentElement.insertBefore(btn, input);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Inline search panel
  // ---------------------------------------------------------------------------
  function createPanel() {
    if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = `${PREFIX}-panel`;

    panel.innerHTML = `
      <div class="${PREFIX}-panel__header">
        <span class="${PREFIX}-panel__title">50 Scripts</span>
        <button class="${PREFIX}-panel__close" aria-label="Fechar">&times;</button>
      </div>
      <div class="${PREFIX}-panel__search">
        <input
          type="text"
          class="${PREFIX}-panel__input"
          placeholder="Buscar scripts..."
          autocomplete="off"
        />
      </div>
      <div class="${PREFIX}-panel__results">
        <div class="${PREFIX}-panel__empty">
          Digite para buscar scripts...
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Close button
    panel.querySelector(`.${PREFIX}-panel__close`).addEventListener('click', () => {
      hidePanel();
    });

    // Search input with debounce
    const searchInput = panel.querySelector(`.${PREFIX}-panel__input`);
    let searchTimeout = null;

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();

      if (query.length < 2) {
        renderResults([]);
        return;
      }

      searchTimeout = setTimeout(() => {
        searchScripts(query);
      }, 350);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (panelVisible && !panel.contains(e.target) && e.target.id !== BUTTON_ID) {
        hidePanel();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panelVisible) {
        hidePanel();
      }
    });

    return panel;
  }

  function togglePanel() {
    if (panelVisible) {
      hidePanel();
    } else {
      showPanel();
    }
  }

  function showPanel() {
    const panel = createPanel();
    panel.classList.add(`${PREFIX}-panel--visible`);
    panelVisible = true;

    // Focus search input
    setTimeout(() => {
      const input = panel.querySelector(`.${PREFIX}-panel__input`);
      if (input) input.focus();
    }, 100);
  }

  function hidePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) {
      panel.classList.remove(`${PREFIX}-panel--visible`);
    }
    panelVisible = false;
  }

  // ---------------------------------------------------------------------------
  // Search scripts via background service worker
  // ---------------------------------------------------------------------------
  async function searchScripts(query) {
    const resultsContainer = document.querySelector(`.${PREFIX}-panel__results`);
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `<div class="${PREFIX}-panel__loading">Buscando...</div>`;

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'searchScripts', query }, resolve);
      });

      if (response.error) {
        if (response.status === 401) {
          resultsContainer.innerHTML = `
            <div class="${PREFIX}-panel__empty">
              <p>Voce precisa fazer login.</p>
              <p style="font-size: 12px; opacity: 0.7;">Clique no icone da extensao na barra do Chrome para entrar.</p>
            </div>
          `;
        } else {
          resultsContainer.innerHTML = `
            <div class="${PREFIX}-panel__empty ${PREFIX}-panel__error">
              Erro: ${response.error}
            </div>
          `;
        }
        return;
      }

      const scripts = response.data?.scripts || [];
      renderResults(scripts);
    } catch (err) {
      console.error('[50Scripts] Search error:', err);
      resultsContainer.innerHTML = `
        <div class="${PREFIX}-panel__empty ${PREFIX}-panel__error">
          Erro ao buscar scripts.
        </div>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // Render search results
  // ---------------------------------------------------------------------------
  function renderResults(scripts) {
    const resultsContainer = document.querySelector(`.${PREFIX}-panel__results`);
    if (!resultsContainer) return;

    if (!scripts || scripts.length === 0) {
      resultsContainer.innerHTML = `
        <div class="${PREFIX}-panel__empty">
          ${document.querySelector(`.${PREFIX}-panel__input`)?.value?.trim()
            ? 'Nenhum script encontrado.'
            : 'Digite para buscar scripts...'}
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = '';

    scripts.forEach((script) => {
      const card = document.createElement('div');
      card.className = `${PREFIX}-card${script.is_locked ? ` ${PREFIX}-card--locked` : ''}`;

      const preview = (script.content || '').substring(0, 120).replace(/\n/g, ' ');
      const planBadge = script.min_plan && script.min_plan !== 'starter'
        ? `<span class="${PREFIX}-badge ${PREFIX}-badge--${script.min_plan}">${script.min_plan}</span>`
        : '';

      card.innerHTML = `
        <div class="${PREFIX}-card__header">
          <span class="${PREFIX}-card__title">${escapeHtml(script.title || 'Sem titulo')}</span>
          ${planBadge}
        </div>
        <p class="${PREFIX}-card__preview">${escapeHtml(preview)}${preview.length >= 120 ? '...' : ''}</p>
        <div class="${PREFIX}-card__actions">
          ${script.is_locked
            ? `<span class="${PREFIX}-card__locked-msg">Upgrade necessario</span>`
            : `
              <button class="${PREFIX}-card__btn ${PREFIX}-card__btn--insert" data-script-id="${script.id}">
                Inserir
              </button>
              <button class="${PREFIX}-card__btn ${PREFIX}-card__btn--copy" data-script-id="${script.id}">
                Copiar
              </button>
            `
          }
        </div>
      `;

      if (!script.is_locked) {
        // Insert button
        card.querySelector(`.${PREFIX}-card__btn--insert`).addEventListener('click', () => {
          insertTextIntoChat(script.content);
          hidePanel();

          // Record usage
          chrome.runtime.sendMessage({
            action: 'recordScriptUse',
            scriptId: script.id,
          });
        });

        // Copy button
        card.querySelector(`.${PREFIX}-card__btn--copy`).addEventListener('click', () => {
          navigator.clipboard.writeText(script.content).then(() => {
            showToast('Script copiado!');
          }).catch(() => {
            showToast('Erro ao copiar.');
          });

          // Record usage
          chrome.runtime.sendMessage({
            action: 'recordScriptUse',
            scriptId: script.id,
          });
        });
      }

      resultsContainer.appendChild(card);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Listen for messages from popup / background
  // ---------------------------------------------------------------------------
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.action) {
        case 'insertScript': {
          const success = insertTextIntoChat(message.text);
          sendResponse({ success });
          break;
        }

        case 'ping': {
          sendResponse({ alive: true });
          break;
        }

        default:
          sendResponse({ error: `Unknown action: ${message.action}` });
      }
    } catch (err) {
      console.error('[50Scripts] Message handler error:', err);
      sendResponse({ error: err.message });
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // Observe DOM changes to re-inject button when conversation changes
  // ---------------------------------------------------------------------------
  function startObserving() {
    // Disconnect previous observer
    if (currentObserver) {
      currentObserver.disconnect();
    }

    currentObserver = new MutationObserver(() => {
      // Check if button still exists, re-inject if needed
      if (!document.getElementById(BUTTON_ID)) {
        try {
          createButton();
        } catch (err) {
          // WhatsApp DOM might be in transition, ignore and retry on next mutation
        }
      }
    });

    // Observe the main app container
    const appContainer = document.getElementById('app') || document.body;
    currentObserver.observe(appContainer, {
      childList: true,
      subtree: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Initialize
  // ---------------------------------------------------------------------------
  async function init() {
    console.log('[50Scripts] Content script loaded. Waiting for WhatsApp Web...');

    try {
      // Wait for WhatsApp Web to load its main UI
      await waitForElement('#app .two, #app [data-testid="chat-list"]', 60000);
      console.log('[50Scripts] WhatsApp Web detected. Injecting button...');

      // Small delay to let WhatsApp finish rendering
      await new Promise((resolve) => setTimeout(resolve, 2000));

      createButton();
      startObserving();

      console.log('[50Scripts] Ready.');
    } catch (err) {
      console.warn('[50Scripts] WhatsApp Web did not load in time. Will retry on mutations.');

      // Fallback: start observing anyway, create button when footer appears
      const fallbackObserver = new MutationObserver(() => {
        const footer = findChatFooter();
        if (footer && !document.getElementById(BUTTON_ID)) {
          try {
            createButton();
            startObserving();
            fallbackObserver.disconnect();
            console.log('[50Scripts] Button injected via fallback observer.');
          } catch (e) {
            // Ignore, will retry
          }
        }
      });

      fallbackObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Start initialization
  init();
})();
