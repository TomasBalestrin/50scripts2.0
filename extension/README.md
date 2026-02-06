# 50 Scripts 2.0 - Chrome Extension for WhatsApp Web

Browser extension that integrates 50 Scripts 2.0 directly into WhatsApp Web, allowing you to search, browse, and insert persuasive scripts into your conversations without leaving the chat.

## Features

- Injects a floating button next to the WhatsApp Web input field
- Inline search panel for quick script lookup directly in WhatsApp
- Popup interface with full script browser and category filters
- One-click insertion of scripts into the active conversation
- Copy-to-clipboard support
- Authentication via Supabase (same credentials as the main app)
- Automatic session refresh

## Installation (Developer / Unpacked)

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `extension/` directory from this project
5. The extension icon will appear in the Chrome toolbar

### Icon placeholder

The manifest references icon files at `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png`. You need to provide these PNG images. Recommended approach:

- Create a simple icon with "50S" text on a `#E94560` background
- Export at 16x16, 48x48, and 128x128 pixels
- Place them in the `extension/icons/` directory

## Configuration

Before you can log in, you must configure the extension with your Supabase project credentials.

1. Click the extension icon in the Chrome toolbar
2. If not yet configured, the **Settings** screen appears automatically
3. Fill in:
   - **URL da API (App)**: The base URL of your 50 Scripts app (default: `http://localhost:3000`)
   - **Supabase URL**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Supabase Anon Key**: Your Supabase project's anonymous/public key
4. Click **Salvar Configuracao**

You can find these values in the main project's `.env.local` file:
- `NEXT_PUBLIC_SUPABASE_URL` -> Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> Supabase Anon Key

## Authentication

1. After configuring Supabase credentials, the login screen appears
2. Enter the same email and password you use on the main 50 Scripts 2.0 app
3. Click **Entrar**
4. Once authenticated, you will see the script browser

Your session persists across browser restarts. The extension automatically refreshes expired tokens.

## Usage

### Via the popup (toolbar icon)

1. Click the 50 Scripts extension icon in the Chrome toolbar
2. Use the search bar to find scripts by keyword
3. Browse categories using the tab filters
4. Click **Inserir no WhatsApp** to insert the script text into the active WhatsApp conversation
5. Click **Copiar** to copy the text to your clipboard

### Via the inline button (WhatsApp Web)

1. Open a conversation in WhatsApp Web
2. A small red circular button appears near the chat input area
3. Click it to open the inline search panel
4. Search for scripts and click **Inserir** to insert directly
5. Press Escape or click outside the panel to close it

## Permissions Explained

| Permission | Why it is needed |
|---|---|
| `storage` | Store authentication tokens, user preferences, and Supabase configuration locally |
| `activeTab` | Communicate with the WhatsApp Web tab to insert script text into the chat input |
| `https://web.whatsapp.com/*` (host) | Inject the content script and styles into WhatsApp Web pages |

## Troubleshooting

**Button does not appear in WhatsApp Web**
- Make sure you have a conversation open (the button appears next to the input field)
- Try reloading the WhatsApp Web tab
- Check that the extension is enabled at `chrome://extensions/`

**"Supabase URL and Anon Key not configured" error**
- Open the popup and go to Settings to enter your Supabase credentials

**Script insertion does not work**
- WhatsApp Web uses a complex React-based DOM. If insertion fails, use the **Copy** button and paste manually
- Reload WhatsApp Web if the DOM structure has changed

**Session expired**
- The extension automatically refreshes tokens. If it fails, click the extension icon and log in again

## Architecture

```
extension/
  manifest.json          Manifest V3 configuration
  background.js          Service worker: auth, API calls, token management
  content-script.js      Injected into WhatsApp Web: button, inline panel, text insertion
  popup.html             Popup UI structure
  popup.js               Popup logic: login, search, browse, insert
  popup.css              Popup dark theme styles
  styles.css             Content script styles (injected into WhatsApp Web)
  icons/                 Extension icons (16, 48, 128 px)
  README.md              This file
```

## Development

To make changes and test:

1. Edit the files in this directory
2. Go to `chrome://extensions/`
3. Click the refresh icon on the 50 Scripts extension card
4. Reload WhatsApp Web to pick up content script changes

The extension uses vanilla JavaScript (no build step required). All API communication goes through the background service worker to avoid CORS issues.
