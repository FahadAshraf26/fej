import { useState, useCallback, useRef } from "react";

type TriggerUpsellOptions = Partial<{
  shouldTrigger: boolean;
}>;

export function useUpsell(subscribed?: boolean, userId?: string) {
  const [checkoutLink, setCheckoutLink] = useState<string>();
  const fetchingRef = useRef(false);

  const getCheckoutLink = useCallback(async () => {
    // Return if already fetching or if we already have a link
    if (fetchingRef.current || checkoutLink) {
      return;
    }

    fetchingRef.current = true;
    try {
      const checkoutURL = await fetch(
        `${window.location.origin}/api/checkout`,
        {
          method: "POST",
          body: JSON.stringify({ userId }),
        }
      )
        .then((res) => res.json())
        .then((data) => data.url);

      setCheckoutLink(checkoutURL);
    } catch (error) {
      console.error("Failed to fetch checkout link:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [userId, checkoutLink]);

  const openCheckoutLink = useCallback(async () => {
    // Only fetch the link when needed
    if (!checkoutLink) {
      await getCheckoutLink();
    }
    // Open the link in a new tab
    if (checkoutLink) {
      window.open(checkoutLink, "_blank");
    }
  }, [checkoutLink, getCheckoutLink]);

  const triggerUpsellOr = useCallback(
    (callback?: () => void, options?: TriggerUpsellOptions) => {
      const shouldTriggerUpsell = options ? options.shouldTrigger : !subscribed;
      return shouldTriggerUpsell ? openCheckoutLink : callback;
    },
    [subscribed, openCheckoutLink]
  );

  return { triggerUpsellOr };
}
