import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1rtohLahmiGw1F9zclMjDJQOBXyQ_cXwIeAiutyTkRHQ';
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1';

function getAuth() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

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

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
  } catch (err) {
    console.error('Google Sheets append error:', err);
  }
}
