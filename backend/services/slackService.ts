// @services/slackService.ts

import { WebClient } from "@slack/web-api";
import Stripe from "stripe";
import { NotificationField } from "@utils/types/notification";
import { supabaseServer as supabase } from "@database/server.connection";

if (typeof window !== "undefined") {
  throw new Error("slackService can only be used on the server side");
}

// Initialize Slack Web API client
const slack = new WebClient(process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN);
const defaultChannelId = process.env.NEXT_PUBLIC_SLACK_CUSTOMER_CHANNEL_ID;
const defaultTagUserId = process.env.NEXT_PUBLIC_SLACK_DEFAULT_TAG_USER_ID;

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
};

interface Restaurant {
  id: string;
  name: string;
  slack_channel_id: string;
}

interface Profile {
  id: string;
  email: string;
  stripe_customer_id: string;
  restaurants: Restaurant;
}

interface Subscription {
  stripe_subscription_id: string;
  profiles: Profile;
}

interface RestaurantResponse {
  slack_channel_id: string;
}

interface ProfileResponse {
  restaurants: {
    slack_channel_id: string;
  }[];
}

interface SubscriptionResponse {
  profiles: {
    restaurants: {
      slack_channel_id: string;
    }[];
  }[];
}

// Helper function to format currency
const formatCurrency = (amount: number, currency: string = "usd"): string => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });

  return formatter.format(amount / 100); // Stripe amounts are in cents
};

// Helper to format date/time
const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

/**
 * Get Slack channel ID from restaurants table based on various identifiers
 */
const getSlackChannelId = async (options: {
  stripeCustomerId?: string;
  userId?: string;
  userEmail?: string;
  restaurantName?: string;
  restaurantId?: string;
  subscriptionId?: string;
}): Promise<string> => {
  try {
    // Try to get channel ID from restaurant data
    if (options.restaurantId || options.restaurantName) {
      const { data, error } = await supabase
        .from("restaurants")
        .select("slack_channel_id")
        .or(`id.eq.${options.restaurantId},name.eq.${options.restaurantName}`)
        .single();

      if (!error && data) {
        return (data as RestaurantResponse).slack_channel_id;
      }
    }

    // Try to get channel ID through profiles
    if (options.stripeCustomerId || options.userId || options.userEmail) {
      const { data, error } = await supabase
        .from("profiles")
        .select("restaurants!inner(slack_channel_id)")
        .or(
          `stripe_customer_id.eq.${options.stripeCustomerId},id.eq.${options.userId},email.eq.${options.userEmail}`
        )
        .single();

      if (!error && data) {
        const response = data as ProfileResponse;
        return response.restaurants[0]?.slack_channel_id;
      }
    }

    // Try to get channel ID through subscription
    if (options.subscriptionId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("profiles!inner(restaurants!inner(slack_channel_id))")
        .eq("stripe_subscription_id", options.subscriptionId)
        .single();

      if (!error && data) {
        const response = data as SubscriptionResponse;
        return response.profiles[0]?.restaurants[0]?.slack_channel_id;
      }
    }

    return process.env.NEXT_PUBLIC_SLACK_CUSTOMER_CHANNEL_ID!;
  } catch (error) {
    console.error("Error getting Slack channel ID:", error);
    return process.env.NEXT_PUBLIC_SLACK_CUSTOMER_CHANNEL_ID!;
  }
};

/**
 * Main function to send a message to Slack using SDK
 */
const sendToSlack = async ({
  text,
  blocks = [],
  channelId,
  suppressErrors = true,
}: {
  text: string;
  blocks?: any[];
  channelId?: string;
  suppressErrors?: boolean;
}): Promise<void> => {
  try {
    if (!process.env.NEXT_PUBLIC_SLACK_BOT_TOKEN) {
      throw new Error("Slack bot token is not defined");
    }

    const targetChannelId = channelId || defaultChannelId;
    if (!targetChannelId) {
      throw new Error("Channel ID is required (either as parameter or default)");
    }
    // console.log("Sending message to Slack:", {
    //   channel: targetChannelId,
    //   text,
    //   blocks: blocks.length > 0 ? blocks : undefined,
    // });

    // List all channels to find dev-testing
    const result = await slack.conversations.list({
      types: "public_channel,private_channel,mpim,im",
      limit: 1000, // Maximum allowed
      exclude_archived: false,
    });
    // const channels = result.channels || [];
    // const publicChannels = channels.filter((c) => c.is_channel && !c.is_private);
    // const privateChannels = channels.filter((c) => c.is_private && c.is_group);
    // const directMessages = channels.filter((c) => c.is_im);
    // const groupMessages = channels.filter((c) => c.is_mpim);

    // console.log("=== PUBLIC CHANNELS ===");
    // publicChannels.forEach((channel) => {
    //   console.log(`#${channel.name} (${channel.id}) - Members: ${channel.num_members}`);
    // });

    // console.log("\n=== PRIVATE CHANNELS ===");
    // privateChannels.forEach((channel) => {
    //   console.log(`#${channel.name} (${channel.id}) - Members: ${channel.num_members}`);
    // });

    // console.log("\n=== DIRECT MESSAGES ===");
    // directMessages.forEach((channel) => {
    //   console.log(`DM: ${channel.id}`);
    // });

    // console.log("\n=== GROUP MESSAGES ===");
    // groupMessages.forEach((channel) => {
    //   console.log(`Group: ${channel.id} - Members: ${channel.num_members}`);
    // });
    const _result = await slack.chat.postMessage({
      channel: targetChannelId,
      text,
      blocks: blocks.length > 0 ? blocks : undefined,
    });

    if (!_result.ok) {
      throw new Error(`Slack API error: ${_result.error}`);
    }
  } catch (error) {
    console.error("Error sending message to Slack:", error);
    if (!suppressErrors) {
      throw error;
    }
  }
};

/**
 * Creates a formatted message header
 */
const createHeader = (title: string, emoji: string): any => {
  return {
    type: "header",
    text: {
      type: "plain_text",
      text: `${emoji} ${title}`,
      emoji: true,
    },
  };
};

/**
 * Creates a simple section with text
 */
const createSection = (text: string): any => {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: text,
    },
  };
};

/**
 * Creates a section with fields
 */
const createFieldsSection = (fields: { label: string; value: string }[]): any => {
  return {
    type: "section",
    fields: fields.map((field) => ({
      type: "mrkdwn",
      text: `*${field.label}:*\n${field.value}`,
    })),
  };
};

/**
 * Sends a notification with standard formatting
 */
export const sendNotification = async ({
  title,
  message,
  type = "INFO",
  fields = [],
  context,
  channelId,
  suppressErrors = true,
  restaurantName,
  stripeCustomerId,
  userId,
  userEmail,
  restaurantId,
  subscriptionId,
}: {
  title?: string;
  message: string;
  type?: keyof typeof MESSAGE_TYPES;
  fields?: { label: string; value: string }[];
  context?: string;
  channelId?: string;
  suppressErrors?: boolean;
  restaurantName?: string;
  stripeCustomerId?: string;
  userId?: string;
  userEmail?: string;
  restaurantId?: string;
  subscriptionId?: string;
}): Promise<void> => {
  try {
    // Get the appropriate channel ID
    const targetChannelId =
      channelId ||
      (await getSlackChannelId({
        stripeCustomerId,
        userId,
        userEmail,
        restaurantName,
        restaurantId,
        subscriptionId,
      }));

    const messageType = MESSAGE_TYPES[type];
    const blocks = [];

    // Add header with title and emoji
    if (title) {
      blocks.push(createHeader(title, messageType.emoji));
    }

    // Add main message section
    blocks.push(createSection(message));

    // Add fields if provided
    if (fields.length > 0) {
      blocks.push(createFieldsSection(fields));
    }

    // Add context if provided
    if (context) {
      blocks.push(createSection(`*Context:* ${context}`));
    }

    await sendToSlack({
      text: `${messageType.emoji} ${title || messageType.title}: ${message}`,
      blocks,
      channelId: targetChannelId,
      suppressErrors,
    });
  } catch (error) {
    if (!suppressErrors) {
      throw error;
    }
    console.error("Error sending notification:", error);
  }
};

/**
 * Simple method to send a message to Slack
 * Uses sendNotification internally with default settings
 */
export const sendMessage = async (
  message: string,
  options?: {
    channelId?: string;
    suppressErrors?: boolean;
    restaurantName?: string;
    stripeCustomerId?: string;
    userId?: string;
    userEmail?: string;
    restaurantId?: string;
    subscriptionId?: string;
  }
): Promise<void> => {
  await sendNotification({
    message,
    type: "INFO",
    channelId: options?.channelId,
    suppressErrors: options?.suppressErrors,
    restaurantName: options?.restaurantName,
    stripeCustomerId: options?.stripeCustomerId,
    userId: options?.userId,
    userEmail: options?.userEmail,
    restaurantId: options?.restaurantId,
    subscriptionId: options?.subscriptionId,
  });
};

/**
 * Sends an error notification
 */
export const sendErrorNotification = async (
  errorMessage: string,
  context?: any,
  channelId?: string,
  options?: {
    restaurantName?: string;
    stripeCustomerId?: string;
    userId?: string;
    userEmail?: string;
    restaurantId?: string;
    subscriptionId?: string;
  }
): Promise<void> => {
  // Format context based on its type
  let formattedContext: string | undefined;

  if (context) {
    if (typeof context === "object") {
      if (Array.isArray(context)) {
        formattedContext = `Error \`${JSON.stringify(context, null, 2)}\``;
      } else {
        formattedContext = `Error \`\`\`${JSON.stringify(context, null, 2)}\`\`\``;
      }
    } else {
      formattedContext = `Error in ${context}`;
    }
  }

  return sendNotification({
    title: "Error Alert",
    message: errorMessage,
    type: "ERROR",
    context: formattedContext,
    channelId,
    ...options,
  });
};

/**
 * Sends a notification about a Stripe payment intent
 */
export const notifyStripePaymentIntent = async (
  paymentIntent: Stripe.PaymentIntent,
  status: "success" | "failed" | "pending" = "success",
  channelId?: string,
  options?: {
    restaurantName?: string;
    stripeCustomerId?: string;
    userId?: string;
    userEmail?: string;
    restaurantId?: string;
    subscriptionId?: string;
  }
): Promise<void> => {
  const type = status === "failed" ? "ERROR" : status === "pending" ? "WARNING" : "PAYMENT";

  const title =
    status === "failed"
      ? "Payment Failed"
      : status === "pending"
      ? "Payment Pending"
      : "Payment Successful";

  const fields = [
    { label: "Payment ID", value: paymentIntent.id },
    {
      label: "Amount",
      value: formatCurrency(paymentIntent.amount, paymentIntent.currency),
    },
    { label: "Status", value: paymentIntent.status },
  ];

  if (paymentIntent.last_payment_error && status === "failed") {
    fields.push({
      label: "Reason",
      value: paymentIntent.last_payment_error.message || "Unknown error",
    });
  }

  // Add @channel mention for failed payments
  const baseMessage = `Payment ${status}: ${formatCurrency(
    paymentIntent.amount,
    paymentIntent.currency
  )}`;
  const message = status === "failed" ? `<!channel> ${baseMessage}` : baseMessage;

  return sendNotification({
    title,
    message,
    type,
    fields,
    context: `Payment processed at ${formatDate(paymentIntent.created)}`,
    channelId,
    ...options,
  });
};

/**
 * Sends a notification about a Stripe customer
 */
export const notifyStripeCustomer = async (
  customer: Stripe.Customer,
  isNew: boolean = true,
  channelId?: string,
  options?: {
    restaurantName?: string;
    stripeCustomerId?: string;
    userId?: string;
    userEmail?: string;
    restaurantId?: string;
    subscriptionId?: string;
  }
): Promise<void> => {
  return sendNotification({
    title: isNew ? "New Customer" : "Customer Updated",
    message: `Customer: ${customer.name || customer.email || customer.id}`,
    type: "CUSTOMER",
    fields: [
      { label: "Name", value: customer.name || "N/A" },
      { label: "Email", value: customer.email || "N/A" },
      { label: "ID", value: customer.id },
      { label: "Created", value: formatDate(customer.created) },
    ],
    channelId,
    ...options,
  });
};

/**
 * Sends a notification about a Stripe subscription
 */
export const notifyStripeSubscription = async (
  subscription: Stripe.Subscription,
  status: "created" | "updated" | "cancelled" = "created",
  channelId?: string,
  options?: {
    restaurantName?: string;
    stripeCustomerId?: string;
    userId?: string;
    userEmail?: string;
    restaurantId?: string;
    subscriptionId?: string;
  }
): Promise<void> => {
  const title =
    status === "created"
      ? "New Subscription"
      : status === "cancelled"
      ? "Subscription Cancelled"
      : "Subscription Updated";

  const type = status === "cancelled" ? "WARNING" : "SUBSCRIPTION";

  // Add user tag for successful subscription creation
  const baseMessage = `Subscription ${status}: ${subscription.id}`;
  const userToTag = options?.userId || defaultTagUserId;
  const message =
    status === "created" && userToTag ? `<@${userToTag}> ${baseMessage}` : baseMessage;

  return sendNotification({
    title,
    message,
    type,
    fields: [
      { label: "ID", value: subscription.id },
      { label: "Status", value: subscription.status },
      { label: "Customer", value: subscription.customer as string },
      {
        label: "Plan",
        value:
          subscription.items.data[0]?.plan.nickname ||
          subscription.items.data[0]?.price.nickname ||
          "N/A",
      },
      {
        label: "Period Start",
        value: formatDate(subscription.items.data[0]?.current_period_start),
      },
      {
        label: "Period End",
        value: formatDate(subscription.items.data[0]?.current_period_end),
      },
    ],
    context:
      status === "cancelled" && subscription.cancel_at_period_end
        ? `Subscription will end at the end of the current billing period (${formatDate(
            subscription.items.data[0]?.current_period_end
          )})`
        : undefined,
    channelId,
    ...options,
  });
};

/**
 * Sends a notification about a Stripe invoice
 */
export const notifyStripeInvoice = async (
  invoice: Stripe.Invoice,
  status: "paid" | "failed" = "paid",
  channelId?: string,
  options?: {
    restaurantName?: string;
    stripeCustomerId?: string;
    userId?: string;
    userEmail?: string;
    restaurantId?: string;
    subscriptionId?: string;
  }
): Promise<void> => {
  const title = status === "paid" ? "Invoice Paid" : "Invoice Payment Failed";
  const type = status === "paid" ? "SUCCESS" : "ERROR";

  const fields = [
    { label: "Invoice", value: invoice.number || invoice.id },
    {
      label: "Amount",
      value: formatCurrency(
        status === "paid" ? invoice.amount_paid : invoice.amount_due,
        invoice.currency
      ),
    },
    { label: "Customer", value: invoice.customer as string },
  ];

  if (status === "failed") {
    fields.push({
      label: "Attempt Count",
      value: invoice.attempt_count?.toString() || "1",
    });
    if (invoice.next_payment_attempt) {
      fields.push({
        label: "Next Attempt",
        value: formatDate(invoice.next_payment_attempt),
      });
    }
  } else {
    fields.push({
      label: "Date",
      value: formatDate(invoice.status_transitions?.paid_at || invoice.created),
    });
  }

  // Add @channel mention for failed payments
  const baseMessage = `Invoice ${invoice.number || invoice.id} ${
    status === "paid" ? "paid" : "payment failed"
  }: ${formatCurrency(
    status === "paid" ? invoice.amount_paid : invoice.amount_due,
    invoice.currency
  )}`;
  const message = status === "failed" ? `<!channel> ${baseMessage}` : baseMessage;

  return sendNotification({
    title,
    message,
    type,
    fields: fields as NotificationField[],
    channelId,
    ...options,
  });
};

/**
 * Additional utility functions using Slack SDK
 */

/**
 * Helper function to format user mentions
 */
export const formatUserMention = (userId: string): string => {
  return `<@${userId}>`;
};

/**
 * Helper function to format channel mentions
 */
export const formatChannelMention = (type: "channel" | "here" = "channel"): string => {
  return `<!${type}>`;
};

/**
 * Get user information by email
 */
export const getUserByEmail = async (email: string) => {
  try {
    const result = await slack.users.lookupByEmail({
      email,
    });

    return result.user;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
};

/**
 * Get user information by user ID
 */
export const getUserInfo = async (userId: string) => {
  try {
    const result = await slack.users.info({
      user: userId,
    });

    return result.user;
  } catch (error) {
    console.error("Error getting user info:", error);
    throw error;
  }
};

/**
 * Get channel information
 */
export const getChannelInfo = async (channelId?: string) => {
  try {
    const targetChannelId = channelId || defaultChannelId;
    if (!targetChannelId) {
      throw new Error("Channel ID is required");
    }

    const result = await slack.conversations.info({
      channel: targetChannelId,
    });

    return result.channel;
  } catch (error) {
    console.error("Error getting channel info:", error);
    throw error;
  }
};

/**
 * List channels in workspace
 */
export const listChannels = async () => {
  try {
    const result = await slack.conversations.list({
      types: "public_channel,private_channel",
    });

    return result.channels;
  } catch (error) {
    console.error("Error listing channels:", error);
    throw error;
  }
};

/**
 * Send a direct message to a user
 */
export const sendDirectMessage = async (userId: string, text: string, blocks?: any[]) => {
  try {
    // Open a DM channel with the user
    const dmResult = await slack.conversations.open({
      users: userId,
    });

    if (!dmResult.ok || !dmResult.channel) {
      throw new Error("Failed to open DM channel");
    }

    // Send the message
    return sendToSlack({
      text,
      blocks,
      channelId: dmResult.channel.id,
      suppressErrors: false,
    });
  } catch (error) {
    console.error("Error sending direct message:", error);
    throw error;
  }
};
