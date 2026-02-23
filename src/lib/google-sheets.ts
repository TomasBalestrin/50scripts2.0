import { google } from 'googleapis';

// Support both GOOGLE_SHEETS_* and shorter env var names
const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
  process.env.SPREADSHEET_ID ||
  '1rtohLahmiGw1F9zclMjDJQOBXyQ_cXwIeAiutyTkRHQ';
const SHEET_NAME =
  process.env.GOOGLE_SHEETS_SHEET_NAME ||
  process.env.SHEET_NAME ||
  'Sheet1';

function getAuth() {
  const clientEmail =
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL;
  const rawKey =
    process.env.GOOGLE_SHEETS_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;
  const privateKey = rawKey?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    console.warn('[Google Sheets] Missing credentials:', {
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!rawKey,
      envKeysChecked: [
        'GOOGLE_SHEETS_CLIENT_EMAIL',
        'CLIENT_EMAIL',
        'GOOGLE_SHEETS_PRIVATE_KEY',
        'PRIVATE_KEY',
      ],
    });
    return null;
  }

  console.log('[Google Sheets] Auth configured for:', clientEmail);

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export async function appendToSheet(row: string[]) {
  const auth = getAuth();
  if (!auth) {
    console.warn('Google Sheets credentials not configured, skipping sync');
    return;
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    // Timeout after 8 seconds to avoid blocking the caller
    const appendPromise = sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Google Sheets timeout after 8s')), 8000)
    );

    await Promise.race([appendPromise, timeout]);
    console.log('[Google Sheets] Row appended successfully');
  } catch (err: unknown) {
    const errObj = err as { message?: string; code?: number; response?: { data?: unknown } };
    console.error('[Google Sheets] Append error:', {
      message: errObj?.message,
      code: errObj?.code,
      response: errObj?.response?.data,
      spreadsheetId: SPREADSHEET_ID,
      sheetName: SHEET_NAME,
    });
    // Re-throw so callers know it failed
    throw err;
  }
}
