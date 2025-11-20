import {
  NotificationFormatter,
  Notification,
  NotificationSeverity,
  NotificationType,
} from "@utils/types/notification";
import { formatObject } from "@utils/formatter";

export interface ErrorData {
  message: string;
  context?: any;
}

export interface InfoData {
  message: string;
  context?: any;
}

export class ErrorFormatter implements NotificationFormatter<ErrorData> {
  format(data: ErrorData): Notification {
    let formattedContext: string | undefined;

    if (data.context) {
      formattedContext = formatObject(data.context);
    }

    return {
      title: "Error Alert",
      message: data.message,
      severity: NotificationSeverity.ERROR,
      type: NotificationType.GENERAL,
      context: formattedContext,
      timestamp: new Date(),
    };
  }
}

export class InfoFormatter implements NotificationFormatter<InfoData> {
  format(data: InfoData): Notification {
    let formattedContext: string | undefined;

    if (data.context) {
      formattedContext = formatObject(data.context);
    }

    return {
      title: "Information",
      message: data.message || "Information update",
      severity: NotificationSeverity.INFO,
      type: NotificationType.GENERAL,
      context: formattedContext,
      timestamp: new Date(),
    };
  }
}
