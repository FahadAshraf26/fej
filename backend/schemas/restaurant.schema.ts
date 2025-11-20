// backend/schemas/restaurant.schema.ts
import { z } from "zod";

// Define the restaurant schema first since it's nested in the user
const restaurantSchema = z.object({
  id: z.number(),
  created_at: z.string().nullable().optional(),
  owner_id: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  location: z.array(z.string()).nullable().optional(),
  slack_channel_id: z.string().nullable().optional(),
  isAutoLayout: z.boolean().nullable().optional(),
  dietaryIcons: z.array(z.any()).nullable().optional(),
  subscription_override: z.boolean().nullable().optional(),
});

// Define the user schema based on your actual structure
export const userSchema = z.object({
  id: z.string().uuid().optional(),
  role: z.string(),
  restaurant_id: z.string(),
  // Optional fields
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  subscriptionActive: z.boolean().nullable().optional(),
  subscriptionExpiry: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  stripe_customer_id: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  trialActivated: z.boolean().nullable().optional(),
  trialStartDate: z.string().nullable().optional(),
  trialEndDate: z.string().nullable().optional(),
  chargeCount: z.number().nullable().optional(),
  chargeStartDate: z.string().nullable().optional(),
  chargeEndDate: z.string().nullable().optional(),
  trialStatus: z.string().nullable().optional(),
  showMenuChange: z.boolean().nullable().optional(),
  restaurant: restaurantSchema.optional(),
});

export const getUserRestaurantsSchema = z.object({
  user: userSchema,
});

export const getRestaurantLocationsSchema = z.object({
  restaurantId: z.string().min(1),
});

export const deleteRestaurantSchema = z.object({
  restaurantId: z.string().min(1),
});

export const getRestaurantStatsSchema = z.object({
  restaurantId: z.string().min(1),
});

// Inferred types
export type User = z.infer<typeof userSchema>;
export type GetUserRestaurantsInput = z.infer<typeof getUserRestaurantsSchema>;
export type GetRestaurantLocationsInput = z.infer<typeof getRestaurantLocationsSchema>;
export type DeleteRestaurantInput = z.infer<typeof deleteRestaurantSchema>;
export type GetRestaurantStatsInput = z.infer<typeof getRestaurantStatsSchema>;
