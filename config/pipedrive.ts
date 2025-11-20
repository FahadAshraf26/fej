export const PIPEDRIVE_CONFIG = {
  API_TOKEN: process.env.PIPEDRIVE_API_TOKEN,
  BASE_URL: process.env.PIPEDRIVE_BASE_URL || "https://api.pipedrive.com",
  WEBHOOK_SECRET: process.env.PIPEDRIVE_WEBHOOK_SECRET,
};

export const PIPEDRIVE_EVENTS = {
  DEAL_ADDED: "deal.added",
  DEAL_UPDATED: "deal.updated",
  DEAL_STAGE_CHANGED: "deal.stage_changed",
  DEAL_DELETED: "deal.deleted",
  PERSON_ADDED: "person.added",
  PERSON_UPDATED: "person.updated",
  ORGANIZATION_ADDED: "organization.added",
  ORGANIZATION_UPDATED: "organization.updated",
} as const;

export const RELEVANT_DEAL_EVENTS: string[] = [
  PIPEDRIVE_EVENTS.DEAL_ADDED,
  PIPEDRIVE_EVENTS.DEAL_UPDATED,
  PIPEDRIVE_EVENTS.DEAL_STAGE_CHANGED,
];
