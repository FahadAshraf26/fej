import { inject, injectable } from "tsyringe";
import { v1, v2 } from "pipedrive";
import { PIPEDRIVE_CONFIG } from "@Config/pipedrive";
import { ICustomerData } from "interfaces/IStripe";
import { IPlan } from "interfaces/IPlan";
import { BillingService } from "./payment/BillingService";
import { PlanService } from "./payment/PlanService";
import crypto from "crypto";

// Constants
const PAYMENT_LINK_FIELD_NAME = "Payment Link" as const;
const FINGERPRINT_FIELD_NAME = "Payment Link Data Hash" as const;
const SALES_REP_SLACK_ID_FIELD_NAME = "Sales Rep Slack ID" as const;
const REQUIRED_FIELD_MESSAGES = {
  RESTAURANT_NAME: "Restaurant name is required",
  NAME: "Name is required",
  EMAIL: "Email is required",
} as const;

// Error types
class PipedriveServiceError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "PipedriveServiceError";
  }
}

// Types
export interface PipedriveDealData {
  dealId: number;
  organizationName?: string;
  personName?: string;
  personEmail?: string;
  personPhone?: string;
  assignedUserEmail?: string;
}

type SubscriptionInput = ICustomerData & Pick<IPlan, "id" | "price">;
type Deal = v2.DealItem1;

interface ValidationResult {
  isValid: boolean;
  missingAttributes: string[];
}

interface DealFieldInfo {
  key: string;
  name: string;
  fieldType: string;
}

interface OrganizationData {
  id: number;
  name: string;
}

interface PersonData {
  id: number;
  name: string;
  emails?: v2.GetPersonsResponseAllOfDataInnerEmailsInner[];
  phones?: v2.GetPersonsResponseAllOfDataInnerPhonesInner[];
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

interface CustomFieldValue {
  type: string;
  value: string;
}

// Cache interface for performance optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Service for handling Pipedrive CRM operations including deals, organizations, persons, and users
 */
@injectable()
export class PipedriveService {
  private readonly dealsApi: v2.DealsApi;
  private readonly organizationsApi: v2.OrganizationsApi;
  private readonly personsApi: v2.PersonsApi;
  private readonly usersApi: v1.UsersApi;
  private readonly dealFieldsApi: v1.DealFieldsApi;

  // Simple in-memory cache for performance
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @inject(BillingService) private readonly billingService: BillingService,
    @inject(PlanService) private readonly planService: PlanService
  ) {
    this.validateConfiguration();

    const apiConfig = new v2.Configuration({
      apiKey: PIPEDRIVE_CONFIG.API_TOKEN,
    });

    this.dealsApi = new v2.DealsApi(apiConfig);
    this.organizationsApi = new v2.OrganizationsApi(apiConfig);
    this.personsApi = new v2.PersonsApi(apiConfig);
    this.usersApi = new v1.UsersApi(apiConfig);
    this.dealFieldsApi = new v1.DealFieldsApi(apiConfig);
  }

  /**
   * Validates the Pipedrive configuration
   * @throws {PipedriveServiceError} If API token is missing
   */
  private validateConfiguration(): void {
    if (!PIPEDRIVE_CONFIG.API_TOKEN) {
      throw new PipedriveServiceError(
        "PIPEDRIVE_API_TOKEN environment variable is required",
        "CONFIG_ERROR"
      );
    }
  }

  /**
   * Simple cache implementation
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCached<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Updates a deal and processes subscription link generation
   * @param deal - The deal to update
   */
  async updateDeal(deal: Deal): Promise<void> {
    // Add null/undefined check first
    if (!deal) {
      console.error('PipedriveService.updateDeal: Deal object is null or undefined', {
        timestamp: new Date().toISOString(),
        service: 'PipedriveService',
        method: 'updateDeal'
      });
    }
    
    // Check if status exists and is not "open"
    if (deal.status && deal.status !== "open") {
      console.log('PipedriveService.updateDeal: Skipping deal due to status', {
        dealId: deal.id,
        status: deal.status,
        timestamp: new Date().toISOString()
      });
    }
    
    // If no status property exists, assume it's open and process it
    console.log('PipedriveService.updateDeal: Processing deal', {
      dealId: deal.id,
      status: deal.status || 'undefined',
      timestamp: new Date().toISOString()
    });
    
    try {
      const subscriptionInput = await this.buildSubscriptionInput(deal);
      await this.updateSubscriptionLink(deal, subscriptionInput);
      
      console.log('PipedriveService.updateDeal: Successfully processed deal', {
        dealId: deal.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('PipedriveService.updateDeal: Error processing deal', {
        dealId: deal.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      // Don't re-throw the error to prevent webhook loops
    }
  }

  /**
   * Extracts custom field value from Pipedrive deal
   * @param field - The custom field value
   * @returns Extracted string value or null
   */
  private extractCustomFieldValue(field: any): string | null {
    if (typeof field === "string") {
      return field;
    }
    
    if (typeof field === "object" && field !== null && "value" in field) {
      return field.value;
    }
    
    return null;
  }

  /**
   * Creates a hashed fingerprint of subscription input data to detect changes
   * This includes all fields that affect payment link generation
   * The data is hashed to protect sensitive information (email, phone, etc.)
   * @param subscriptionInput - Subscription input data
   * @returns Hashed fingerprint string (SHA-256 hash)
   */
  private createSubscriptionFingerprint(
    subscriptionInput: Partial<SubscriptionInput>
  ): string {
    // Include all fields that affect the checkout session, including salesRepSlackId
    const fingerprint = {
      price: subscriptionInput.price || null,
      restaurantName: subscriptionInput.restaurantName || null,
      email: subscriptionInput.email || null,
      name: subscriptionInput.name || null,
      phoneNumber: subscriptionInput.phoneNumber || null,
      salesRepSlackId: subscriptionInput.salesRepSlackId || null, // Important: include this!
    };
    
    // Create deterministic JSON string (same data = same string)
    const fingerprintString = JSON.stringify(fingerprint);
    
    // Hash it using SHA-256 for privacy/security
    // This obscures sensitive data while maintaining deterministic comparison
    // Same input data will always produce the same hash
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Checks if a stored fingerprint is in the old JSON format (for backward compatibility)
   * Old format: JSON string starting with "{"
   * New format: SHA-256 hash (64 character hex string)
   * @param storedFingerprint - The stored fingerprint value
   * @returns True if it's in old JSON format
   */
  private isOldFormatFingerprint(storedFingerprint: string): boolean {
    // Old format was JSON string, new format is SHA-256 hash (64 hex chars)
    return storedFingerprint.trim().startsWith('{');
  }

  /**
   * Gets stored fingerprint from Pipedrive deal custom fields
   * @param deal - Deal object to extract fingerprint from
   * @param fingerprintFieldKey - Fingerprint field key
   * @returns Stored fingerprint or null
   */
  private getStoredSubscriptionFingerprint(
    deal: Deal,
    fingerprintFieldKey: string | null
  ): string | null {
    if (!fingerprintFieldKey || !deal.custom_fields?.[fingerprintFieldKey]) {
      return null;
    }

    const fieldValue = deal.custom_fields[fingerprintFieldKey];
    if (typeof fieldValue === "string") {
      return fieldValue;
    }

    if (typeof fieldValue === "object" && fieldValue !== null && "value" in fieldValue) {
      const value = (fieldValue as CustomFieldValue).value;
      return typeof value === "string" ? value : null;
    }

    return null;
  }

  /**
   * Stores fingerprint in Pipedrive custom field
   * This is called as part of updating the payment link field
   * @param dealId - Deal ID
   * @param fingerprint - Fingerprint to store
   * @param fingerprintFieldKey - Fingerprint field key
   */
  private async storeSubscriptionFingerprint(
    dealId: number,
    fingerprint: string,
    fingerprintFieldKey: string
  ): Promise<void> {
    try {
      // Update the fingerprint field in Pipedrive
      const updateRequest = {
        custom_fields: {
          [fingerprintFieldKey]: fingerprint,
        },
      };

      await this.dealsApi.updateDeal({
        id: dealId,
        UpdateDealRequest: updateRequest as v2.UpdateDealRequest,
      });
    } catch (error) {
      console.error(`Error storing fingerprint in Pipedrive for deal ${dealId}:`, error);
      // Don't throw - fingerprint storage failure shouldn't break payment link updates
    }
  }

  /**
   * Extracts payment link value from deal custom fields
   * @param deal - Deal to extract from
   * @param fieldKey - Field key
   * @returns Payment link value or null
   */
  private extractPaymentLinkValue(deal: Deal, fieldKey: string): string | null {
    if (!deal.custom_fields?.[fieldKey]) {
      return null;
    }

    const fieldValue = deal.custom_fields[fieldKey];

    if (typeof fieldValue === "string") {
      return fieldValue;
    }

    if (typeof fieldValue === "object" && fieldValue !== null && "value" in fieldValue) {
      const value = (fieldValue as CustomFieldValue).value;
      return typeof value === "string" ? value : null;
    }

    return null;
  }

  /**
   * Extracts Sales Rep Slack ID from a specific custom field by field key
   * @param customFields - The custom fields object from Pipedrive deal
   * @param fieldKey - The field key to extract from
   * @returns Extracted Slack ID or null
   */
  private extractSalesRepSlackId(customFields: any, fieldKey: string | null): string | null {
    if (!customFields || typeof customFields !== 'object' || !fieldKey) {
      return null;
    }

    try {
      const fieldValue = customFields[fieldKey];
      if (!fieldValue) {
        return null;
      }

      const value = this.extractCustomFieldValue(fieldValue);
      
      // Check if this looks like a valid Slack ID (starts with U followed by 8-11 alphanumeric)
      if (value && this.isValidSlackId(value)) {
        // Remove @ symbol if present for consistency
        return value.startsWith('@') ? value.substring(1) : value;
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting Sales Rep Slack ID:", error);
      return null;
    }
  }

  /**
   * Validates if a string looks like a valid Slack user ID
   * @param value - String to validate
   * @returns True if it looks like a valid Slack ID
   */
  private isValidSlackId(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    // Slack user IDs start with U followed by 8-11 alphanumeric characters
    // They can optionally have an @ prefix
    const cleanValue = value.startsWith('@') ? value.substring(1) : value;
    const slackIdRegex = /^U[A-Z0-9]{8,11}$/i;
    
    return slackIdRegex.test(cleanValue);
  }

  /**
   * Builds subscription input data from deal information
   * @param deal - The deal to extract data from
   * @returns Partial subscription input data
   */
  private async buildSubscriptionInput(deal: Deal): Promise<Partial<SubscriptionInput>> {
    const subscriptionInput: Partial<SubscriptionInput> = {
      dealId: deal.id,
      price: deal.value,
    };

    // Get the Sales Rep Slack ID field
    const salesRepSlackIdField = await this.getSalesRepSlackIdField();
    
    // Extract Sales Rep Slack ID from the specific field
    let salesRepSlackId: string | null = null;
    if (salesRepSlackIdField && deal.custom_fields) {
      salesRepSlackId = this.extractSalesRepSlackId(deal.custom_fields, salesRepSlackIdField.key);
    }

    // Fetch related data in parallel for better performance
    const [organizationData, personData, ownerData] = await Promise.allSettled([
      deal.org_id ? this.fetchOrganizationData(deal.org_id) : Promise.resolve(null),
      deal.person_id ? this.fetchPersonData(deal.person_id) : Promise.resolve(null),
      deal.owner_id ? this.fetchUserData(deal.owner_id) : Promise.resolve(null),
    ]);

    // Process organization data
    if (organizationData.status === "fulfilled" && organizationData.value) {
      subscriptionInput.restaurantName = organizationData.value.name;
    }

    // Process person data
    if (personData.status === "fulfilled" && personData.value) {
      subscriptionInput.name = personData.value.name;
      subscriptionInput.email = personData.value.emails?.[0]?.value;
      subscriptionInput.phoneNumber = personData.value.phones?.[0]?.value;
    }

    // Set salesRepSlackId: use field value if found, otherwise fallback to deal owner email mapping
    if (salesRepSlackId) {
      subscriptionInput.salesRepSlackId = salesRepSlackId;
    } else if (ownerData.status === "fulfilled" && ownerData.value) {
      // Fallback: Map from deal owner's email
      const { getSalesRepSlackId } = await import("@utils/salesRepMapping");
      subscriptionInput.salesRepSlackId = getSalesRepSlackId(ownerData.value.email, undefined);
    }

    return subscriptionInput;
  }

  /**
   * Fetches organization data from Pipedrive with caching
   * @param orgId - Organization ID
   * @returns Organization data or null if error
   */
  private async fetchOrganizationData(orgId: number): Promise<OrganizationData | null> {
    const cacheKey = `org_${orgId}`;
    const cached = this.getCached<OrganizationData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.organizationsApi.getOrganization({ id: orgId });
      const data =
        response.data && response.data.id && response.data.name
          ? {
              id: response.data.id,
              name: response.data.name,
            }
          : null;

      if (data) {
        this.setCached(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error(`Error fetching organization data for ID ${orgId}:`, error);
      return null;
    }
  }

  /**
   * Fetches person data from Pipedrive with caching
   * @param personId - Person ID
   * @returns Person data or null if error
   */
  private async fetchPersonData(personId: number): Promise<PersonData | null> {
    const cacheKey = `person_${personId}`;
    const cached = this.getCached<PersonData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.personsApi.getPerson({ id: personId });
      const data =
        response.data && response.data.id && response.data.name
          ? {
              id: response.data.id,
              name: response.data.name,
              emails: response.data.emails,
              phones: response.data.phones,
            }
          : null;

      if (data) {
        this.setCached(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error(`Error fetching person data for ID ${personId}:`, error);
      return null;
    }
  }

  /**
   * Fetches user data from Pipedrive with caching
   * @param userId - User ID
   * @returns User data or null if error
   */
  private async fetchUserData(userId: number): Promise<UserData | null> {
    const cacheKey = `user_${userId}`;
    const cached = this.getCached<UserData>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.usersApi.getUser({ id: userId });
      const data =
        response.data && response.data.id && response.data.name && response.data.email
          ? {
              id: response.data.id,
              name: response.data.name,
              email: response.data.email,
            }
          : null;

      if (data) {
        this.setCached(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error(`Error fetching user data for ID ${userId}:`, error);
      return null;
    }
  }

  /**
   * Retrieves a plan based on price and price ID
   * @param price - Plan price (in dollars)
   * @param priceId - Stripe price ID
   * @returns Plan data or null if not found
   */
  async getPlan(price: number | string, priceId: string): Promise<IPlan | null> {
    if (!price) {
      return null;
    }

    // Convert price to cents for database comparison
    const priceInCents = Math.round(Number(price) * 100);

    // Try to find plan by price first, then by priceId if available
    let plan = null;

    if (priceId) {
      plan = await this.planService.getPlanByPriceOrPriceId(priceInCents, priceId);
    }

    if (!plan) {
      // Try to find plan by price only
      plan = await this.planService.getPlanByPriceOrPriceId(priceInCents, "");
    }

    return plan;
  }

  /**
   * Updates the subscription link in a deal's custom field
   * @param deal - The deal to update
   * @param subscriptionInput - Subscription input data
   */
  async updateSubscriptionLink(
    deal: Deal,
    subscriptionInput: Partial<SubscriptionInput>
  ): Promise<void> {
    try {
      this.validateDealForUpdate(deal);

      const paymentLinkField = await this.getPaymentLinkField();
      if (!paymentLinkField) {
        console.error(
          `Payment link field '${PAYMENT_LINK_FIELD_NAME}' not found for deal ${deal.id}`
        );
        return;
      }

      // Get fingerprint field
      const fingerprintField = await this.getFingerprintField();

      // Create fingerprint of current subscription data (hashed for security)
      const currentFingerprint = this.createSubscriptionFingerprint(subscriptionInput);
      
      // Check if we have a valid payment link
      const hasValidLink = await this.hasValidPaymentLink(deal, paymentLinkField.key);
      
      if (hasValidLink && deal.id && fingerprintField) {
        // Get the stored fingerprint (what data was used to generate the current link)
        const storedFingerprint = this.getStoredSubscriptionFingerprint(deal, fingerprintField.key);
        
        // Handle backward compatibility: if stored fingerprint is in old JSON format, treat as mismatch
        // This will cause regeneration and migration to new hashed format
        if (storedFingerprint && this.isOldFormatFingerprint(storedFingerprint)) {
          // Continue to regenerate - this will store the new hashed format
        } else if (storedFingerprint === currentFingerprint) {
          // Fingerprints match (both in new hashed format)
          return;
        } else if (storedFingerprint) {
          // Fingerprints don't match - data has changed
          // Continue to regenerate the link with new data
        } else {
          // No stored fingerprint - first time or missing
        }
      }

      // Validate subscription input and update field accordingly
      const validationResult = this.validateSubscriptionInput(subscriptionInput);

      if (!validationResult.isValid) {
        const errorMessage = this.formatValidationErrors(validationResult.missingAttributes);
        await this.updateDealCustomFieldForError(deal.id!, paymentLinkField.key, errorMessage, deal);
        // Don't store fingerprint for error messages
        return;
      }

      // Generate and update payment link
      if (deal.id) {
        const fingerprintField = await this.getFingerprintField();
        await this.generateAndUpdatePaymentLink(
          deal.id,
          subscriptionInput,
          paymentLinkField.key,
          deal,
          currentFingerprint, // Pass fingerprint to store after successful update
          fingerprintField?.key || null
        );
      }
    } catch (error) {
      // Log the error but don't throw it to prevent webhook retries
      console.error(`Error updating subscription link for deal ${deal.id}:`, {
        error: error instanceof Error ? error.message : String(error),
        dealId: deal.id,
      });
      // Don't re-throw the error to prevent webhook loops
    }
  }

  /**
   * Validates deal data for update operations
   * @param deal - Deal to validate
   * @throws {PipedriveServiceError} If deal is invalid
   */
  private validateDealForUpdate(deal: Deal): void {
    if (!deal.id) {
      throw new PipedriveServiceError("Deal ID is required", "INVALID_DEAL");
    }
    if (!deal.custom_fields) {
      throw new PipedriveServiceError("No custom fields found on deal", "INVALID_DEAL");
    }
  }

  /**
   * Retrieves the payment link field configuration with caching
   * 
   * IMPORTANT: For this function to work correctly, the following conditions must be met:
   * 1. A custom field named exactly "Payment Link" must exist in Pipedrive for Deals
   * 2. The field must have a valid key (unique identifier)
   * 3. The field must have a valid field_type
   * 4. The field name must match exactly (case-sensitive): "Payment Link"
   * @returns Payment link field info or null if not found
   */
  private async getPaymentLinkField(): Promise<DealFieldInfo | null> {
    const cacheKey = "payment_link_field";
    const cached = this.getCached<DealFieldInfo>(cacheKey);
    if (cached) return cached;

    try {
      const dealFields = await this.dealFieldsApi.getDealFields();
      const paymentLinkField = dealFields.data.find(
        (field) => field.name === PAYMENT_LINK_FIELD_NAME
      );

      const data =
        paymentLinkField &&
        paymentLinkField.key &&
        paymentLinkField.name &&
        paymentLinkField.field_type
          ? {
              key: paymentLinkField.key,
              name: paymentLinkField.name,
              fieldType: paymentLinkField.field_type,
            }
          : null;

      if (data) {
        this.setCached(cacheKey, data, 30 * 60 * 1000); // Cache for 30 minutes
      }

      return data;
    } catch (error) {
      console.error("Error fetching deal fields:", error);
      return null;
    }
  }

  /**
   * Checks if a deal already has a valid payment link
   * @param deal - Deal to check
   * @param fieldKey - Payment link field key
   * @returns True if valid payment link exists
   */
  private async hasValidPaymentLink(deal: Deal, fieldKey: string): Promise<boolean> {
    if (!deal.custom_fields?.[fieldKey]) {
      return false;
    }

    const fieldValue = deal.custom_fields[fieldKey];

    // Handle different field value structures
    if (typeof fieldValue === "string") {
      const value = fieldValue;
      return this.isValidPaymentUrl(value);
    }

    if (typeof fieldValue === "object" && fieldValue !== null && "value" in fieldValue) {
      const value = (fieldValue as CustomFieldValue).value;
      if (typeof value === "string") {
        return this.isValidPaymentUrl(value);
      }
    }

    return false;
  }

  /**
   * Checks if a URL is a valid payment/checkout URL
   * @param url - URL to check
   * @returns True if it's a valid payment URL
   */
  private isValidPaymentUrl(url: string): boolean {
    if (!url || typeof url !== "string") {
      return false;
    }

    // Must be a valid URL (http or https)
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return false;
    }

    // Must contain payment/checkout indicators
    const paymentIndicators = [
      "/billing/",
      "checkout",
      "stripe.com",
      "subscription",
      "/subscription/",
    ];

    return paymentIndicators.some((indicator) => url.toLowerCase().includes(indicator));
  }

  /**
   * Validates subscription input data
   * @param subscriptionInput - Data to validate
   * @returns Validation result with missing attributes
   */
  private validateSubscriptionInput(
    subscriptionInput: Partial<SubscriptionInput>
  ): ValidationResult {
    const missingAttributes: string[] = [];

    if (!subscriptionInput.restaurantName) {
      missingAttributes.push(REQUIRED_FIELD_MESSAGES.RESTAURANT_NAME);
    }
    if (!subscriptionInput.name) {
      missingAttributes.push(REQUIRED_FIELD_MESSAGES.NAME);
    }
    if (!subscriptionInput.email) {
      missingAttributes.push(REQUIRED_FIELD_MESSAGES.EMAIL);
    }

    return {
      isValid: missingAttributes.length === 0,
      missingAttributes,
    };
  }

  /**
   * Formats validation errors into a readable string
   * @param missingAttributes - Array of missing attribute messages
   * @returns Formatted error string
   */
  private formatValidationErrors(missingAttributes: string[]): string {
    return `Missing attributes:\n${missingAttributes
      .map((reason, index) => `${index + 1}. ${reason}`)
      .join("\n")}`;
  }

  /**
   * Validates if a phone number is in E164 format
   * @param phoneNumber - Phone number to validate
   * @returns True if phone number is in E164 format
   */
  private isValidE164PhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return false;
    }

    // E164 format: +[country code][number] (max 15 digits total)
    // Examples: +1234567890, +44123456789, +8612345678901
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Converts a US phone number to E164 format
   * @param phoneNumber - Phone number to convert
   * @returns Converted phone number in E164 format or null if conversion fails
   */
  private convertToE164(phoneNumber: string): string | null {
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return null;
    }

    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, "");

    // If already in E164 format, return as is
    if (this.isValidE164PhoneNumber(cleaned)) {
      return cleaned;
    }

    // Handle US phone number formats only
    // Format: +1 (234) 567-8900 or +1-234-567-8900
    if (cleaned.startsWith("+1")) {
      // Remove spaces, parentheses, dashes
      cleaned = cleaned.replace(/[^\d+]/g, "");
      if (this.isValidE164PhoneNumber(cleaned)) {
        return cleaned;
      }
    }

    // Format: 1-234-567-8900 (11 digits starting with 1)
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`;
    }

    // Format: 234-567-8900 (10 digits, assume US)
    if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
      return `+1${cleaned}`;
    }

    // If we can't convert it, return null
    return null;
  }

  /**
   * Generates payment link and updates the deal
   * @param dealId - Deal ID to update
   * @param subscriptionInput - Subscription data
   * @param fieldKey - Payment link field key to update
   * @param deal - Deal object for value comparison
   * @param dataFingerprint - Fingerprint of subscription data used to generate link
   * @param fingerprintFieldKey - Fingerprint field key to store the fingerprint
   */
  private async generateAndUpdatePaymentLink(
    dealId: number,
    subscriptionInput: Partial<SubscriptionInput>,
    fieldKey: string,
    deal: Deal,
    dataFingerprint: string,
    fingerprintFieldKey: string | null
  ): Promise<void> {
    const plan = await this.getPlan(subscriptionInput.price as number, "");

    if (!plan) {
      await this.updateDealCustomFieldForError(dealId, fieldKey, "Invalid price", deal);
      return;
    }

    // Convert phone number format if provided (silently, no error handling)
    if (subscriptionInput.phoneNumber) {
      const originalPhone = subscriptionInput.phoneNumber;
      const convertedPhone = this.convertToE164(originalPhone);

      // Update the subscription input with the converted phone number if conversion succeeded
      if (convertedPhone && convertedPhone !== originalPhone) {
        subscriptionInput.phoneNumber = convertedPhone;
        // Regenerate fingerprint if phone number was converted
        dataFingerprint = this.createSubscriptionFingerprint(subscriptionInput);
      }
    }

    // Ensure we have a valid base URL with scheme
    // Use VERCEL_URL as override (auto-set by Vercel for preview branches),
    // fallback to NEXT_PUBLIC_BASE_URL (default for production/local)
    let baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl) {
      console.error('No base URL available - VERCEL_URL and NEXT_PUBLIC_BASE_URL are both unset');
      throw new Error("Base URL is required but not available. Set NEXT_PUBLIC_BASE_URL for local development.");
    }

    // Ensure baseUrl has a scheme (should already have it, but double-check)
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    const checkoutUrl = await this.billingService.setupSubscription(
      subscriptionInput as ICustomerData,
      plan,
      "",
      baseUrl
    );

    // Update the payment link field and fingerprint field together
    await this.updateDealCustomFields(
      dealId,
      {
        [fieldKey]: checkoutUrl,
        ...(fingerprintFieldKey ? { [fingerprintFieldKey]: dataFingerprint } : {}),
      },
      deal,
      dataFingerprint
    );
  }

  /**
   * Validates if a custom field can be updated
   * @param fieldKey - Custom field key
   * @param value - Value to set
   * @returns True if valid
   */
  private validateCustomFieldUpdate(fieldKey: string, value: string): boolean {
    if (!fieldKey || typeof fieldKey !== "string") {
      throw new PipedriveServiceError("Invalid field key", "INVALID_FIELD_KEY");
    }

    if (value === undefined || value === null) {
      throw new PipedriveServiceError(
        "Field value cannot be null or undefined",
        "INVALID_FIELD_VALUE"
      );
    }

    return true;
  }

  /**
   * Checks if a value is an error message
   * @param value - Value to check
   * @returns True if the value is an error message
   */
  private isErrorMessage(value: string): boolean {
    return value.startsWith("Missing attributes:") || value === "Invalid price";
  }

  /**
   * Checks if a custom field value needs to be updated
   * @param deal - Deal to check
   * @param fieldKey - Custom field key
   * @param newValue - New value to set
   * @returns True if update is needed
   */
  private needsCustomFieldUpdate(deal: Deal, fieldKey: string, newValue: string): boolean {
    if (!deal.custom_fields?.[fieldKey]) {
      // Field doesn't exist, needs update
      return true;
    }

    const currentValue = deal.custom_fields[fieldKey];
    let currentValueString = "";

    // Extract the current value based on field structure
    if (typeof currentValue === "string") {
      currentValueString = currentValue;
    } else if (
      typeof currentValue === "object" &&
      currentValue !== null &&
      "value" in currentValue
    ) {
      const value = (currentValue as CustomFieldValue).value;
      currentValueString = typeof value === "string" ? value : String(value);
    }

    // If current value is empty or invalid, needs update
    if (!currentValueString || currentValueString === "Invalid price") {
      return true;
    }

    // If new value is an error message and current is a valid URL, don't update
    if (newValue.startsWith("Missing attributes:") && currentValueString.startsWith("https://")) {
      return false;
    }

    // If both values are error messages and they're the same, don't update
    if (this.isErrorMessage(newValue) && this.isErrorMessage(currentValueString)) {
      return newValue !== currentValueString;
    }

    // If new value is a checkout URL and current is also a checkout URL, don't update
    if (newValue.startsWith("https://") && currentValueString.startsWith("https://")) {
      // Check if both are checkout URLs (they might have different session IDs but same base)
      const isNewCheckoutUrl = newValue.includes("/billing/") || newValue.includes("checkout");
      const isCurrentCheckoutUrl =
        currentValueString.includes("/billing/") || currentValueString.includes("checkout");

      if (isNewCheckoutUrl && isCurrentCheckoutUrl) {
        return false;
      }
    }

    // For other cases, do exact comparison
    return newValue !== currentValueString;
  }

  /**
   * Updates multiple custom fields in a Pipedrive deal (optimized for updating payment link + fingerprint together)
   * @param dealId - ID of the deal to update
   * @param fields - Object mapping field keys to values
   * @param deal - Optional deal object for value comparison
   * @param dataFingerprint - Optional fingerprint of data used to generate the link
   * @returns Promise resolving to the update response or null if error
   */
  async updateDealCustomFields(
    dealId: Deal["id"],
    fields: Record<string, string>,
    deal?: Deal,
    dataFingerprint?: string
  ): Promise<unknown> {
    try {
      // Validate all fields
      for (const [fieldKey, value] of Object.entries(fields)) {
        this.validateCustomFieldUpdate(fieldKey, value);
      }

      // Check if update is needed to prevent infinite loops
      // Only skip if we have the same values AND same fingerprint (meaning data hasn't changed)
      if (deal && dataFingerprint) {
        // Get payment link field and fingerprint field
        const paymentLinkField = await this.getPaymentLinkField();
        const fingerprintField = await this.getFingerprintField();
        
        if (paymentLinkField) {
          const storedFingerprint = fingerprintField
            ? this.getStoredSubscriptionFingerprint(deal, fingerprintField.key)
            : null;
          
          const currentValue = this.extractPaymentLinkValue(deal, paymentLinkField.key);
          const newValue = fields[paymentLinkField.key];
          
          // If value matches AND fingerprint matches, no update needed
          if (currentValue === newValue && storedFingerprint === dataFingerprint) {
            return null;
          }
        }
      } else if (deal) {
        // Fallback to old logic if no fingerprint provided
        const paymentLinkField = await this.getPaymentLinkField();
        if (paymentLinkField) {
          const newValue = fields[paymentLinkField.key];
          if (newValue && !this.needsCustomFieldUpdate(deal, paymentLinkField.key, newValue)) {
            return null;
          }
        }
      }

      // Use the correct Pipedrive API structure for custom fields
      const updateRequest = {
        custom_fields: fields,
      };

      const response = await this.dealsApi.updateDeal({
        id: dealId as number,
        UpdateDealRequest: updateRequest as v2.UpdateDealRequest,
      });

      return response;
    } catch (error) {
      // Log the full error details for debugging
      console.error(`Error updating deal custom fields for deal ${dealId}:`, {
        dealId,
        fields,
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : error,
        fullError: error,
      });

      // Check for specific Pipedrive API errors and log them
      if (error && typeof error === "object") {
        // Handle Axios-like errors
        if ("response" in error) {
          const apiError = error as any;
          const status = apiError.response?.status;
          const data = apiError.response?.data;

          console.error(`Pipedrive API Error for deal ${dealId}:`, {
            status,
            data,
            fields,
          });
        }

        // Handle other types of errors
        if ("code" in error) {
          const errorCode = (error as any).code;
          if (errorCode === "ENOTFOUND" || errorCode === "ECONNREFUSED") {
            console.error(
              `Network error updating deal ${dealId}: Unable to connect to Pipedrive API`
            );
          }
        }
      }

      // Return null instead of throwing to prevent webhook loops
      return null;
    }
  }

  /**
   * Updates a single custom field value in a Pipedrive deal (wrapper for updateDealCustomFields)
   * @param dealId - ID of the deal to update
   * @param fieldKey - Custom field key
   * @param value - New value for the field
   * @param deal - Optional deal object for value comparison
   * @param dataFingerprint - Optional fingerprint of data used to generate the link
   * @returns Promise resolving to the update response or null if error
   */
  async updateDealCustomField(
    dealId: Deal["id"],
    fieldKey: string,
    value: string,
    deal?: Deal,
    dataFingerprint?: string
  ): Promise<unknown> {
    return this.updateDealCustomFields(
      dealId,
      { [fieldKey]: value },
      deal,
      dataFingerprint
    );
  }

  /**
   * Retrieves the fingerprint field configuration with caching
   * 
   * IMPORTANT: For this function to work correctly, the following conditions must be met:
   * 1. A custom field named exactly "Payment Link Data Hash" must exist in Pipedrive for Deals
   * 2. The field must have a valid key (unique identifier)
   * 3. The field must have a valid field_type
   * 4. The field name must match exactly (case-sensitive): "Payment Link Data Hash"
   * 
   * If the field is not found, fingerprint comparison will be skipped (payment links will still update,
   * but the optimization to skip unnecessary updates won't work). This is a graceful degradation.
   * @returns Fingerprint field info or null if not found
   */
  private async getFingerprintField(): Promise<DealFieldInfo | null> {
    const cacheKey = "fingerprint_field";
    const cached = this.getCached<DealFieldInfo>(cacheKey);
    if (cached) return cached;

    try {
      const dealFields = await this.dealFieldsApi.getDealFields();
      const fingerprintField = dealFields.data.find(
        (field) => field.name === FINGERPRINT_FIELD_NAME
      );

      const data =
        fingerprintField &&
        fingerprintField.key &&
        fingerprintField.name &&
        fingerprintField.field_type
          ? {
              key: fingerprintField.key,
              name: fingerprintField.name,
              fieldType: fingerprintField.field_type,
            }
          : null;

      if (data) {
        this.setCached(cacheKey, data, 30 * 60 * 1000); // Cache for 30 minutes
      }

      return data;
    } catch (error) {
      console.error("Error fetching fingerprint field:", error);
      return null;
    }
  }

  /**
   * Retrieves the Sales Rep Slack ID field configuration with caching
   * @returns Sales Rep Slack ID field info or null if not found
   */
  private async getSalesRepSlackIdField(): Promise<DealFieldInfo | null> {
    const cacheKey = "sales_rep_slack_id_field";
    const cached = this.getCached<DealFieldInfo>(cacheKey);
    if (cached) return cached;

    try {
      const dealFields = await this.dealFieldsApi.getDealFields();
      const salesRepSlackIdField = dealFields.data.find(
        (field) => field.name === SALES_REP_SLACK_ID_FIELD_NAME
      );

      const data =
        salesRepSlackIdField &&
        salesRepSlackIdField.key &&
        salesRepSlackIdField.name &&
        salesRepSlackIdField.field_type
          ? {
              key: salesRepSlackIdField.key,
              name: salesRepSlackIdField.name,
              fieldType: salesRepSlackIdField.field_type,
            }
          : null;

      if (data) {
        this.setCached(cacheKey, data, 30 * 60 * 1000); // Cache for 30 minutes
      }

      return data;
    } catch (error) {
      console.error("Error fetching Sales Rep Slack ID field:", error);
      return null;
    }
  }

  // Legacy method for error messages - keep for backward compatibility
  async updateDealCustomFieldForError(
    dealId: Deal["id"],
    fieldKey: string,
    value: string,
    deal?: Deal
  ): Promise<unknown> {
    try {
      // Validate the update request
      this.validateCustomFieldUpdate(fieldKey, value);

      // Check if update is needed to prevent infinite loops
      if (deal && !this.needsCustomFieldUpdate(deal, fieldKey, value)) {
        return null;
      }

      // Use the correct Pipedrive API structure for custom fields
      const updateRequest = {
        custom_fields: {
          [fieldKey]: value,
        },
      };

      const response = await this.dealsApi.updateDeal({
        id: dealId as number,
        UpdateDealRequest: updateRequest as v2.UpdateDealRequest,
      });

      return response;
    } catch (error) {
      // Log the full error details for debugging
      console.error(`Error updating deal custom field ${fieldKey}:`, {
        dealId,
        fieldKey,
        value,
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
              }
            : error,
        fullError: error,
      });

      // Check for specific Pipedrive API errors and log them
      if (error && typeof error === "object") {
        // Handle Axios-like errors
        if ("response" in error) {
          const apiError = error as any;
          const status = apiError.response?.status;
          const data = apiError.response?.data;

          console.error(`Pipedrive API Error for deal ${dealId}:`, {
            status,
            data,
            fieldKey,
          });
        }

        // Handle other types of errors
        if ("code" in error) {
          const errorCode = (error as any).code;
          if (errorCode === "ENOTFOUND" || errorCode === "ECONNREFUSED") {
            console.error(
              `Network error updating deal ${dealId}: Unable to connect to Pipedrive API`
            );
          }
        }
      }

      // Return null instead of throwing to prevent webhook loops
      return null;
    }
  }

  /**
   * Generates a subscription link based on deal data
   * @param dealData - Deal data for link generation
   * @returns Generated subscription URL
   */
  async generateSubscriptionLink(dealData: PipedriveDealData): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const subscriptionId = `sub_${dealData.dealId}_${Date.now()}`;

    // You might want to store this in your database for tracking
    const subscriptionUrl = `${baseUrl}/subscription-checkout?deal_id=${dealData.dealId}&subscription_id=${subscriptionId}`;

    return subscriptionUrl;
  }

  /**
   * Retrieves comprehensive deal data including related entities
   * @param dealId - ID of the deal to fetch
   * @returns Complete deal data with related information
   */
  async getComprehensiveDealData(dealId: number): Promise<PipedriveDealData | null> {
    try {
      const dealResponse = await this.dealsApi.getDeal({ id: dealId });
      const deal = dealResponse.data;

      if (!deal) {
        return null;
      }

      const dealData: PipedriveDealData = {
        dealId: deal.id as number,
      };

      // Fetch related data in parallel for better performance
      const [organizationData, personData, userData] = await Promise.allSettled([
        deal.org_id ? this.fetchOrganizationData(deal.org_id) : Promise.resolve(null),
        deal.person_id ? this.fetchPersonData(deal.person_id) : Promise.resolve(null),
        deal.owner_id ? this.fetchUserData(deal.owner_id) : Promise.resolve(null),
      ]);

      // Process organization data
      if (organizationData.status === "fulfilled" && organizationData.value) {
        dealData.organizationName = organizationData.value.name;
      }

      // Process person data
      if (personData.status === "fulfilled" && personData.value) {
        dealData.personName = personData.value.name;
        dealData.personEmail = personData.value.emails?.[0]?.value;
        dealData.personPhone = personData.value.phones?.[0]?.value;
      }

      // Process user data
      if (userData.status === "fulfilled" && userData.value) {
        dealData.assignedUserEmail = userData.value.email;
      }

      return dealData;
    } catch (error) {
      this.handleError(error, `Error fetching comprehensive deal data for ID ${dealId}`);
      return null;
    }
  }

  /**
   * Centralized error handling
   * @param error - The error to handle
   * @param context - Context message for the error
   */
  private handleError(error: unknown, context: string): never {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Log detailed error information for debugging
    console.error(`${context}:`, {
      message: errorMessage,
      error:
        error instanceof Error
          ? {
              name: error.name,
              stack: error.stack,
              cause: error.cause,
            }
          : error,
      timestamp: new Date().toISOString(),
    });

    if (error instanceof PipedriveServiceError) {
      throw error;
    }

    throw new PipedriveServiceError(`${context}: ${errorMessage}`, "SERVICE_ERROR");
  }

  /**
   * Clears the cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics (useful for monitoring)
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
