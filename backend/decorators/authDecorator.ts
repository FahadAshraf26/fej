import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@database/server.connection";
import { IUserDetails } from "@Interfaces/*";
import { User } from "@supabase/supabase-js";

// Define role hierarchy
type Role = "user" | "owner" | "flapjack";
const ROLE_HIERARCHY: Record<Role, number> = {
  user: 1,
  owner: 2,
  flapjack: 3,
};

export interface AuthenticatedRequest extends NextApiRequest {
  session: {
    user: User;
  };
  profile?: {
    id: string;
    role: Role;
    [key: string]: any;
  };
}

interface AuthOptions {
  requiredRoles?: Role[];
  useHeaderAuth?: boolean;
}

// Simple memory cache for role checks (use Redis or similar in production)
const roleCache = new Map<string, { role: Role; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Checks if the user's role has sufficient privileges for the required role
 * @param userRole The user's role
 * @param requiredRole The required role
 */
function hasRequiredRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Authentication decorator for controller methods
 * @param options Configuration options (requiredRoles, useHeaderAuth)
 */
export function Authenticate(options: AuthOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: NextApiRequest, res: NextApiResponse) {
      try {
        let session;

        // Handle authentication based on whether to use header auth or cookie auth
        if (options.useHeaderAuth) {
          // Use header-based auth (Bearer token)
          const token = req.headers.authorization?.replace("Bearer ", "") || "";

          if (!token) {
            return res.status(401).json({ message: "No authorization token provided" });
          }

          const { data, error } = await supabaseServer.auth.getUser(token);

          if (error || !data.user) {
            return res.status(401).json({
              message: "Unauthorized",
              detail: error?.message || "Invalid token",
            });
          }

          session = data;
        } else {
          // Use cookie-based auth
          const refreshToken = req.cookies["supabase-refresh-token"];
          const accessToken = req.cookies["supabase-auth-token"];

          if (!refreshToken || !accessToken) {
            return res.status(401).json({ message: "No valid authentication tokens found" });
          }

          // Validate access token (should be a JWT)
          if (accessToken.length < 100) {
            return res.status(401).json({ message: "Invalid access token format" });
          }

          // Validate refresh token format
          // Supabase refresh tokens can be either JWT or shorter format
          if (!refreshToken.match(/^[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
            return res.status(401).json({ message: "Invalid refresh token format" });
          }

          try {
            const { data: initialSessionData, error: sessionError } =
              await supabaseServer.auth.setSession({
                refresh_token: refreshToken,
                access_token: accessToken,
              });

            if (sessionError) {
              // Enhanced error logging for debugging
              console.error('Session error details:', {
                message: sessionError.message,
                code: sessionError.code,
                status: sessionError.status,
                environment: process.env.NODE_ENV,
                hasRefreshToken: !!refreshToken,
                hasAccessToken: !!accessToken,
                refreshTokenLength: refreshToken?.length || 0,
                accessTokenLength: accessToken?.length || 0
              });
              
              if (sessionError.message.includes("Refresh Token Not Found")) {
                const isProduction = process.env.NODE_ENV === 'production';
                const secureFlag = isProduction ? '; Secure' : '';
                const httpOnlyFlag = isProduction ? '; HttpOnly' : '';
                const sameSiteFlag = isProduction ? '; SameSite=Strict' : '; SameSite=Lax';
                
                res.setHeader("Set-Cookie", [
                  `supabase-auth-token=; Path=/${sameSiteFlag}${httpOnlyFlag}${secureFlag}; Max-Age=0`,
                  `supabase-refresh-token=; Path=/${sameSiteFlag}${httpOnlyFlag}${secureFlag}; Max-Age=0`,
                ]);
                return res.status(401).json({
                  message: "Session expired",
                  detail: "Please log in again",
                });
              }

              return res.status(401).json({
                message: "Failed to set session",
                detail: sessionError.message,
              });
            }

            const { data: verifySession, error: verifyError } =
              await supabaseServer.auth.getSession();
            if (verifyError || !verifySession.session) {
              return res.status(401).json({
                message: "Session verification failed",
                detail: verifyError?.message || "No active session found",
              });
            }

            const { data: userData, error } = await supabaseServer.auth.getUser();

            if (error || !userData) {
              return res.status(401).json({
                message: "Unauthorized",
                detail: error?.message || "Invalid session",
              });
            }

            const { data: currentSession } = await supabaseServer.auth.getSession();
            const expiresAt = currentSession.session?.expires_at || 0;
            const isNearExpiration = expiresAt - Math.floor(Date.now() / 1000) < 300;

            if (isNearExpiration && currentSession.session) {
              const { data: refreshData, error: refreshError } =
                await supabaseServer.auth.refreshSession();

              if (!refreshError && refreshData.session) {
                const isProduction = process.env.NODE_ENV === 'production';
                const secureFlag = isProduction ? '; Secure' : '';
                const httpOnlyFlag = isProduction ? '; HttpOnly' : '';
                const sameSiteFlag = isProduction ? '; SameSite=Strict' : '; SameSite=Lax';
                
                res.setHeader("Set-Cookie", [
                  `supabase-auth-token=${refreshData.session.access_token}; Path=/${sameSiteFlag}${httpOnlyFlag}${secureFlag}`,
                  `supabase-refresh-token=${refreshData.session.refresh_token}; Path=/${sameSiteFlag}${httpOnlyFlag}${secureFlag}`,
                ]);
              }
            }

            session = userData;
          } catch (error) {
            console.error('Error during session setting:', {
              error: error instanceof Error ? error.message : "Unknown error",
              stack: error instanceof Error ? error.stack : undefined,
              environment: process.env.NODE_ENV,
              hasRefreshToken: !!refreshToken,
              hasAccessToken: !!accessToken
            });
            
            return res.status(401).json({
              message: "Error during session setting",
              detail: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Type-cast request to our extended interface
        const authReq = req as AuthenticatedRequest;
        authReq.session = session;

        // Check role if required
        if (options.requiredRoles && options.requiredRoles.length > 0) {
          const userId = session.user?.id;
          const cachedData = roleCache.get(userId);
          const now = Date.now();

          // Use cached data if available and not expired
          if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
            // Check if user role has sufficient privileges for any of the required roles
            const hasAccess = options.requiredRoles.some((requiredRole) =>
              hasRequiredRole(cachedData.role as Role, requiredRole)
            );

            if (!hasAccess) {
              return res.status(403).json({
                message: "Forbidden",
                detail: `Role ${cachedData.role} does not have the required privileges`,
              });
            }

            authReq.profile = { id: userId, role: cachedData.role as Role };
          } else {
            // Fetch profile data
            const { data: profile, error } = await supabaseServer
              .from("profiles")
              .select("role")
              .eq("id", userId)
              .single();

            if (error || !profile) {
              return res.status(403).json({
                message: "Forbidden",
                detail: error ? error.message : "User profile not found",
              });
            }

            const userRole = profile.role as Role;

            // Check if user role has sufficient privileges for any of the required roles
            const hasAccess = options.requiredRoles.some((requiredRole) =>
              hasRequiredRole(userRole, requiredRole)
            );

            if (!hasAccess) {
              return res.status(403).json({
                message: "Forbidden",
                detail: `Role ${userRole} does not have the required privileges`,
              });
            }

            // Cache the result
            roleCache.set(userId, { role: userRole, timestamp: now });

            const { role, ...profileData } = profile;
            authReq.profile = { id: userId, role: userRole, ...profileData };
          }
        }

        // Call the original method
        return originalMethod.apply(this, [authReq, res]);
      } catch (error) {
        console.error("Auth decorator error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({
          message: "Authentication error",
          error: errorMessage,
          // Only include stack in development
          ...(process.env.NODE_ENV === "development" && {
            stack: error instanceof Error ? error.stack : undefined,
          }),
        });
      }
    };

    return descriptor;
  };
}
