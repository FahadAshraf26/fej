import { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";
import { createClient } from "@supabase/supabase-js";
import { decryptData, encryptData } from "../../helpers/enryption";
import { getUserRepository } from "../../lib/container";

// Types for better type safety
interface InviteUserRequest {
  contact: string;
  contactType: "email" | "phone";
  restaurantName: string;
  restaurantId: string;
}

interface ProfileData {
  id: string;
  email?: string;
  phone?: string;
  customer_name: string;
  role: string;
  showMenuChange: boolean;
  stripe_customer_id?: string;
  subscriptionActive: boolean;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

// Function to truncate restaurant name if longer than 24 characters
function truncateRestaurantName(name: string): string {
  if (name.length <= 24) {
    return name;
  }
  return name.substring(0, 21) + "...";
}

// Function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to validate phone format
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

// Function to create profile data
function createProfileData(
  authUserId: string,
  contact: string,
  contactType: string,
  restaurantId: string
): ProfileData {
  const now = new Date().toISOString();

  return {
    id: authUserId,
    email: contactType === "email" ? contact : undefined,
    phone: contactType === "phone" ? contact.replace("+", "") : undefined,
    customer_name: contactType === "email" ? contact.split("@")[0] : ``,
    role: "owner",
    showMenuChange: false,
    subscriptionActive: false,
    restaurant_id: restaurantId,
    created_at: now,
    updated_at: now,
  };
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { contact, contactType, restaurantName, restaurantId }: InviteUserRequest = req.body;

    // Validate required fields
    if (!contact || !contactType || !restaurantName || !restaurantId) {
      return res.status(400).json({
        error:
          "Missing required fields: contact, contactType, restaurantName, and restaurantId are required",
      });
    }

    // Trim leading and trailing spaces from contact
    const trimmedContact = contact.trim();

    // Check for trailing/leading spaces
    if (contact !== trimmedContact) {
      return res.status(400).json({
        error: `${contactType === "email" ? "Email" : "Phone number"} cannot have leading or trailing spaces`,
      });
    }

    // Validate contact format
    if (contactType === "email" && !isValidEmail(trimmedContact)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (contactType === "phone" && !isValidPhone(trimmedContact)) {
      return res.status(400).json({ error: "Invalid phone format" });
    }

    console.log(
      `Processing ${contactType} invitation for: ${trimmedContact} to restaurant: ${restaurantName}`
    );

    if (contactType === "email") {
      const result = await handleEmailInvitation(trimmedContact, restaurantName, restaurantId);
      return res.status(result.status).json(result.json);
    } else {
      const result = await handlePhoneInvitation(trimmedContact, restaurantName, restaurantId);
      return res.status(result.status).json(result.json);
    }
  } catch (error) {
    console.error("Error in sending invitation:", error);
    return res.status(500).json({
      error: "An error occurred while sending the invitation",
      details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
    });
  }
}

async function handleEmailInvitation(
  contact: string,
  restaurantName: string,
  restaurantId: string
) {
  try {
    const userRepository = getUserRepository();

    // Step 1: Check if user exists in auth.users table with RPC
    const { data: authUsers, error: authLookupError } = await supabase.rpc("get_auth_user", {
      identifier: contact.toLowerCase(),
    });

    console.log("Auth lookup result:", { authUsers, authLookupError });

    if (authLookupError) {
      console.error("Error checking auth user:", authLookupError);
      throw new Error("Failed to check auth user");
    }

    if (authUsers && authUsers.length > 0) {
      // User exists in auth.users
      const authUserId = authUsers[0].id;
      console.log(`Found existing auth user: ${authUserId}`);

      // Step 2: Check if user exists in profiles table
      const { user: existingProfile, error: profileLookupError } = await userRepository.findBy(
        contact
      );

      if (profileLookupError && profileLookupError.code !== "PGRST116") {
        console.error("Error checking existing user profile:", profileLookupError);
        throw new Error("Failed to check existing user profile");
      }

      if (existingProfile) {
        // User exists in both auth and profiles - update restaurant_id
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ restaurant_id: restaurantId })
          .eq("id", existingProfile.id);

        if (updateError) {
          console.error("Error updating existing user's restaurant:", updateError);
          throw new Error("Failed to update user's restaurant");
        }

        console.log(`Updated existing user ${existingProfile.id} with restaurant ${restaurantId}`);
        return {
          status: 200,
          json: {
            message: "User already exists - restaurant association updated",
            userId: existingProfile.id,
          },
        };
      } else {
        // User exists in auth but not in profiles - create profile
        const profileData = createProfileData(authUserId, contact, "email", restaurantId);

        const { error: profileError } = await supabase.from("profiles").insert(profileData);

        if (profileError) {
          console.error("Error creating profile for existing auth user:", profileError);
          throw new Error("Failed to create profile for existing user");
        }

        console.log(`Created profile for existing auth user: ${authUserId}`);
        return {
          status: 200,
          json: {
            message: "User profile created and associated with restaurant",
            userId: authUserId,
          },
        };
      }
    } else {
      // User doesn't exist in auth.users - create new user with signInWithOtp
      console.log("No existing auth user found, creating new user with OTP");

      const { error: emailError } = await supabase.auth.signInWithOtp({
        email: contact,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/templates`,
        },
      });

      if (emailError) {
        console.error("Error sending email invitation:", emailError);
        throw new Error("Failed to send email invitation");
      }

      // Step 3: Run RPC again to grab the ID and insert in profiles table
      const { data: newAuthUsers, error: newAuthLookupError } = await supabase.rpc(
        "get_auth_user",
        {
          identifier: contact.toLowerCase(),
        }
      );

      if (newAuthLookupError) {
        console.error("Error finding new auth user after OTP:", newAuthLookupError);
        // Don't throw here as the email was sent successfully
        console.warn("Could not find new auth user but email was sent");
        return {
          status: 200,
          json: {
            message: "Email invitation sent successfully",
          },
        };
      }

      if (newAuthUsers && newAuthUsers.length > 0) {
        const newAuthUserId = newAuthUsers[0].id;
        console.log(`Found new auth user after OTP: ${newAuthUserId}`);

        // Create profile for the new user
        const profileData = createProfileData(newAuthUserId, contact, "email", restaurantId);

        const { error: profileError } = await supabase.from("profiles").insert(profileData);

        if (profileError) {
          console.error("Error creating profile for new auth user:", profileError);
          // Don't throw here as the email was sent successfully
          console.warn("Profile creation failed but email was sent");
        } else {
          console.log(`Profile created for new auth user: ${newAuthUserId}`);
        }

        return {
          status: 200,
          json: {
            message: "Email invitation sent successfully",
            userId: newAuthUserId,
          },
        };
      } else {
        console.log("Email invitation sent but could not find new auth user");
        return {
          status: 200,
          json: {
            message: "Email invitation sent successfully",
          },
        };
      }
    }
  } catch (error) {
    console.error("Error in email invitation:", error);
    throw error;
  }
}

async function handlePhoneInvitation(
  contact: string,
  restaurantName: string,
  restaurantId: string
) {
  try {
    const userRepository = getUserRepository();
    const cleanPhone = contact.replace("+", "");

    // First check if user exists in auth.users
    let authUserId: string | null = null;
    const { data: authUsers, error: authLookupError } = await supabase.rpc("get_auth_user", {
      identifier: cleanPhone,
    });

    console.log("Auth lookup result:", { authUsers, authLookupError });

    if (authLookupError) {
      console.error("Error checking auth user:", authLookupError);
      // Continue with creating new user if lookup fails
    } else if (authUsers && authUsers.length > 0) {
      authUserId = authUsers[0].id;
      console.log(`Found existing auth user: ${authUserId}`);
    } else {
      console.log("No existing auth user found");
    }
    let existingProfile = null;
    // Check if user already exists in profiles table
    let { user, error: profileLookupError } = await userRepository.findBy(cleanPhone);

    if (profileLookupError && profileLookupError.code !== "PGRST116") {
      console.error("Error checking existing user profile:", profileLookupError);
      throw new Error("Failed to check existing user profile");
    }
    if (user) {
      existingProfile = user;
    } else {
      let { user, error: profileLookupError } = await userRepository.findBy(contact);
      if (user) {
        existingProfile = user;
      }
    }

    if (existingProfile) {
      // User already exists in profiles - update their restaurant_id
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ restaurant_id: restaurantId })
        .eq("id", existingProfile?.id);

      if (updateError) {
        console.error("Error updating existing user's restaurant:", updateError);
        throw new Error("Failed to update user's restaurant");
      }

      console.log(`Updated existing user ${existingProfile.id} with restaurant ${restaurantId}`);
      return {
        status: 200,
        json: {
          message: "User already exists - restaurant association updated",
          userId: existingProfile.id,
        },
      };
    }

    // If user exists in auth but not in profiles, create profile
    if (authUserId) {
      const profileData = createProfileData(authUserId, cleanPhone, "phone", restaurantId);

      const { error: profileError } = await supabase.from("profiles").insert(profileData);

      if (profileError) {
        console.error("Error creating profile for existing auth user:", profileError);
        throw new Error("Failed to create profile for existing user");
      }

      console.log(`Created profile for existing auth user: ${authUserId}`);
      return {
        status: 200,
        json: {
          message: "User profile created and associated with restaurant",
          userId: authUserId,
        },
      };
    }

    // Try to create new user, but handle the case where user already exists
    let finalAuthUserId: string;

    try {
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        phone: contact,
        phone_confirm: true,
        user_metadata: {
          restaurantId,
          display_name: `User ${contact.slice(-4)}`,
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      if (!authUser.user) {
        throw new Error("Auth user creation failed - no user returned");
      }

      finalAuthUserId = authUser.user.id;
      console.log(`Created new auth user: ${finalAuthUserId}`);
    } catch (createError: any) {
      // If user already exists, try to find them
      if (
        createError.code === "phone_exists" ||
        createError.message?.includes("already registered")
      ) {
        console.log("User already exists in auth, trying to find them...");

        // Try to find the existing user by phone
        const { data: existingAuthUsers, error: findError } = await supabase.rpc("get_auth_user", {
          identifier: contact,
        });

        if (findError || !existingAuthUsers || existingAuthUsers.length === 0) {
          console.error("Could not find existing auth user:", findError);
          throw new Error("User exists but could not be found");
        }

        finalAuthUserId = existingAuthUsers[0].id;
        console.log(`Found existing auth user: ${finalAuthUserId}`);
      } else {
        throw createError;
      }
    }

    // Create profile entry for the user
    const profileData = createProfileData(finalAuthUserId, contact, "phone", restaurantId);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Don't clean up auth user since it might already exist
      throw new Error("Failed to create user profile");
    }

    // Send SMS invitation using Twilio
    const truncatedRestaurantName = truncateRestaurantName(restaurantName);
    const message = `You're invited to join ${truncatedRestaurantName} on Flapjack - an online menu editor. Visit flapjack.co and log in with this phone number to manage their menu.`;

    try {
      await client.messages.create({
        body: message,
        from: process.env.TWILLO_PHONE,
        to: contact,
      });
    } catch (smsError) {
      console.error("Error sending SMS:", smsError);
      // Don't throw here as the user was created successfully
      console.warn("SMS sending failed but user was created");
    }

    console.log(
      `Phone invitation processed successfully for: ${contact}, Profile ID: ${profile.id}`
    );
    return {
      status: 200,
      json: {
        message: "SMS invitation sent successfully",
        userId: profile.id,
      },
    };
  } catch (error) {
    console.error("Error in phone invitation:", error);
    throw error;
  }
}
