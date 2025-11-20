export enum NotificationSeverity {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

export enum NotificationType {
  PAYMENT = "PAYMENT",
  CUSTOMER = "CUSTOMER",
  SUBSCRIPTION = "SUBSCRIPTION",
  INVOICE = "INVOICE",
  GENERAL = "GENERAL",
}

export interface NotificationField {
  label: string;
  value: string;
}

export interface MondayUpdate {
  boardId: number;
  itemId: number;
  columnId: string;
  value: string;
}

export interface Notification {
  title: string;
  message: string;
  severity: NotificationSeverity;
  type: NotificationType;
  fields?: NotificationField[];
  context?: string;
  timestamp?: Date;
  mondayUpdate?: MondayUpdate;
}

export interface NotificationFormatter<T> {
  format(data: T, status?: string): Notification;
}

export interface NotificationProvider {
  send(notification: Notification): Promise<void>;
}
