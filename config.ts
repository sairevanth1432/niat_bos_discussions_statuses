import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const hasApiKey = !!process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID || "";
  return res.json({
    hasServerConfig: hasApiKey && !!sheetId,
    sheetId: sheetId,
  });
}
