import { supabase } from "@database/client.connection";
import { useRouter } from "next/router";
import { ITemplateDetails, DeleteAssetsIDs } from "../interfaces";
import { v4 as uuidv4 } from "uuid";
import { templateArchive, useUser } from "./useUser";

export const useTemplateActions = (
  templates: ITemplateDetails[],
  setTemplates: React.Dispatch<React.SetStateAction<ITemplateDetails[]>>,
  setNavMenu: (value: string) => void
) => {
  const router = useRouter();
  const user = useUser();
  const deleteTemplate = async (template: ITemplateDetails) => {
    try {
      if (template) {
        await templateArchive(template);
        const { error, status } = await supabase.from("templates").delete().eq("id", template?.id);
        if (error) throw error;
        let filteredItem = templates.filter((doc) => doc.id !== template?.id);
        setTemplates(filteredItem);

        try {
          await supabase.storage.from("PDFs").remove([`${user?.restaurant_id}/${template.id}.pdf`]);

          const { data, error } = await supabase.storage
            .from("JPEGs")
            .list(`${user?.restaurant_id}/${template.id}`, {
              limit: 20,
              offset: 0,
              sortBy: { column: "name", order: "asc" },
            });
          if (data) {
            const imgArray = data.map((image) => {
              return `${user?.restaurant_id}/${template.id}/${image.name}`;
            });
            await supabase.storage.from("JPEGs").remove(imgArray);
          }
        } catch (error: any) {
          console.error("Error fetching data:", error.message);
        }
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const renameTemplate = async ({
    id,
    name,
    description,
  }: Pick<ITemplateDetails, "id" | "name" | "description">) => {
    try {
      if (id) {
        const { error } = await supabase
          .from("templates")
          .update({ name, description })
          .eq("id", id);
        if (error) throw error;

        // Get updated template
        await refreshTemplate(id);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const duplicateTemplate = async ({
    id,
    name,
    description,
  }: {
    id: number;
    name: string;
    description: string;
  }) => {
    try {
      if (id) {
        const { data, error } = await supabase
          .from("templates")
          .select(
            "name, description, content, isGlobal,location, locationId,restaurant_id,isAutoLayout"
          )
          .eq("id", id);
        if (error) throw error;

        const newLocation = uuidv4();
        const { data: storageLink, error: copyError }: { data: any; error: any } =
          await supabase.storage.from("templates").copy(data[0].content, newLocation);
        if (copyError) throw error;

        const { data: duplicateData, error: duplicateError } = await supabase
          .from("templates")
          .insert({
            name: `${name}`,
            description,
            content: newLocation,
            isGlobal: user?.role === "flapjack" ? false : true,
            restaurant_id: data[0].restaurant_id,
            createdBy: user?.id,
            created_at: new Date(),
            updatedAt: new Date(),
            location: data[0].location,
            locationId: data[0].locationId,
            isAutoLayout: data[0].isAutoLayout,
          })
          .select();
        if (duplicateError) throw duplicateError;

        const { data: allComponentLayouts, error: allLayoutsError } = await supabase
          .from("ComponentLayout")
          .select("*")
          .eq("menuId", id);
        if (allLayoutsError) throw allLayoutsError;

        const layoutMapping = new Map();

        const duplicatedLayouts = await Promise.all(
          allComponentLayouts.map(async (layout) => {
            const { id: oldId, ...layoutWithoutId } = layout;
            const { data: newLayout, error: layoutError } = await supabase
              .from("ComponentLayout")
              .insert({
                ...layoutWithoutId,
                menuId: duplicateData[0].id,
                restaurantId: data[0].restaurant_id,
              })
              .select();
            if (layoutError) throw layoutError;

            layoutMapping.set(oldId, newLayout[0].id);
            return newLayout[0];
          })
        );

        const { data: pagesData, error: pagesError } = await supabase
          .from("pages")
          .select("*")
          .eq("menu_id", id);
        if (pagesError) throw pagesError;

        for (const page of pagesData) {
          const { data: newPage, error: pageError } = await supabase
            .from("pages")
            .insert({
              ...page,
              id: undefined,
              menu_id: duplicateData[0].id,
              pageUniqueId: uuidv4(),
            })
            .select();
          if (pageError) throw pageError;

          const { data: sectionsData, error: sectionsError } = await supabase
            .from("sections")
            .select("*")
            .eq("page_id", page.id);
          if (sectionsError) throw sectionsError;

          for (const section of sectionsData) {
            const newSectionId = uuidv4();

            const newDishLayout = section.dish_layout
              ? layoutMapping.get(section.dish_layout)
              : null;
            const newTitleLayout = section.title_layout
              ? layoutMapping.get(section.title_layout)
              : null;
            const newTempTitleLayout = section.temp_title_layout
              ? layoutMapping.get(section.temp_title_layout)
              : null;
            const newTempDishLayout = section.temp_dish_layout
              ? layoutMapping.get(section.temp_dish_layout)
              : null;

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

            const { data: dishesData, error: dishesError } = await supabase
              .from("menu_dishes")
              .select("*")
              .eq("section", section.id);
            if (dishesError) throw dishesError;

            // Map old dishes to new dishes, preserving the inline_text_layout
            const newDishes = dishesData.map((dish) => {
              const { id: _, ...dishWithoutId } = dish;
              const newInlineTextLayout = dish.inlineText_layout
                ? layoutMapping.get(dish.inlineText_layout)
                : null;

              return {
                ...dishWithoutId,
                section: newSection[0].id,
                frontend_id: uuidv4(),
                inlineText_layout: newInlineTextLayout,
              };
            });

            if (newDishes.length > 0) {
              const { error: dishError } = await supabase.from("menu_dishes").insert(newDishes);
              if (dishError) throw dishError;
            }
          }
        }

        const { data: imagesData, error: imagesError } = await supabase.storage
          .from("renderings")
          .list(id.toString());

        if (imagesData) {
          await Promise.all(
            imagesData.map((imageUrl) =>
              supabase.storage
                .from("renderings")
                .copy(
                  `${id.toString()}/${imageUrl.name}`,
                  `${duplicateData[0].id}/${imageUrl.name}`
                )
            )
          );
        }

        router.push("/templates");
        setNavMenu("myMenu");
        await refreshTemplate(duplicateData[0].id);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
  // ... rest of the hook is unchanged
  const globalTemplate = async (template: ITemplateDetails, id: string) => {
    try {
      if (template?.id) {
        const { error } = await supabase
          .from("templates")
          .update(template.isGlobal ? { createdBy: id, isGlobal: false } : { isGlobal: true })
          .eq("id", template?.id);
        if (error) throw error;
        // Get updated template
        router.push("/templates");
        setNavMenu(template.isGlobal ? "myMenu" : "templates");
        refreshTemplate(template?.id);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };
  const refreshTemplate = async (id: number) => {
    try {
      if (id) {
        const { error, status, data } = await supabase
          .from("templates")
          .select("*, locationInformation:locations!locationId(*)")
          .neq("id", 2044)
          .eq("id", id);
        if (error) throw error;
        if (status === 200) {
          const templateIndex = templates.findIndex((template) => template.id === id);
          if (templateIndex === -1) {
            const addNewTemplate = templates.concat(data as any);
            setTemplates(addNewTemplate);
          } else {
            const updatedTemplates = [...templates];
            updatedTemplates[templateIndex] = data[0] as ITemplateDetails;
            await setTemplates(updatedTemplates);
          }
        }
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const fetchRelatedAssetIds = async (templateId: number, table: string) => {
    const { data, error } = await supabase
      .from(table)
      .select("id, content")
      .eq("template_id", templateId);

    if (error) {
      return null;
    }

    return data;
  };
  const deleteRelatedAssets = async (assetIds: Array<DeleteAssetsIDs> | null, table: string) => {
    if (assetIds) {
      const deletePromises = assetIds.map(async (assetId) => {
        const { error } = await supabase.from(table).delete().eq("id", assetId?.id);
        if (error) {
          return error;
        }
      });

      await Promise.all(deletePromises);
    }
  };
  const deleteRelatedAssetsFiles = async (
    assetIds: Array<DeleteAssetsIDs> | null,
    table: string
  ) => {
    if (assetIds) {
      const deletePromises = assetIds.map(async (assetId) => {
        const { error } = await supabase.storage.from("templates").remove([assetId?.content]);
        if (error) {
          return error;
        }
      });

      await Promise.all(deletePromises);
    }
  };

  return { deleteTemplate, renameTemplate, globalTemplate, duplicateTemplate };
};
