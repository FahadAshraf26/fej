// @services/eventService.ts

// Define event types
export enum EventType {
  PAYMENT_INTENT = "PAYMENT_INTENT",
  CUSTOMER = "CUSTOMER",
  SUBSCRIPTION = "SUBSCRIPTION",
  INVOICE = "INVOICE",
  ERROR = "ERROR",
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
}

// Define event interface
export interface Event {
  type: EventType;
  payload: any;
  timestamp?: number;
}

// Event listeners type
type EventListener = (event: Event) => void;

// Event service singleton
class EventService {
  private static instance: EventService;
  private listeners: Map<EventType, EventListener[]> = new Map();

  private constructor() {
    // Initialize with default listeners only on server
    if (typeof window === "undefined") {
      this.setupDefaultListeners();
    }
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  // Setup default listeners for common events (server-only)
  private setupDefaultListeners(): void {
    // Add listener for all events to log them
    this.addListener(EventType.PAYMENT_INTENT, this.handlePaymentIntentEvent);
    this.addListener(EventType.CUSTOMER, this.handleCustomerEvent);
    this.addListener(EventType.SUBSCRIPTION, this.handleSubscriptionEvent);
    this.addListener(EventType.INVOICE, this.handleInvoiceEvent);
    this.addListener(EventType.ERROR, this.handleErrorEvent);
    this.addListener(EventType.INFO, this.handleInfoEvent);
    this.addListener(EventType.SUCCESS, this.handleSuccessEvent);
    this.addListener(EventType.WARNING, this.handleWarningEvent);
  }

  // Add a listener for a specific event type
  public addListener(type: EventType, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(listener);
  }

  // Remove a listener
  public removeListener(type: EventType, listener: EventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Dispatch an event to all listeners
  public dispatch(event: Event): void {
    const { type, payload } = event;
    const timestamp = Date.now();

    // Add timestamp if not provided
    const eventWithTimestamp = { ...event, timestamp };

    // Get listeners for this event type
    const listeners = this.listeners.get(type) || [];

    // Call all listeners
    listeners.forEach((listener) => {
      try {
        listener(eventWithTimestamp);
      } catch (error) {
        console.error(`Error in event listener for ${type}:`, error);
      }
    });
  }

  // Default event handlers that send notifications to Slack (server-only)
  private handlePaymentIntentEvent = async (event: Event): Promise<void> => {
    // Only run on server
    if (typeof window !== "undefined") return;

    try {
      const { payload } = event;
      const { notifyStripePaymentIntent } = await import("./slackService");
      await notifyStripePaymentIntent(payload, "failed");
    } catch (error) {
      console.error("Error handling payment intent event:", error);
    }
  };

  private handleCustomerEvent = async (event: Event): Promise<void> => {
    if (typeof window !== "undefined") return;

    try {
      const { payload } = event;
      const { sendNotification } = await import("./slackService");
      await sendNotification({
        title: "Customer",
        message: `Customer ${payload.id} ${payload.isNew ? "created" : "updated"}`,
        type: "CUSTOMER",
        fields: [
          { label: "Email", value: payload.email || "N/A" },
          { label: "Name", value: payload.name || "N/A" },
        ],
      });
    } catch (error) {
      console.error("Error handling customer event:", error);
    }
  };

  private handleSubscriptionEvent = async (event: Event): Promise<void> => {
    if (typeof window !== "undefined") return;

    try {
      const { payload } = event;
      const { notifyStripeSubscription } = await import("./slackService");
      await notifyStripeSubscription(payload, payload.status);
    } catch (error) {
      console.error("Error handling subscription event:", error);
    }
  };

  private handleInvoiceEvent = async (event: Event): Promise<void> => {
    if (typeof window !== "undefined") return;

    try {
      const { payload } = event;
      const { notifyStripeInvoice } = await import("./slackService");
      await notifyStripeInvoice(payload, payload.status === "paid" ? "paid" : "failed", undefined, {
        restaurantId: payload.restaurantId,
      });
    } catch (error) {
      console.error("Error handling invoice event:", error);
    }
  };

  private handleErrorEvent = async (event: Event): Promise<void> => {
    if (typeof window !== "undefined") return;

    try {
      const { payload } = event;
      const { sendErrorNotification } = await import("./slackService");
      await sendErrorNotification(payload.message, payload.context);
    } catch (error) {
      console.error("Error handling error event:", error);
    }
  };

  private handleInfoEvent = async (event: Event): Promise<void> => {
    if (typeof window !== "undefined") return;

    try {
      const { payload } = event;
      const { sendNotification } = await import("./slackService");
      await sendNotification({
        title: "Information",
        message: payload.message || "Information update",
        type: "INFO",
        fields: payload.context
          ? [{ label: "Context", value: JSON.stringify(payload.context) }]
          : [],
      });
    } catch (error) {
      console.error("Error handling info event:", error);
    }
  };

  private handleSuccessEvent = async (event: Event): Promise<void> => {
    if (typeof window !== "undefined") return;

    try {
      const { payload } = event;
      const { sendNotification } = await import("./slackService");
      await sendNotification({
        title: "Success",
        message: payload.message || "Operation successful",
        type: "SUCCESS",
        fields: payload.context
          ? [{ label: "Context", value: JSON.stringify(payload.context) }]
          : [],
      });
    } catch (error) {
      console.error("Error handling success event:", error);
    }
  };

  private handleWarningEvent = async (event: Event): Promise<void> => {
    if (typeof window !== "undefined") return;

    try {
      const { payload } = event;
      const { sendNotification } = await import("./slackService");
      await sendNotification({
        title: "Warning",
        message: payload.message || "Warning condition detected",
        type: "WARNING",
        fields: payload.context
          ? [{ label: "Context", value: JSON.stringify(payload.context) }]
          : [],
      });
    } catch (error) {
      console.error("Error handling warning event:", error);
    }
  };
}

// Export singleton instance
export const eventService = EventService.getInstance();

// Helper functions to dispatch common events
export const dispatchPaymentIntentEvent = (paymentIntent: any): void => {
  eventService.dispatch({
    type: EventType.PAYMENT_INTENT,
    payload: paymentIntent,
  });
};

export const dispatchCustomerEvent = (customer: any, isNew: boolean = true): void => {
  eventService.dispatch({
    type: EventType.CUSTOMER,
    payload: { ...customer, isNew },
  });
};

export const dispatchSubscriptionEvent = (
  subscription: any,
  status: "created" | "updated" | "cancelled" = "created"
): void => {
  eventService.dispatch({
    type: EventType.SUBSCRIPTION,
    payload: { ...subscription, status },
  });
};

export const dispatchInvoiceEvent = (invoice: any, status: "paid" | "failed" = "paid"): void => {
  eventService.dispatch({
    type: EventType.INVOICE,
    payload: { ...invoice, status },
  });
};

export const dispatchErrorEvent = (message: string, context?: any): void => {
  eventService.dispatch({
    type: EventType.ERROR,
    payload: { message, context },
  });
};

export const dispatchInfoEvent = (message: string, context?: any): void => {
  eventService.dispatch({
    type: EventType.INFO,
    payload: { message, context },
  });
};

export const dispatchSuccessEvent = (message: string, context?: any): void => {
  eventService.dispatch({
    type: EventType.SUCCESS,
    payload: { message, context },
  });
};

export const dispatchWarningEvent = (message: string, context?: any): void => {
  eventService.dispatch({
    type: EventType.WARNING,
    payload: { message, context },
  });
};
