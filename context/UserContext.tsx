import { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";
import { useUser, useSessionContext, User, useSession } from "@supabase/auth-helpers-react";
import { IUserDetails } from "../interfaces";
import { CustomLoader } from "@Components/CommonComponents/CustomLoader";

interface UserContextType {
  user: IUserDetails | null;
  supabaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  isAuthenticated: false,
  supabaseUser: null,
  isLoading: true,
});

export const useUserContext = () => useContext(UserContext);

export interface Props {
  children: React.ReactNode;
}

const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';
  const sameSiteFlag = isProduction ? '; SameSite=Strict' : '; SameSite=Lax';
  
  const cookieAttributes = [
    `expires=${expires.toUTCString()}`,
    "path=/",
    sameSiteFlag,
    secureFlag
  ].filter(Boolean).join("; ");
  
  document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieAttributes}`;
};

const clearCookie = (name: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSiteFlag = isProduction ? '; SameSite=Strict' : '; SameSite=Lax';
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${sameSiteFlag}`;
};

export const UserContextProvider = ({ children }: Props) => {
  const { isLoading: isSessionLoading, supabaseClient: supabase } = useSessionContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userDetails, setUserDetails] = useState<IUserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetchedUserDetailsRef = useRef(false);
  const lastAuthStateRef = useRef<{
    userId: string | null;
    isAuthenticated: boolean;
  }>({
    userId: null,
    isAuthenticated: false,
  });

  const supabaseUser = useUser();
  const session = useSession();

  useEffect(() => {
    if (!isSessionLoading) {
      setIsAuthenticated(!!supabaseUser);
    }
  }, [isSessionLoading, supabaseUser]);

  const refreshSession = useCallback(async () => {
    if (!session?.refresh_token) {
      setIsAuthenticated(false);
      setUserDetails(null);
      clearCookie("supabase-auth-token");
      clearCookie("supabase-refresh-token");
      return;
    }

    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });

      if (error) throw error;

      if (data.session) {
        setIsAuthenticated(true);
        setCookie("supabase-auth-token", data.session.access_token);
        setCookie("supabase-refresh-token", data.session.refresh_token);
      } else {
        throw new Error("No session returned after refresh");
      }
    } catch (error) {
      console.error("Failed to refresh session:", error);
      setIsAuthenticated(false);
      setUserDetails(null);
      clearCookie("supabase-auth-token");
      clearCookie("supabase-refresh-token");
      await supabase.auth.signOut();
    }
  }, [session, supabase.auth]);

  useEffect(() => {
    if (!session) {
      setIsAuthenticated(false);
      return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const sessionExpiry = session.expires_at;
    const refreshBuffer = 60;

    if (sessionExpiry && currentTime > sessionExpiry - refreshBuffer) {
      refreshSession();
    } else {
      setIsAuthenticated(true);
    }
  }, [session, refreshSession]);

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session) {
        try {
          if (event === "INITIAL_SESSION") {
            const {
              data: { session: freshSession },
              error,
            } = await supabase.auth.getSession();

            if (error || !freshSession) {
              return;
            }

            session = freshSession;
          }

          if (!session.access_token || !session.refresh_token) {
            return;
          }

          if (session.access_token.length < 100) {
            return;
          }

          if (!session.refresh_token.match(/^[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
            return;
          }

          try {
            setCookie("supabase-auth-token", session.access_token);
            setCookie("supabase-refresh-token", session.refresh_token);

            if (lastAuthStateRef.current.userId !== session.user.id) {
              hasFetchedUserDetailsRef.current = false;
              lastAuthStateRef.current = {
                userId: session.user.id,
                isAuthenticated: true,
              };
            }
          } catch (error) {
            console.error("Error setting cookies:", error);
          }
        } catch (error) {
          console.error("Error in session handling:", error);
        }
      } else if (event === "SIGNED_OUT") {
        clearCookie("supabase-auth-token");
        clearCookie("supabase-refresh-token");
        lastAuthStateRef.current = {
          userId: null,
          isAuthenticated: false,
        };
      }
    });
  }, []);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!supabaseUser?.id || !isAuthenticated) {
        setUserDetails(null);
        setIsLoading(false);
        return;
      }

      if (hasFetchedUserDetailsRef.current && lastAuthStateRef.current.userId === supabaseUser.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", supabaseUser.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select(
            `
            *,
            plans:plan_id (
              id,
              name,
              description,
              price,
              currency,
              stripePriceId,
              trialDays,
              features,
              isActive
            )
          `
          )
          .eq("profile_id", supabaseUser.id);

        if (subscriptionError && subscriptionError.code !== "PGRST116") {
          throw subscriptionError;
        }

        if (profileData?.restaurant_id) {
          const { data: restaurantData, error: restaurantError } = await supabase
            .from("restaurants")
            .select("*")
            .eq("id", profileData.restaurant_id)
            .single();

          if (restaurantError) {
            throw restaurantError;
          }

          profileData.restaurant = restaurantData;
        }

        const userDetails = {
          ...profileData,
          subscription: subscriptionData || null,
        };

        setUserDetails(userDetails);
        hasFetchedUserDetailsRef.current = true;
        lastAuthStateRef.current = {
          userId: supabaseUser.id,
          isAuthenticated: true,
        };
      } catch (error) {
        console.error("Error fetching user details:", error);
        setUserDetails(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserDetails();
  }, [supabaseUser, isAuthenticated, supabase]);

  if (isSessionLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div>
          <CustomLoader />
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider
      value={{
        user: userDetails,
        isAuthenticated,
        supabaseUser,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
