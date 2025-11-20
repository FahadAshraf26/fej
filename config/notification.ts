export const notificationConfig = {
  slack: {
    token: process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN || "",
    channel: process.env.NOTIFICATION_SLACK_CHANNEL || "#notifications",
    enabled: Boolean(process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN),
  },
};
