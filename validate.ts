import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

function getApiKey(bodyKey?: string): string {
  return bodyKey || process.env.GOOGLE_SHEETS_API_KEY || "";
}
function getSheetId(bodyId?: string): string {
  return bodyId || process.env.GOOGLE_SHEET_ID || "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sheetId = getSheetId(req.body?.sheetId);
    const apiKey = getApiKey(req.body?.apiKey);

    if (!sheetId || sheetId.length < 5) {
      return res.status(400).json({ valid: false, error: "No Sheet ID configured." });
    }
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ valid: false, error: "No API Key configured." });
    }

    const sheets = google.sheets({ version: "v4", auth: apiKey });
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheetNames = spreadsheet.data.sheets?.map(
      (s) => s.properties?.title || "Sheet1"
    ) || ["Sheet1"];

    return res.json({
      valid: true,
      title: spreadsheet.data.properties?.title || "Untitled",
      sheetNames,
    });
  } catch (error: any) {
    const gaxiosError = error?.response?.data?.error;
    const httpStatus = error?.response?.status || error?.code;
    const errorMessage = gaxiosError?.message || error?.message || "";

    console.error("Sheet validation error:", httpStatus, errorMessage);

    if (httpStatus === 403) {
      if (errorMessage.includes("API has not been used") || errorMessage.includes("API has not been enabled") || errorMessage.includes("sheets.googleapis.com")) {
        return res.status(403).json({
          valid: false,
          error: "The Google Sheets API is not enabled for your project. Go to Google Cloud Console > APIs & Services > Enable APIs, search for 'Google Sheets API' and enable it.",
          errorType: "API_NOT_ENABLED",
        });
      }
      return res.status(403).json({
        valid: false,
        error: "Access denied. This could mean: (1) Your API key is invalid or restricted, (2) The spreadsheet is not shared publicly.",
        errorType: "FORBIDDEN",
      });
    }

    if (httpStatus === 401) {
      return res.status(401).json({
        valid: false,
        error: "Invalid API Key. Please double-check it in Google Cloud Console.",
        errorType: "INVALID_KEY",
      });
    }

    if (httpStatus === 404) {
      return res.status(404).json({
        valid: false,
        error: "Spreadsheet not found. Make sure the Sheet ID is correct.",
        errorType: "NOT_FOUND",
      });
    }

    return res.status(500).json({
      valid: false,
      error: `Connection failed: ${errorMessage || "Unknown error"}.`,
      errorType: "UNKNOWN",
    });
  }
}
