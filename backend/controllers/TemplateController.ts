// backend/controllers/TemplateController.ts
import { NextApiRequest, NextApiResponse } from "next";
import { formidable } from "formidable";
import { validateRequest } from "../utils/validation";
import {
  getTemplatesByRestaurantIdSchema,
  deleteTemplateSchema,
  renameTemplateSchema,
  duplicateTemplateSchema,
  toggleGlobalTemplateSchema,
  transferTemplateSchema,
  updateTemplateLocationSchema,
  updateAutoLayoutStatusSchema,
  updateTemplatePublishedStatusSchema,
} from "../schemas/template.schema";
import { z } from "zod";
import * as fs from "fs";
import { TemplateService } from "../services/template/TemplateService";
import { container, injectable } from "tsyringe";

@injectable()
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  /**
   * Get templates by restaurant ID
   */
  async getTemplatesByRestaurantId(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(getTemplatesByRestaurantIdSchema, req, res, "query");

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { restaurantId, page, pageSize } = validation.data!;
      const templates = await this.templateService.getTemplatesByRestaurantId(
        restaurantId,
        page,
        pageSize
      );
      return res.status(200).json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      return res.status(500).json({ error: "Failed to fetch templates" });
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(deleteTemplateSchema, req, res, "query");

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { templateId, userId } = validation.data!;
      await this.templateService.deleteTemplate(parseInt(templateId), userId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting template:", error);
      return res.status(500).json({ error: "Failed to delete template" });
    }
  }

  /**
   * Rename a template
   */
  async renameTemplate(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(renameTemplateSchema, req, res);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { id, name, description } = validation.data!;
      await this.templateService.renameTemplate(id, name, description);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error renaming template:", error);
      return res.status(500).json({ error: "Failed to rename template" });
    }
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(duplicateTemplateSchema, req, res);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { id, name, description, userId } = validation.data!;
      const duplicatedTemplate = await this.templateService.duplicateTemplate(
        id,
        name,
        description,
        userId
      );

      return res.status(200).json(duplicatedTemplate);
    } catch (error) {
      console.error("Error duplicating template:", error);
      return res.status(500).json({ error: "Failed to duplicate template" });
    }
  }

  /**
   * Toggle global status
   */
  async toggleGlobalTemplate(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(toggleGlobalTemplateSchema, req, res);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { templateId, userId } = validation.data!;
      await this.templateService.toggleGlobalTemplate(templateId, userId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error toggling global status:", error);
      return res.status(500).json({ error: "Failed to update global status" });
    }
  }

  /**
   * Transfer template to another restaurant
   */
  async transferTemplate(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(transferTemplateSchema, req, res);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { templateId, restaurantId, locationId } = validation.data!;
      await this.templateService.transferTemplate(templateId, restaurantId, locationId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error transferring template:", error);
      return res.status(500).json({ error: "Failed to transfer template" });
    }
  }

  /**
   * Update template location
   */
  async updateTemplateLocation(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(updateTemplateLocationSchema, req, res);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { templateId, locationId } = validation.data!;
      const template = await this.templateService.updateTemplateLocation(templateId, locationId);
      return res.status(200).json(template);
    } catch (error) {
      console.error("Error updating template location:", error);
      return res.status(500).json({ error: "Failed to update template location" });
    }
  }

  /**
   * Update auto layout status
   */
  async updateAutoLayoutStatus(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(updateAutoLayoutStatusSchema, req, res);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { templateId, isAutoLayout } = validation.data!;
      await this.templateService.updateAutoLayoutStatus(templateId, isAutoLayout);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating auto layout status:", error);
      return res.status(500).json({ error: "Failed to update auto layout status" });
    }
  }

  /**
   * Upload cover image - special handling for file uploads
   */
  async uploadCoverImage(req: NextApiRequest, res: NextApiResponse) {
    try {
      const form = formidable({ multiples: false });

      const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve([fields, files]);
        });
      });

      const templateIdSchema = z.object({
        templateId: z.union([z.string(), z.array(z.string())]).transform((val) => {
          const stringValue = Array.isArray(val) ? val[0] : val;
          return parseInt(stringValue, 10);
        }),
      });

      const result = templateIdSchema.safeParse(fields);

      if (!result.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: result.error.format(),
        });
      }

      const { templateId } = result.data;

      const coverImageFile = Array.isArray(files.coverImage)
        ? files.coverImage[0]
        : files.coverImage;

      if (!coverImageFile) {
        return res.status(400).json({ error: "Cover image file is required" });
      }

      const fileContent = await fs.promises.readFile(coverImageFile.filepath);

      const fileBlob = new Blob([new Uint8Array(fileContent)], {
        type: coverImageFile.mimetype,
      });

      await this.templateService.uploadCoverImage(templateId, fileBlob);

      return res.status(200).json({
        success: true,
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/renderings/${templateId}/coverImage`,
      });
    } catch (error) {
      console.error("Error uploading cover image:", error);
      return res.status(500).json({ error: "Failed to upload cover image" });
    }
  }

  /**
   * Update template published status
   */
  async updateTemplatePublishedStatus(req: NextApiRequest, res: NextApiResponse) {
    try {
      const validation = await validateRequest(updateTemplatePublishedStatusSchema, req, res);

      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error?.format(),
        });
      }

      const { templateId, isPublished } = validation.data!;
      await this.templateService.updateTemplatePublishedStatus(templateId, isPublished);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating template published status:", error);
      return res.status(500).json({ error: "Failed to update template published status" });
    }
  }
}

export const templateController = container.resolve(TemplateController);
