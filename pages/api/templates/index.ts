// pages/api/templates/index.ts
import { NextApiResponse } from "next";
import { NextApiRequest } from "next";
import formidable from "formidable";
import { container } from "tsyringe";
import { TemplateController } from "@controllers/TemplateController";
export const config = {
  api: {
    bodyParser: false, // Disable built-in bodyParser for file uploads
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const templateController = container.resolve(TemplateController);
  // Route based on HTTP method
  switch (req.method) {
    case "GET":
      // Get templates by restaurant ID
      return templateController.getTemplatesByRestaurantId(req, res);

    case "POST":
      // For file uploads, we'll just pass to the controller which handles formidable
      if (req.headers["content-type"]?.includes("multipart/form-data")) {
        return templateController.uploadCoverImage(req, res);
      }

      // For non-file requests, parse the body using formidable
      const form = formidable({ multiples: false });
      const [fields] = await new Promise<[any, any]>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      });
      req.body = fields;
      // Switch based on action
      switch (req.body.action) {
        case "duplicate":
          return templateController.duplicateTemplate(req, res);
        case "rename":
          return templateController.renameTemplate(req, res);
        case "toggleGlobal":
          return templateController.updateTemplatePublishedStatus(req, res);
        case "transferTemplate":
          return templateController.transferTemplate(req, res);
        case "updateLocation":
          return templateController.updateTemplateLocation(req, res);
        case "updateAutoLayout":
          return templateController.updateAutoLayoutStatus(req, res);
        default:
          return res.status(400).json({ error: "Invalid action" });
      }

    case "DELETE":
      // Delete template
      return templateController.deleteTemplate(req, res);

    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}
