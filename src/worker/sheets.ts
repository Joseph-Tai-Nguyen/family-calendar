/**
 * Google Sheets storage: one spreadsheet per user (created by the app, so it is
 * visible under the `drive.file` scope), one tab per table in src/shared/schema.ts.
 */
import { TABLE_NAMES, TABLES, type Tables } from '../shared/schema';

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

export class SheetsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new SheetsError(`Sheets API ${res.status}: ${text.slice(0, 300)}`, res.status);
  }
  return res.json() as Promise<T>;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export async function createSpreadsheet(token: string, title: string): Promise<SpreadsheetInfo> {
  const body = {
    properties: { title },
    sheets: TABLE_NAMES.map((name, i) => ({
      properties: { title: name, index: i, gridProperties: { frozenRowCount: 1 } },
    })),
  };
  const res = await call<SpreadsheetInfo>(token, API, { method: 'POST', body: JSON.stringify(body) });
  await writeTables(
    token,
    res.spreadsheetId,
    Object.fromEntries(TABLE_NAMES.map((n) => [n, [[...TABLES[n]]]])) as unknown as Tables,
  );
  return { spreadsheetId: res.spreadsheetId, spreadsheetUrl: res.spreadsheetUrl };
}

/** Adds tabs that are missing (e.g. after a schema upgrade or if the user deleted one). */
export async function ensureTabs(token: string, spreadsheetId: string): Promise<string> {
  const meta = await call<{ spreadsheetUrl: string; sheets: { properties: { title: string } }[] }>(
    token,
    `${API}/${spreadsheetId}?fields=spreadsheetUrl,sheets.properties.title`,
  );
  const existing = new Set(meta.sheets.map((s) => s.properties.title));
  const missing = TABLE_NAMES.filter((n) => !existing.has(n));
  if (missing.length) {
    await call(token, `${API}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: missing.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })),
      }),
    });
  }
  return meta.spreadsheetUrl;
}

export async function readTables(token: string, spreadsheetId: string): Promise<Partial<Tables>> {
  const qs = TABLE_NAMES.map((n) => `ranges=${encodeURIComponent(n)}`).join('&');
  const res = await call<{ valueRanges: { range: string; values?: string[][] }[] }>(
    token,
    `${API}/${spreadsheetId}/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
  );
  const out: Partial<Tables> = {};
  res.valueRanges.forEach((vr, i) => {
    out[TABLE_NAMES[i]] = (vr.values ?? []).map((row) => row.map((c) => (c === null || c === undefined ? '' : String(c))));
  });
  return out;
}

/** Replace the content of every tab (small personal datasets, so a full rewrite is simplest and consistent). */
export async function writeTables(token: string, spreadsheetId: string, tables: Tables): Promise<void> {
  await call(token, `${API}/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    body: JSON.stringify({ ranges: TABLE_NAMES.map((n) => n) }),
  });
  await call(token, `${API}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: TABLE_NAMES.map((n) => ({ range: `${n}!A1`, majorDimension: 'ROWS', values: tables[n] })),
    }),
  });
}
