import { ITemplateDetails } from "../../../interfaces/ITemplate";

/**
 * Client for the Templates API
 */
export const templateActions = {
  /**
   * Get templates by restaurant ID
   */
  async getByRestaurantId(
    restaurantId: string,
    page: number = 0,
    pageSize: number = 15
  ): Promise<ITemplateDetails[]> {
    // Add a timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    const response = await fetch(
      `/api/templates?restaurantId=${restaurantId}&page=${page}&pageSize=${pageSize}&_t=${timestamp}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch templates");
    }

    return response.json();
  },

  /**
   * Update template published status
   */
  async updateTemplatePublishedStatus(templateId: number, isPublished: boolean): Promise<void> {
    const response = await fetch(`/api/templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "toggleGlobal", templateId, isPublished }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update template published status");
    }
  },
  /**
   * Delete a template
   */
  async deleteTemplate(templateId: number, userId: string): Promise<void> {
    const response = await fetch(`/api/templates?templateId=${templateId}&userId=${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete template");
    }
  },

  /**
   * Rename a template
   */
  async renameTemplate(id: number, name: string, description: string): Promise<void> {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "rename",
        id,
        name,
        description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to rename template");
    }
  },

  /**
   * Duplicate a template
   */
  async duplicateTemplate(
    id: number,
    name: string,
    description: string,
    userId: string
  ): Promise<ITemplateDetails> {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "duplicate",
        id,
        name,
        description,
        userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to duplicate template");
    }

    return response.json();
  },

  /**
   * Toggle global status
   */
  async toggleGlobalTemplate(templateId: number, userId: string): Promise<void> {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "toggleGlobal",
        templateId,
        userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to toggle global status");
    }
  },

  /**
   * Transfer template to another restaurant
   */
  async transferTemplate(
    templateId: number,
    restaurantId: string,
    locationId: string
  ): Promise<void> {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "transferTemplate",
        templateId,
        restaurantId,
        locationId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to transfer template");
    }
  },

  /**
   * Update template location
   */
  async updateTemplateLocation(templateId: number, locationId: string): Promise<any> {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "updateLocation",
        templateId,
        locationId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update template location");
    }

    return response.json();
  },

  /**
   * Update auto layout status
   */
  async updateAutoLayoutStatus(templateId: number, isAutoLayout: boolean): Promise<void> {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "updateAutoLayout",
        templateId,
        isAutoLayout,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update auto layout status");
    }
  },

  /**
   * Upload cover image
   */
  async uploadCoverImage(templateId: number, imageFile: File): Promise<string> {
    const formData = new FormData();
    formData.append("templateId", templateId.toString());
    formData.append("coverImage", imageFile);

    const response = await fetch("/api/templates", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload cover image");
    }

    const result = await response.json();
    return result.url;
  },
};
