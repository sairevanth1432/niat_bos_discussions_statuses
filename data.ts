import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sheetId = req.body?.sheetId || process.env.GOOGLE_SHEET_ID || "";
    const apiKey = req.body?.apiKey || process.env.GOOGLE_SHEETS_API_KEY || "";
    const sheetName = req.body?.sheetName || "Sheet1";

    if (!sheetId || !apiKey) {
      return res.status(400).json({ error: "Missing Sheet ID or API Key configuration." });
    }

    const sheets = google.sheets({ version: "v4", auth: apiKey });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.json({
        title: sheetName,
        headers: [],
        data: [],
        totalRows: 0,
        lastUpdated: new Date().toISOString(),
      });
    }

    const headers = rows[0].map((h: string, i: number) => h?.trim() || `Column_${i + 1}`);
    const dataRows = rows.slice(1).map((row: any[], rowIndex: number) => {
      const obj: Record<string, string> = { _rowIndex: String(rowIndex) };
      headers.forEach((header: string, colIndex: number) => {
        obj[header] = row[colIndex] !== undefined && row[colIndex] !== null ? String(row[colIndex]) : "";
      });
      return obj;
    });

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: "properties.title",
    });

    return res.json({
      title: meta.data.properties?.title || "Untitled Spreadsheet",
      headers,
      data: dataRows,
      totalRows: dataRows.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    const gaxiosError = error?.response?.data?.error;
    const httpStatus = error?.response?.status;
    const errorMessage = gaxiosError?.message || error?.message || "Unknown error";

    console.error("Sheet data fetch error:", httpStatus, errorMessage);

    if (httpStatus === 400 && errorMessage.includes("Unable to parse range")) {
      return res.status(400).json({
        error: `Sheet tab "${req.body?.sheetName}" was not found. Check the exact tab name (it's case-sensitive).`,
      });
    }

    return res.status(httpStatus >= 400 ? httpStatus : 500).json({
      error: `Failed to fetch data: ${errorMessage}`,
    });
  }
}
