import { injectable, inject } from "tsyringe";
import { type IRestaurantRepository } from "@repositories/interfaces/IRestaurantRepository";
import { dispatchErrorEvent } from "@services/eventService";

@injectable()
export class RestaurantService {
  constructor(
    @inject("RestaurantRepository")
    private restaurantRepository: IRestaurantRepository
  ) {}

  async getByOwnerId(ownerId: string) {
    try {
      const { restaurant, error } =
        await this.restaurantRepository.getByOwnerId(ownerId);
      if (error) throw error;
      return restaurant;
    } catch (error: any) {
      dispatchErrorEvent(
        `Failed to get restaurant by owner ID: ${error.message}`
      );
      throw error;
    }
  }

  async getByName(name: string) {
    try {
      const { restaurant, error } = await this.restaurantRepository.getByName(
        name
      );
      if (error) throw error;
      return restaurant;
    } catch (error: any) {
      dispatchErrorEvent(`Failed to get restaurant by name: ${error.message}`);
      throw error;
    }
  }

  async updateOwnerId(restaurantId: string, ownerId: string) {
    try {
      await this.restaurantRepository.updateOwnerId(restaurantId, ownerId);
    } catch (error: any) {
      dispatchErrorEvent(
        `Failed to update restaurant owner ID: ${error.message}`
      );
      throw error;
    }
  }

  async updateLogo(restaurantId: string, logoUrl: string) {
    try {
      await this.restaurantRepository.updateLogo(restaurantId, logoUrl);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to update restaurant logo: ${error.message}`);
      throw error;
    }
  }

  async create(data: any) {
    try {
      return await this.restaurantRepository.create(data);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to create restaurant: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.restaurantRepository.update(id, data);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to update restaurant: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      await this.restaurantRepository.delete(id);
    } catch (error: any) {
      dispatchErrorEvent(`Failed to delete restaurant: ${error.message}`);
      throw error;
    }
  }
}
