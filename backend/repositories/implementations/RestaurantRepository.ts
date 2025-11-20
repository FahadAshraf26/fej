import { injectable } from "tsyringe";
import { supabaseServer as supabase } from "@database/server.connection";
import { IRestaurantRepository, Restaurant } from "../interfaces/IRestaurantRepository";
import { dispatchErrorEvent } from "@services/eventService";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class RestaurantRepository implements IRestaurantRepository {
  async findById(id: string): Promise<Restaurant | null> {
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to find restaurant: ${error.message}`);
      throw error;
    }

    return restaurant;
  }

  async findAll(): Promise<Restaurant[]> {
    const { data: restaurants, error } = await supabase.from("restaurants").select("*");

    if (error) {
      dispatchErrorEvent(`Failed to find restaurants: ${error.message}`);
      throw error;
    }

    return restaurants || [];
  }

  async create(data: Partial<Restaurant>): Promise<Restaurant> {
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .insert([data])
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to create restaurant: ${error.message}`);
      throw error;
    }

    return restaurant;
  }

  async update(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      dispatchErrorEvent(`Failed to update restaurant: ${error.message}`);
      throw error;
    }

    return restaurant;
  }

  async delete(restaurantId: string): Promise<void> {
    try {
      // Start a transaction using batched writes
      const deletions: Promise<any>[] = [];

      // 1. Delete all templates associated with this restaurant
      const { data: templates, error: templatesError } = await supabase
        .from("templates")
        .select("id")
        .eq("restaurant_id", restaurantId);

      if (templatesError) throw templatesError;

      if (templates && templates.length > 0) {
        const templateIds = templates.map((t) => t.id);

        // Archive templates before deletion
        for (const templateId of templateIds) {
          // Get template data
          const { data: template, error: templateError } = await supabase
            .from("templates")
            .select("*")
            .eq("id", templateId)
            .single();

          if (templateError) throw templateError;

          if (!template?.id) return;
          const { data: archiveTemplate } = await supabase
            .from("archive_templates")
            .select("*")
            .eq("id", template?.id);
          const newLocation = uuidv4();
          const { error: coppyError }: { data: any; error: any } = await supabase.storage
            .from("templates")
            .copy(template.content, newLocation);
          if (coppyError) throw coppyError;
          let archiveTemplateData = archiveTemplate?.[0];
          if (archiveTemplateData) {
            if (archiveTemplateData?.content?.length <= 4) {
              const content = [
                ...archiveTemplateData.content,
                { content: newLocation, time: new Date() },
              ];
              await supabase.from("archive_templates").update({ content }).eq("id", template?.id);
            } else {
              const content = archiveTemplateData.content;
              const { error } = await supabase.storage
                .from("templates")
                .remove([archiveTemplateData.content?.[0]?.content]);
              if (error) throw error;
              content.shift();
              content.push({ content: newLocation, time: new Date() });
              await supabase.from("archive_templates").update({ content }).eq("id", template?.id);
            }
          } else {
            const { data: location } = await supabase
              .from("locations")
              .select("name")
              .eq("id", template.locationId)
              .single();
            template.location = location?.name;
            delete template.deleted_at;
            delete template.locationId;
            const { error: archiveError } = await supabase
              .from("archive_templates")
              .insert({
                ...template,
                content: [{ content: newLocation, time: new Date() }],
              })
              .select();
            if (archiveError) throw archiveError; // if error it will return erro
          }
        }

        // Delete actual templates
        deletions.push(Promise.resolve(supabase.from("templates").delete().in("id", templateIds)));

        // Delete component layouts
        deletions.push(
          Promise.resolve(supabase.from("ComponentLayout").delete().in("menuId", templateIds))
        );

        // Delete pages and related data (separate query for each template to avoid huge IN clauses)
        for (const templateId of templateIds) {
          // Get pages
          const { data: pages, error: pagesError } = await supabase
            .from("pages")
            .select("id")
            .eq("menu_id", templateId);

          if (pagesError) throw pagesError;

          if (pages && pages.length > 0) {
            const pageIds = pages.map((p) => p.id);

            // Get sections
            const { data: sections, error: sectionsError } = await supabase
              .from("sections")
              .select("id")
              .in("page_id", pageIds);

            if (sectionsError) throw sectionsError;

            if (sections && sections.length > 0) {
              const sectionIds = sections.map((s) => s.id);

              // Delete dishes
              deletions.push(
                Promise.resolve(supabase.from("menu_dishes").delete().in("section", sectionIds))
              );
            }

            // Delete sections
            if (sections && sections.length > 0) {
              deletions.push(
                Promise.resolve(supabase.from("sections").delete().in("page_id", pageIds))
              );
            }

            // Delete pages
            deletions.push(
              Promise.resolve(supabase.from("pages").delete().eq("menu_id", templateId))
            );
          }
        }
      }

      // 2. Delete all users associated with this restaurant
      deletions.push(
        Promise.resolve(supabase.from("profiles").delete().eq("restaurant_id", restaurantId))
      );

      // 3. Delete all locations associated with this restaurant
      deletions.push(
        Promise.resolve(supabase.from("locations").delete().eq("restaurant_id", restaurantId))
      );

      // 4. Delete the restaurant itself
      deletions.push(Promise.resolve(supabase.from("restaurants").delete().eq("id", restaurantId)));

      // Execute all deletions in parallel
      await Promise.all(deletions);

      // 5. Clean up storage (do this last and don't fail if it errors)
      try {
        // Find all files in the storage related to this restaurant
        // This is approximate since we don't have a direct mapping

        // Delete PDFs
        const { data: pdfs } = await supabase.storage.from("PDFs").list(restaurantId);

        if (pdfs && pdfs.length > 0) {
          const pdfPaths = pdfs.map((file) => `${restaurantId}/${file.name}`);
          await supabase.storage.from("PDFs").remove(pdfPaths);
        }

        // Delete JPEGs
        const { data: jpegFolders } = await supabase.storage.from("JPEGs").list(restaurantId);

        if (jpegFolders && jpegFolders.length > 0) {
          for (const folder of jpegFolders) {
            const { data: jpegFiles } = await supabase.storage
              .from("JPEGs")
              .list(`${restaurantId}/${folder.name}`);

            if (jpegFiles && jpegFiles.length > 0) {
              const jpegPaths = jpegFiles.map(
                (file) => `${restaurantId}/${folder.name}/${file.name}`
              );
              await supabase.storage.from("JPEGs").remove(jpegPaths);
            }
          }
        }
      } catch (storageError) {
        console.error("Error deleting restaurant storage files:", storageError);
        // Continue even if storage cleanup fails
      }
    } catch (err) {
      console.error("Error deleting restaurant:", err);
    }
  }

  async getByOwnerId(ownerId: string): Promise<{ restaurant: Restaurant | null; error: any }> {
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", ownerId)
      .single();

    return { restaurant, error };
  }

  async getByName(name: string): Promise<{ restaurant: Restaurant | null; error: any }> {
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("name", name)
      .order("created_at", { ascending: true })
      .limit(1);

    return {
      restaurant: restaurants?.[0] || null,
      error,
    };
  }

  async updateOwnerId(restaurantId: string, ownerId: string): Promise<void> {
    const { error } = await supabase
      .from("restaurants")
      .update({ owner_id: ownerId, updated_at: new Date().toISOString() })
      .eq("id", restaurantId);

    if (error) {
      dispatchErrorEvent(`Failed to update owner ID: ${error.message}`);
      throw error;
    }
  }

  async updateLogo(restaurantId: string, logoUrl: string): Promise<void> {
    const { error } = await supabase
      .from("restaurants")
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq("id", restaurantId);

    if (error) {
      dispatchErrorEvent(`Failed to update logo: ${error.message}`);
      throw error;
    }
  }
}
