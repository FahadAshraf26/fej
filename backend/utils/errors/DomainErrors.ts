import { BadRequestError, NotFoundError, ConflictError } from "./HttpErrors";

export class ValidationError extends BadRequestError {
  constructor(message = "Validation failed", public details?: any) {
    super(message, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class ResourceNotFoundError extends NotFoundError {
  constructor(resourceType: string, identifier?: string) {
    super(
      `${resourceType}${identifier ? ` with ${identifier}` : ""} not found`,
      `${resourceType.toUpperCase()}_NOT_FOUND`
    );
  }
}

export class DuplicateResourceError extends ConflictError {
  constructor(resourceType: string, identifier: string) {
    super(
      `${resourceType} with ${identifier} already exists`,
      `${resourceType.toUpperCase()}_EXISTS`
    );
  }
}

export class BillingError extends BadRequestError {
  constructor(message: string, code = "BILLING_ERROR") {
    super(message, code);
  }
}

export class SubscriptionError extends BillingError {
  constructor(message: string, public metadata?: any) {
    super(message, "SUBSCRIPTION_ERROR");
    this.metadata = metadata;
    this.name = "SubscriptionError";
  }
}

export class CustomerError extends BillingError {
  constructor(message: string) {
    super(message, "CUSTOMER_ERROR");
  }
}
