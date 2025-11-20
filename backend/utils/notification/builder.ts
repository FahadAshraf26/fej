import { Notification } from "@utils/types/notification";

// Message types with corresponding emojis and colors
const MESSAGE_TYPES = {
  INFO: { emoji: "ℹ️", color: "#2196F3", title: "Information" },
  SUCCESS: { emoji: "✅", color: "#4CAF50", title: "Success" },
  WARNING: { emoji: "⚠️", color: "#FF9800", title: "Warning" },
  ERROR: { emoji: "❌", color: "#F44336", title: "Error" },
  PAYMENT: { emoji: "💰", color: "#9C27B0", title: "Payment" },
  CUSTOMER: { emoji: "👤", color: "#3F51B5", title: "Customer" },
  SUBSCRIPTION: { emoji: "🔄", color: "#009688", title: "Subscription" },
  INVOICE: { emoji: "📄", color: "#795548", title: "Invoice" },
  GENERAL: { emoji: "🔔", color: "#607D8B", title: "Notification" },
};

export class SlackMessageBuilder {
  /**
   * Builds Slack blocks from notification
   */
  static buildBlocks(notification: Notification): any[] {
    const blocks = [];

    // Determine type for header
    const severityInfo = MESSAGE_TYPES[notification.severity] || MESSAGE_TYPES.INFO;
    const typeInfo = MESSAGE_TYPES[notification.type] || MESSAGE_TYPES.GENERAL;

    // Add header
    blocks.push(this.createHeader(notification.title || typeInfo.title, severityInfo.emoji));

    // Add message
    blocks.push(this.createSection(notification.message));

    // Add fields
    if (notification.fields && notification.fields.length > 0) {
      // Split fields into groups of 2 for better layout
      for (let i = 0; i < notification.fields.length; i += 2) {
        const fieldsChunk = notification.fields.slice(i, i + 2);
        blocks.push(this.createFieldsSection(fieldsChunk));
      }
    }

    // Add context
    if (notification.context) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: notification.context,
          },
        ],
      });
    }

    // Add timestamp context if present
    if (notification.timestamp) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Time:* ${notification.timestamp.toLocaleString()}`,
          },
        ],
      });
    }

    // Add divider
    blocks.push({ type: "divider" });

    return blocks;
  }

  /**
   * Creates a formatted message header
   */
  private static createHeader(title: string, emoji: string): any {
    return {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${title}`,
        emoji: true,
      },
    };
  }

  /**
   * Creates a simple section with text
   */
  private static createSection(text: string): any {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: text,
      },
    };
  }

  /**
   * Creates a section with fields
   */
  private static createFieldsSection(fields: { label: string; value: string }[]): any {
    return {
      type: "section",
      fields: fields.map((field) => ({
        type: "mrkdwn",
        text: `*${field.label}:*\n${field.value}`,
      })),
    };
  }
}
