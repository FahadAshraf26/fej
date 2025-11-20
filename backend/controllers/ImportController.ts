import { ImportService } from '../services/ImportService';
import { NextApiRequest, NextApiResponse } from 'next';

export class ImportController {
  static async processMenu(req: NextApiRequest, res: NextApiResponse) {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { fileUrls, fileTypes, restaurantInfo } = req.body;

      const result = await ImportService.processMenuImages({
        fileUrls,
        fileTypes,
        restaurantInfo
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Import controller error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  }
}
