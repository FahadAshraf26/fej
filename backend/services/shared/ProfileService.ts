import { inject, injectable } from "tsyringe";
import { ProfileRepository } from "@repositories/implementations/ProfileRepository";
import type { IProfileRepository } from "@repositories/interfaces/IProfileRepository";
import { dispatchErrorEvent, dispatchInfoEvent } from "../eventService";

@injectable()
export class ProfileService {
  constructor(@inject(ProfileRepository) private profileRepository: IProfileRepository) {}

  async getByEmail(email: string) {
    return this.profileRepository.getByEmail(email);
  }

  async getByCustomerId(customerId: string) {
    return this.profileRepository.getByCustomerId(customerId);
  }

  async updateUserCustomerId(email: string, customerId: string) {
    return this.profileRepository.updateUserCustomerId(email, customerId);
  }

  async updateSubscriptionStatus(customerId: string, isActive: boolean) {
    return this.profileRepository.updateSubscriptionStatus(customerId, isActive);
  }

  async updateRestaurantId(profileId: string, restaurantId: string) {
    return this.profileRepository.updateRestaurantId(profileId, restaurantId);
  }

  async create(email: string, name: string, phone: string, customerId: string, role: string) {
    return this.profileRepository.create({
      email,
      customer_name: name,
      phone,
      stripe_customer_id: customerId,
      role,
      subscriptionActive: false,
    });
  }

  async update(id: string, data: any) {
    return this.profileRepository.update(id, data);
  }
}
