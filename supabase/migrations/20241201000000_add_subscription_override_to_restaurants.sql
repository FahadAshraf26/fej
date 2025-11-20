-- Add subscription_override field to restaurants table
ALTER TABLE "public"."restaurants" 
ADD COLUMN "subscription_override" boolean DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN "public"."restaurants"."subscription_override" IS 'When true, allows access to editor with any active subscription (design or editor) for this restaurant';
