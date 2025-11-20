// @services/eventService.ts

import { NotificationService } from "@services/notfication/NotificationService";
import {
  StripePaymentIntentFormatter,
  StripeCustomerFormatter,
  StripeSubscriptionFormatter,
  StripeInvoiceFormatter,
} from "@utils/formatters/stripe-formatter";
import { ErrorFormatter, InfoFormatter } from "@utils/formatters/message-formatter";
import { NotificationSeverity, NotificationType } from "@utils/types/notification";

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
  private notificationService: NotificationService;

  private constructor(notificationService: NotificationService) {
    this.notificationService = notificationService;
    // Initialize with default listeners
    this.setupDefaultListeners();
  }

  public static initialize(notificationService: NotificationService): void {
    EventService.instance = new EventService(notificationService);
  }

  public static getInstance(): EventService {
    if (!EventService.instance) {
      throw new Error("EventService must be initialized with a notification service first");
    }
    return EventService.instance;
  }

  // Setup default listeners for common events
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

  // Default event handlers that send notifications
  private handlePaymentIntentEvent = (event: Event): void => {
    const { payload } = event;
    this.notificationService.notify(
      payload,
      new StripePaymentIntentFormatter(),
      payload.status || "failed"
    );
  };

  private handleCustomerEvent = (event: Event): void => {
    const { payload } = event;
    this.notificationService.notify(
      payload,
      new StripeCustomerFormatter(),
      payload.isNew ? "true" : "false"
    );
  };

  private handleSubscriptionEvent = (event: Event): void => {
    const { payload } = event;
    this.notificationService.notify(payload, new StripeSubscriptionFormatter(), payload.status);
  };

  private handleInvoiceEvent = (event: Event): void => {
    const { payload } = event;
    this.notificationService.notify(
      payload,
      new StripeInvoiceFormatter(),
      payload.status === "paid" ? "paid" : "failed"
    );
  };

  private handleErrorEvent = (event: Event): void => {
    const { payload } = event;
    this.notificationService.notify(
      { message: payload.message, context: payload.context },
      new ErrorFormatter()
    );
  };

  private handleInfoEvent = (event: Event): void => {
    const { payload } = event;
    this.notificationService.sendRaw({
      title: "Information",
      message: payload.message || "Information update",
      severity: NotificationSeverity.INFO,
      type: NotificationType.GENERAL,
      context: payload.context ? JSON.stringify(payload.context) : undefined,
      fields: payload.context ? [{ label: "Context", value: JSON.stringify(payload.context) }] : [],
    });
  };

  private handleSuccessEvent = (event: Event): void => {
    const { payload } = event;
    this.notificationService.sendRaw({
      title: "Success",
      message: payload.message || "Operation successful",
      severity: NotificationSeverity.SUCCESS,
      type: NotificationType.GENERAL,
      context: payload.context ? JSON.stringify(payload.context) : undefined,
      fields: payload.context ? [{ label: "Context", value: JSON.stringify(payload.context) }] : [],
    });
  };

  private handleWarningEvent = (event: Event): void => {
    const { payload } = event;
    this.notificationService.sendRaw({
      title: "Warning",
      message: payload.message || "Warning condition detected",
      severity: NotificationSeverity.WARNING,
      type: NotificationType.GENERAL,
      context: payload.context ? JSON.stringify(payload.context) : undefined,
      fields: payload.context ? [{ label: "Context", value: JSON.stringify(payload.context) }] : [],
    });
  };
}

// Helper functions to dispatch common events
export const dispatchPaymentIntentEvent = (paymentIntent: any): void => {
  EventService.getInstance().dispatch({
    type: EventType.PAYMENT_INTENT,
    payload: paymentIntent,
  });
};

export const dispatchCustomerEvent = (customer: any, isNew: boolean = true): void => {
  EventService.getInstance().dispatch({
    type: EventType.CUSTOMER,
    payload: { ...customer, isNew },
  });
};

export const dispatchSubscriptionEvent = (
  subscription: any,
  status: "created" | "updated" | "cancelled" = "created"
): void => {
  EventService.getInstance().dispatch({
    type: EventType.SUBSCRIPTION,
    payload: { ...subscription, status },
  });
};

export const dispatchInvoiceEvent = (invoice: any, status: "paid" | "failed" = "paid"): void => {
  EventService.getInstance().dispatch({
    type: EventType.INVOICE,
    payload: { ...invoice, status },
  });
};

export const dispatchErrorEvent = (message: string, context?: any): void => {
  EventService.getInstance().dispatch({
    type: EventType.ERROR,
    payload: { message, context },
  });
};

export const dispatchInfoEvent = (message: string, context?: any): void => {
  EventService.getInstance().dispatch({
    type: EventType.INFO,
    payload: { message, context },
  });
};

export const dispatchSuccessEvent = (message: string, context?: any): void => {
  EventService.getInstance().dispatch({
    type: EventType.SUCCESS,
    payload: { message, context },
  });
};

export const dispatchWarningEvent = (message: string, context?: any): void => {
  EventService.getInstance().dispatch({
    type: EventType.WARNING,
    payload: { message, context },
  });
};

// Export EventService class to allow initialization
export { EventService };
