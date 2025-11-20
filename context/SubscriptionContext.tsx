import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUserContext } from "./UserContext";
import { useModal } from "./ModalContext";
import { useRouter } from "next/router";
import axios from "axios";
import { SubscriptionService } from "../services/SubscriptionService";
import { Subscription, SubscriptionStatusInfo } from "../types/Subscription";

interface SubscriptionContextType {
  restaurantSubscriptions: Subscription[];
  subscriptionStatus: SubscriptionStatusInfo;
  isFlapjack: boolean;
  isLoading: boolean;
  restaurantOverride: boolean;
  handleAction: (action: () => void) => void;
  handleDirectAccess: () => boolean;
  returnUrl: string;
  // Legacy properties for backward compatibility
  isSubscriptionActive: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscriptionContext must be used within a SubscriptionProvider");
  }
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user } = useUserContext();
  const { openModal } = useModal();
  const router = useRouter();
  const [restaurantSubscriptions, setRestaurantSubscriptions] = useState<Subscription[]>([]);
  const [restaurantOverride, setRestaurantOverride] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasReceivedData = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkSubscription = useCallback(async (restaurantId: string) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Fetch subscriptions and restaurant data in parallel
      const [subscriptionsResponse, restaurantResponse] = await Promise.all([
        axios.get(`/api/billing/subscriptions/restaurant/${restaurantId}`, {
          signal: abortControllerRef.current.signal,
        }),
        axios.get(`/api/restaurants/${restaurantId}`, {
          signal: abortControllerRef.current.signal,
        })
      ]);
      
      setRestaurantSubscriptions(subscriptionsResponse.data.subscriptions || []);
      setRestaurantOverride(restaurantResponse.data?.restaurant?.subscription_override || false);
      hasReceivedData.current = true;
      setIsLoading(false);
    } catch (error: any) {
      // Don't log error if it was aborted
      if (error.name !== "AbortError") {
        console.error("Error checking subscription:", error);
      }
      hasReceivedData.current = true;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.restaurant_id) {
      setIsLoading(false);
      return;
    }

    checkSubscription(user.restaurant_id);

    // Cleanup function to abort ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.restaurant_id, checkSubscription]);

  const isFlapjack = user?.role === "flapjack";

  // Use centralized subscription service - Editor subscriptions only with restaurant override
  const subscriptionStatus = useMemo(() => {
    return SubscriptionService.getEditorSubscriptionStatus(restaurantSubscriptions, isFlapjack, restaurantOverride);
  }, [restaurantSubscriptions, isFlapjack, restaurantOverride]);

  // Only consider loading complete if we've actually received data
  const isLoadingComplete = !isLoading && hasReceivedData.current;

  const handleAction = (action: () => void) => {
    if (subscriptionStatus.canAccessFeatures) {
      action();
    } else {
      openModal("paymentUpdate", { returnUrl: router.asPath });
    }
  };

  const handleDirectAccess = () => {
    if (!subscriptionStatus.canAccessFeatures) {
      openModal("paymentUpdate", { returnUrl: router.asPath });
      return false;
    }
    return true;
  };

  const value: SubscriptionContextType = {
    restaurantSubscriptions,
    subscriptionStatus,
    isFlapjack,
    isLoading: !isLoadingComplete,
    restaurantOverride,
    handleAction,
    handleDirectAccess,
    returnUrl: router.asPath,
    // Legacy property for backward compatibility
    isSubscriptionActive: subscriptionStatus.canAccessFeatures,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
