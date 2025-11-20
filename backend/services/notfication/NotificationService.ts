import {
  Notification,
  NotificationFormatter,
  NotificationProvider,
} from "@utils/types/notification";

export class NotificationService {
  private providers: NotificationProvider[] = [];

  /**
   * Add a notification provider
   */
  addProvider(provider: NotificationProvider): void {
    this.providers.push(provider);
  }

  /**
   * Send notification through all providers
   */
  async notify<T>(data: T, formatter: NotificationFormatter<T>, status?: string): Promise<void> {
    if (this.providers.length === 0) {
      console.warn("No notification providers registered");
      return;
    }

    const notification = formatter.format(data, status);

    await Promise.all(
      this.providers.map((provider) =>
        provider.send(notification).catch((error) => {
          console.error("Error in notification provider:", error);
        })
      )
    );
  }

  /**
   * Send a raw notification directly
   */
  async sendRaw(notification: Notification): Promise<void> {
    if (this.providers.length === 0) {
      console.warn("No notification providers registered");
      return;
    }

    await Promise.all(
      this.providers.map((provider) =>
        provider.send(notification).catch((error) => {
          console.error("Error in notification provider:", error);
        })
      )
    );
  }
}
