// lib/container.ts
import "reflect-metadata";
import { container } from "tsyringe";
import { UserService } from "@services/user/UserService";
import { RestaurantService } from "@services/restaurant/RestaurantService";
import { BillingService } from "@services/payment/BillingService";
import { PlanService } from "@services/payment/PlanService";
import { PaymentProviderService } from "@services/payment/PaymentProviderService";
import { UserRepository } from "@repositories/implementations/UserRepository";
import { BillingRepository } from "@repositories/implementations/BillingRepository";
import { RestaurantRepository } from "@repositories/implementations/RestaurantRepository";

// Clear any existing registrations to prevent duplicates
container.clearInstances();

// Register repositories
container.registerSingleton(UserRepository, UserRepository);
container.registerSingleton(BillingRepository, BillingRepository);
container.registerSingleton(RestaurantRepository, RestaurantRepository);

// Register services
container.registerSingleton(UserService, UserService);
container.registerSingleton(RestaurantService, RestaurantService);
container.registerSingleton(BillingService, BillingService);
container.registerSingleton(PlanService, PlanService);
container.registerSingleton(PaymentProviderService, PaymentProviderService);

// Helper function to resolve services
const getService = <T>(token: any): T => {
  return container.resolve<T>(token);
};

// Export type-safe service accessors
export const getUserService = () => getService<UserService>(UserService);
export const getRestaurantService = () => getService<RestaurantService>(RestaurantService);
export const getBillingService = () => getService<BillingService>(BillingService);
export const getPlanService = () => getService<PlanService>(PlanService);
export const getPaymentProviderService = () =>
  getService<PaymentProviderService>(PaymentProviderService);

// Export type-safe repository accessors
export const getUserRepository = () => getService<UserRepository>(UserRepository);
export const getBillingRepository = () => getService<BillingRepository>(BillingRepository);
export const getRestaurantRepository = () => getService<RestaurantRepository>(RestaurantRepository);

// Export container instance
export { container };
