// backend/schemas/template.schema.ts
import { z } from "zod";

// Common schemas that can be reused
const idSchema = z.number().int().positive();
const stringIdSchema = z.string().min(1);
const optionalDescriptionSchema = z.string().optional().default("");

// Request schemas
export const getTemplatesByRestaurantIdSchema = z.object({
  restaurantId: stringIdSchema,
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().default(15),
});

export const deleteTemplateSchema = z.object({
  templateId: stringIdSchema,
  userId: stringIdSchema,
});

export const renameTemplateSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: optionalDescriptionSchema,
});

export const duplicateTemplateSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: optionalDescriptionSchema,
  userId: stringIdSchema,
});

export const toggleGlobalTemplateSchema = z.object({
  templateId: idSchema,
  userId: stringIdSchema,
});

export const transferTemplateSchema = z.object({
  templateId: idSchema,
  restaurantId: stringIdSchema,
  locationId: z.string().optional().default(""),
});

export const updateTemplateLocationSchema = z.object({
  templateId: idSchema,
  locationId: stringIdSchema,
});

export const updateAutoLayoutStatusSchema = z.object({
  templateId: idSchema,
  isAutoLayout: z.boolean(),
});

export const updateTemplatePublishedStatusSchema = z.object({
  templateId: idSchema,
  isPublished: z.boolean(),
});

export const archiveTemplateSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  content: z.array(z.any()).optional(),
  restaurant_id: z.string().nullable(),
  location: z.string().nullable(),
  isGlobal: z.boolean().nullable(),
  createdBy: z.string().uuid().nullable(),
  menuSize: z.string().nullable(),
  templateOrder: z.number().nullable(),
  tags: z.string().nullable(),
  updatedAt: z.string().nullable(),
  printPreview: z.number().nullable(),
});

// Note: we also extract the inferred types from schemas
export type GetTemplatesByRestaurantIdInput = z.infer<typeof getTemplatesByRestaurantIdSchema>;
export type DeleteTemplateInput = z.infer<typeof deleteTemplateSchema>;
export type RenameTemplateInput = z.infer<typeof renameTemplateSchema>;
export type DuplicateTemplateInput = z.infer<typeof duplicateTemplateSchema>;
export type ToggleGlobalTemplateInput = z.infer<typeof toggleGlobalTemplateSchema>;
export type TransferTemplateInput = z.infer<typeof transferTemplateSchema>;
export type UpdateTemplateLocationInput = z.infer<typeof updateTemplateLocationSchema>;
export type UpdateAutoLayoutStatusInput = z.infer<typeof updateAutoLayoutStatusSchema>;
export type UpdateTemplatePublishedStatusInput = z.infer<
  typeof updateTemplatePublishedStatusSchema
>;
