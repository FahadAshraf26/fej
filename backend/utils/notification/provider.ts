import { Notification } from "@utils/types/notification";
import { NotificationProvider } from "@utils/types/notification";
import { SlackMessageBuilder } from "./builder";
import { WebClient } from "@slack/web-api";

export class SlackProvider implements NotificationProvider {
  private web: WebClient;

  constructor(private token: string, private channel: string) {
    if (!token) throw new Error("Slack token is required");
    if (!channel) throw new Error("Slack channel is required");
    this.web = new WebClient(token);
  }

  /**
   * Send notification to Slack
   */
  async send(notification: Notification): Promise<void> {
    try {
      const blocks = SlackMessageBuilder.buildBlocks(notification);
      this.web.chat.postMessage({
        channel: this.channel,
        text: notification.message,
        blocks: blocks,
      });
    } catch (error) {
      console.error("Error sending message to Slack:", error);
    }
  }
}
