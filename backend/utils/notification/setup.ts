// @services/notification-setup.ts
import { NotificationService } from "@services/notfication/NotificationService";
import { SlackProvider } from "@utils/notification/provider";
// import { MondayProvider } from "@utils/notification/providers/monday-provider";
import { EventService } from "@services/events/EventService";

export const setupNotificationSystem = () => {
  // Create notification service
  const notificationService = new NotificationService();

  // Add Slack provider
  const slackProvider = new SlackProvider(
    process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN || "",
    process.env.SLACK_NOTIFICATION_CHANNEL_ID || ""
  );
  notificationService.addProvider(slackProvider);

  // Add Monday.com provider if configured
  // if (process.env.MONDAY_API_KEY && process.env.MONDAY_BOARD_ID) {
  //   const mondayProvider = new MondayProvider(
  //     process.env.MONDAY_API_KEY,
  //     process.env.MONDAY_BOARD_ID
  //   );
  //   notificationService.addProvider(mondayProvider);
  // }

  // Initialize event service with notification service
  EventService.initialize(notificationService);

  return {
    notificationService,
    eventService: EventService.getInstance(),
  };
};

// Export singleton instance
export const { notificationService, eventService } = setupNotificationSystem();
