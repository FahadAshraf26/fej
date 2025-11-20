import type { NextApiRequest, NextApiResponse } from "next";
import encryptionService from "@services/EncryptionService";
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(403).json({ error: "invalid token" });
  }
  const decodedToken = token
    ? JSON.parse(encryptionService.decrypt(token))
    : null;

  if (!decodedToken || decodedToken.e < Date.now()) {
    return res.status(403).json({ error: "invalid token" });
  }
  return res.status(200).json({ subscription: decodedToken });
}
