import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    tenantId: process.env.MICROSOFT_TENANT_ID || "",
  });
}
