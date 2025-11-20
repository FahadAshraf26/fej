// backend/services/template/TemplateService.ts
import { supabaseServer as supabase } from "@database/server.connection";
import { ITemplateDetails, DeleteAssetsIDs } from "../../../interfaces/ITemplate";
import { v4 as uuidv4 } from "uuid";
import { prepareTemplateForArchive } from "backend/utils/template";
import { archiveTemplateSchema } from "backend/schemas/template.schema";
import { injectable } from "tsyringe";
import { APP_CONFIG } from "@Contants/app";
@injectable()
export class TemplateService {
  constructor() {}

  /**
   * Fetches templates by restaurant ID
   */
  async getTemplatesByRestaurantId(
    restaurantId: string,
    page: number = 0,
    pageSize: number = 15
  ): Promise<ITemplateDetails[]> {
    try {
      // First get the restaurant's default location
      const { data: defaultLocation, error: locationError } = await supabase
        .from("locations")
        .select("*")
        .eq("restaurantId", restaurantId)
        .eq("name", APP_CONFIG.LOCATION.DEFAULT)
        .single();

      if (locationError && locationError.code !== "PGRST116") throw locationError;

      // Build the query
      let query = supabase
        .from("templates")
        .select("*, locationInformation:locations!locationId(*)")
        .neq("id", 2044) // Exclude template with ID 2044 (default template)
        .is("deleted_at", null)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      // Only apply pagination if restaurantId is "2"
      if (restaurantId === "2") {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, status } = await query;

      if (error) throw error;

      // Transform the data to use default location when locationId is null
      const transformedData =
        data?.map((template) => ({
          ...template,
          locationInformation: template.locationInformation || defaultLocation || null,
        })) || [];

      return status === 200 ? (transformedData as ITemplateDetails[]) : [];
    } catch (err) {
      console.error("Error fetching templates:", err);
      throw err;
    }
  }

  /**
   * Updates the published status of a template
   */
  async updateTemplatePublishedStatus(templateId: number, isPublished: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from("templates")
        .update({ isGlobal: isPublished })
        .eq("id", templateId);

      if (error) throw error;
    } catch (err) {
      console.error("Error updating template published status:", err);
      throw err;
    }
  }

  /**
   * Archives and deletes a template
   */
  async deleteTemplate(templateId: number, userId: string): Promise<void> {
    try {
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("*, locationInformation:locations!locationId(*)")
        .eq("id", templateId)
        .single();
      if (templateError) throw templateError;

      await this.archiveTemplate(template);

      const { data, error } = await supabase
        .from("templates")
        .update({ deleted_at: new Date() })
        .eq("id", templateId)
        .select(); // Add this to see what's being affected

      if (error) throw error;

      // Clean up storage
      try {
        await supabase.storage.from("PDFs").remove([`${template.restaurant_id}/${templateId}.pdf`]);

        const { data: images } = await supabase.storage
          .from("JPEGs")
          .list(`${template.restaurant_id}/${templateId}`);

        if (images && images.length > 0) {
          const imgPaths = images.map(
            (image) => `${template.restaurant_id}/${templateId}/${image.name}`
          );
          await supabase.storage.from("JPEGs").remove(imgPaths);
        }
      } catch (storageError) {
        console.error("Error cleaning storage:", storageError);
        // Continue even if storage cleanup fails
      }
    } catch (err) {
      console.error("Error deleting template:", err);
      throw err;
    }
  }

  /**
   * Renames a template
   */
  async renameTemplate(id: number, name: string, description: string): Promise<void> {
    try {
      const { error } = await supabase.from("templates").update({ name, description }).eq("id", id);

      if (error) throw error;
    } catch (err) {
      console.error("Error renaming template:", err);
      throw err;
    }
  }

  /**
   * Duplicates a template and all its related data
   */
  async duplicateTemplate(
    id: number,
    name: string,
    description: string,
    userId: string
  ): Promise<ITemplateDetails> {
    try {
      // Get original template data
      const { data, error } = await supabase
        .from("templates")
        .select(
          "name, description, content, isGlobal, location, locationId, restaurant_id, isAutoLayout"
        )
        .eq("id", id)
        .single();
      if (error) throw error;

      // Get user data to check role
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (userError) throw userError;

      // Create new content location
      const newLocation = uuidv4();

      // Copy template content in storage
      const { error: copyError } = await supabase.storage
        .from("templates")
        .copy(data.content, newLocation);

      if (copyError) throw copyError;

      // Create new template record
      const { data: duplicateData, error: duplicateError } = await supabase
        .from("templates")
        .insert({
          name,
          description,
          content: newLocation,
          isGlobal: userData?.role === "flapjack" ? false : true, // Only flapjack users get non-global by default
          restaurant_id: data.restaurant_id,
          createdBy: userId,
          created_at: new Date(),
          updatedAt: new Date(),
          location: data.location,
          locationId: data.locationId,
          isAutoLayout: data.isAutoLayout,
        })
        .select("*, locationInformation:locations!locationId(*)");
      if (duplicateError) throw duplicateError;
      // Duplicate component layouts
      await this.duplicateRelatedData(id, duplicateData[0].id, data.restaurant_id);

      return duplicateData[0] as ITemplateDetails;
    } catch (err) {
      console.error("Error duplicating template:", err);
      throw err;
    }
  }

  /**
   * Toggles the global status of a template
   */
  async toggleGlobalTemplate(templateId: number, userId: string): Promise<void> {
    try {
      // Get current template
      const { data, error } = await supabase
        .from("templates")
        .select("isGlobal")
        .eq("id", templateId)
        .single();

      if (error) throw error;

      // Toggle global status
      const { error: updateError } = await supabase
        .from("templates")
        .update(data.isGlobal ? { createdBy: userId, isGlobal: false } : { isGlobal: true })
        .eq("id", templateId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error("Error toggling global status:", err);
      throw err;
    }
  }

  /**
   * Transfers a template to another restaurant
   */
  async transferTemplate(
    templateId: number,
    restaurantId: string,
    locationId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("templates")
        .update({
          restaurant_id: restaurantId,
          locationId: locationId,
        })
        .eq("id", templateId);

      if (error) throw error;
    } catch (err) {
      console.error("Error transferring template:", err);
      throw err;
    }
  }

  /**
   * Updates template location
   */
  async updateTemplateLocation(templateId: number, locationId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .update({ locationId })
        .eq("id", templateId)
        .select("*, locationInformation:locations!locationId(*)");

      if (error) throw error;

      return data;
    } catch (err) {
      console.error("Error updating template location:", err);
      throw err;
    }
  }

  /**
   * Updates auto layout status
   */
  async updateAutoLayoutStatus(templateId: number, isAutoLayout: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from("templates")
        .update({ isAutoLayout })
        .eq("id", templateId);

      if (error) throw error;
    } catch (err) {
      console.error("Error updating auto layout status:", err);
      throw err;
    }
  }

  /**
   * Archives a template before deletion
   */
  private async archiveTemplate(template: ITemplateDetails): Promise<boolean | Error> {
    try {
      // Generate a unique location for the new copy
      const newLocation = uuidv4();

      // First make the copy operation
      const { error: copyError } = await supabase.storage
        .from("templates")
        .copy(template.content, newLocation);

      if (copyError) throw copyError;

      // Get existing archive record (if any)
      const { data: archiveTemplates, error: fetchError } = await supabase
        .from("archive_templates")
        .select("*")
        .eq("id", template.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      // New archive entry to add
      const newArchiveEntry = {
        content: newLocation,
        time: new Date(),
        location: template.locationInformation?.name || template.location,
      };

      if (!archiveTemplates) {
        // Use our function to prepare the data
        const archiveData = prepareTemplateForArchive(template, newArchiveEntry);

        // Validate with Zod (optional)
        const result = archiveTemplateSchema.safeParse(archiveData);

        if (!result.success) {
          console.error("Invalid archive template data:", result.error);
          throw new Error("Failed to prepare archive data");
        }

        // Insert the properly formatted data
        const { data, error } = await supabase
          .from("archive_templates")
          .insert(archiveData)
          .select();

        if (error) throw error;
      } else {
        // Update existing archive (same as before)
        const content = [...(archiveTemplates.content || [])];

        if (content.length >= 4) {
          const oldestEntry = content.shift();
          if (oldestEntry?.content) {
            try {
              await supabase.storage.from("templates").remove([oldestEntry.content]);
            } catch (err) {
              console.error("Error removing old template:", err);
            }
          }
        }

        content.push(newArchiveEntry);
        await supabase.from("archive_templates").update({ content }).eq("id", template.id);
      }

      return Promise.resolve(true);
    } catch (err) {
      console.error("Template archive failed:", err);
      return Promise.resolve(false);
    }
  }

  /**
   * Duplicates related data for a template (layouts, pages, sections, etc.)
   */
  private async duplicateRelatedData(
    sourceTemplateId: number,
    targetTemplateId: number,
    restaurantId: string
  ): Promise<void> {
    try {
      // Get all component layouts
      const { data: allComponentLayouts, error: layoutsError } = await supabase
        .from("ComponentLayout")
        .select("*")
        .eq("menuId", sourceTemplateId);

      if (layoutsError) throw layoutsError;

      // Create a mapping for layouts to reference in other tables
      const layoutMapping = new Map();

      // Duplicate layouts
      const duplicatedLayouts = await Promise.all(
        allComponentLayouts.map(async (layout) => {
          const { id: oldId, ...layoutWithoutId } = layout;

          const { data: newLayout, error: createError } = await supabase
            .from("ComponentLayout")
            .insert({
              ...layoutWithoutId,
              menuId: targetTemplateId,
              restaurantId,
            })
            .select();

          if (createError) throw createError;

          layoutMapping.set(oldId, newLayout[0].id);
          return newLayout[0];
        })
      );

      // Get all pages
      const { data: pagesData, error: pagesError } = await supabase
        .from("pages")
        .select("*")
        .eq("menu_id", sourceTemplateId);

      if (pagesError) throw pagesError;

      // Duplicate pages and their sections/dishes
      for (const page of pagesData) {
        // Create new page
        const { data: newPage, error: pageError } = await supabase
          .from("pages")
          .insert({
            ...page,
            id: undefined,
            menu_id: targetTemplateId,
            pageUniqueId: uuidv4(),
          })
          .select();

        if (pageError) throw pageError;

        // Get sections for this page
        const { data: sectionsData, error: sectionsError } = await supabase
          .from("sections")
          .select("*")
          .eq("page_id", page.id);

        if (sectionsError) throw sectionsError;

        // Duplicate sections
        for (const section of sectionsData) {
          const newSectionId = uuidv4();

          // Map layouts to new IDs
          const newDishLayout = section.dish_layout ? layoutMapping.get(section.dish_layout) : null;

          const newTitleLayout = section.title_layout
            ? layoutMapping.get(section.title_layout)
            : null;

          const newTempTitleLayout = section.temp_title_layout
            ? layoutMapping.get(section.temp_title_layout)
            : null;

          const newTempDishLayout = section.temp_dish_layout
            ? layoutMapping.get(section.temp_dish_layout)
            : null;

          // Create new section
          const { data: newSection, error: sectionError } = await supabase
            .from("sections")
            .insert({
              ...section,
              id: undefined,
              page_id: newPage[0].id,
              sectionId: newSectionId,
              sectionUniqueId: newSectionId,
              dish_layout: newDishLayout,
              title_layout: newTitleLayout,
              temp_title_layout: newTempTitleLayout,
              temp_dish_layout: newTempDishLayout,
              dndLayout: {
                ...section.dndLayout,
                i: newSectionId,
              },
            })
            .select();

          if (sectionError) throw sectionError;

          // Update related layouts with new section ID
          const sectionLayouts = duplicatedLayouts.filter(
            (layout) => layout.sectionId === section.sectionId
          );

          await Promise.all(
            sectionLayouts.map(async (layout) => {
              const { error: updateError } = await supabase
                .from("ComponentLayout")
                .update({ sectionId: newSectionId })
                .eq("id", layout.id);

              if (updateError) throw updateError;
            })
          );

          // Get dishes for this section
          const { data: dishesData, error: dishesError } = await supabase
            .from("menu_dishes")
            .select("*")
            .eq("section", section.id);

          if (dishesError) throw dishesError;

          // Prepare dishes for insertion
          const newDishes = dishesData.map((dish) => {
            const { id: _, ...dishWithoutId } = dish;
            return {
              ...dishWithoutId,
              section: newSection[0].id,
              frontend_id: uuidv4(),
            };
          });

          // Insert dishes if there are any
          if (newDishes.length > 0) {
            const { error: dishError } = await supabase.from("menu_dishes").insert(newDishes);

            if (dishError) throw dishError;
          }
        }
      }
    } catch (err) {
      console.error("Error duplicating related data:", err);
      throw err;
    }
  }

  /**
   * Duplicates images for a template
   */
  private async duplicateImages(sourceTemplateId: number, targetTemplateId: number): Promise<void> {
    try {
      const { data: imagesData } = await supabase.storage
        .from("renderings")
        .list(sourceTemplateId.toString());

      if (imagesData && imagesData.length > 0) {
        await Promise.all(
          imagesData.map((image) =>
            supabase.storage
              .from("renderings")
              .copy(`${sourceTemplateId}/${image.name}`, `${targetTemplateId}/${image.name}`)
          )
        );
      }
    } catch (err) {
      console.error("Error duplicating images:", err);
      throw err;
    }
  }

  /**
   * Uploads a cover image for a template
   */
  async uploadCoverImage(templateId: number, imageFile: File | Blob): Promise<void> {
    try {
      const folderPath = `renderings/${templateId}`;

      // Check if the file already exists
      const fileUrl = `${
        process.env.NEXT_PUBLIC_SUPABASE_URL
      }/storage/v1/object/public/renderings/${templateId}/coverImage?${Date.now()}`;

      // Test if file exists by sending a HEAD request
      const response = await fetch(fileUrl, { method: "HEAD" });
      const fileExists = response.ok;

      if (fileExists) {
        await supabase.storage.from(folderPath).update("coverImage", imageFile, { upsert: true });
      } else {
        await supabase.storage.from(folderPath).upload("coverImage", imageFile);
      }

      const { error: updateError } = await supabase
        .from("templates")
        .update({ hasThumbnail: true })
        .eq("id", templateId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error("Error uploading cover image:", err);
      throw err;
    }
  }
}
