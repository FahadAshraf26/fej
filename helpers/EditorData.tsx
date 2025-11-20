import { GetServerSidePropsContext } from "next";
import { supabase } from "@database/client.connection";

export async function getEditorData(context: GetServerSidePropsContext) {
  try {
    const { data: templateData, error: templateError } = await supabase
      .from("templates")
      .select(
        `
        id, createdBy, name, description, content, isGlobal, menuSize,
        restaurant_id, location, printPreview, isAutoLayout, isPSDImport, templates_versions(*),
        pages (
          *,
          sections (
            *,
            menu_dishes (*)
          )
        )
      `
      )
      .eq("id", context.params?.id)
      .order("page_index", { ascending: true, referencedTable: "pages" })
      .order("order_position", { ascending: true, referencedTable: "pages.sections" })
      .order("order_position", { ascending: true, referencedTable: "pages.sections.menu_dishes" });

    if (templateError && context.params?.id !== undefined) {
      throw templateError;
    }

    if (!templateData || templateData.length === 0) {
      return { props: { data: null } };
    }

    const sections = templateData[0].pages?.flatMap((page) => page.sections) || [];
    const allDishes = sections.flatMap((section) => section.menu_dishes) || [];

    // 1. Collect Layout IDs from Sections and Dishes
    const titleLayoutIds = sections.map((section) => section.title_layout).filter(Boolean);
    const dishLayoutIds = sections.map((section) => section.dish_layout).filter(Boolean);
    const inlineTextLayoutIds = allDishes.map((dish) => dish.inlineText_layout).filter(Boolean);

    // 2. Fetch all layouts in parallel
    const [titleLayoutsRes, dishLayoutsRes, inlineTextLayoutsRes] = await Promise.all([
      supabase.from("ComponentLayout").select("*").in("id", titleLayoutIds),
      supabase.from("ComponentLayout").select("*").in("id", dishLayoutIds),
      supabase.from("ComponentLayout").select("*").in("id", inlineTextLayoutIds),
    ]);

    if (titleLayoutsRes.error) throw titleLayoutsRes.error;
    if (dishLayoutsRes.error) throw dishLayoutsRes.error;
    if (inlineTextLayoutsRes.error) throw inlineTextLayoutsRes.error;

    const titleLayouts = titleLayoutsRes.data;
    const dishLayouts = dishLayoutsRes.data;
    const inlineTextLayouts = inlineTextLayoutsRes.data;

    const updatedPages = templateData[0].pages.map((page) => ({
      ...page,
      sections: page.sections.map((section: any) => ({
        ...section,
        sectionLayout: titleLayouts?.find((layout) => layout.id === section.title_layout) || null,
        dishLayout: dishLayouts?.find((layout) => layout.id === section.dish_layout) || null,
        menu_dishes: section.menu_dishes.map((dish: any) => ({
          ...dish,
          inlineTextLayout:
            inlineTextLayouts?.find((layout) => layout.id === dish.inlineText_layout) || null,
        })),
      })),
    }));

    return {
      props: {
        data: { ...templateData[0], pages: updatedPages },
      },
    };
  } catch (error) {
    console.error("Error in getEditorData:", error);
    throw error;
  }
}

export async function getTemplateVersionData(templateId: number, version: any) {
  try {
    const { data: templateData, error: templateError } = await supabase
      .from("templates_versions")
      .select(`*`)
      .eq("templateId", templateId)
      .eq("version", version);
    if (templateError && templateId !== undefined) {
      throw templateError;
    }
    return {
      props: {
        data: templateData?.[0] ? { ...templateData[0] } : null,
      },
    };
  } catch (error) {
    throw error;
  }
}

export const getPagesByMenuId = async (menuId: number) => {
  const { data, error } = await supabase
    .from("pages")
    .select(`*`)
    .eq("menu_id", menuId)
    .order("page_index", { ascending: true });

  return { pages: data };
};

export const getSectionsWithPageId = async (pageId: number) => {
  const { data, error } = await supabase
    .from("sections")
    .select(`*, TitleLayout(*),DishLayout(*)`)
    .eq("page_id", pageId)
    .order("order_position", { ascending: true });

  return { sections: data };
};

export const getSectionsWithSectionId = async (sectionId: string) => {
  const { data, error } = await supabase
    .from("sections")
    .select(`*, TitleLayout(*),DishLayout(*)`)
    .eq("sectionId", sectionId)
    .order("order_position", { ascending: true });

  return { sections: data };
};

export const getDishesBySectionId = async (sectionId: string) => {
  const { data, error } = await supabase
    .from("menu_dishes")
    .select(`*`)
    .eq("section", sectionId)
    .order("order_position", { ascending: true });

  return { dishes: data };
};

export const deleteSectionById = async (sectionId: string) => {
  const { data, error } = await supabase.from("sections").select("*").eq("sectionId", sectionId);
  if (data && data.length > 0) {
    const { error: deleteError } = await supabase
      .from("sections")
      .delete()
      .eq("sectionId", sectionId);
    return !deleteError;
  } else {
    return false;
  }
};

export const deleteDishById = async (dishId: string) => {
  const { data, error } = await supabase.from("menu_dishes").select("*").eq("frontend_id", dishId);

  if (data && data.length > 0) {
    const { error: deleteError } = await supabase
      .from("menu_dishes")
      .delete()
      .eq("frontend_id", dishId);

    return !deleteError;
  }

  return false;
};

export const deletePageById = async (pageId: number, menuId: number) => {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("pageId", pageId)
    .eq("menu_id", menuId)
    .single();
  if (data) {
    await supabase.from("pages").delete().eq("pageId", pageId).eq("menu_id", menuId);
    return true;
  } else {
    return false;
  }
};

export const removeAllCookies = () => {
  document.cookie.split(";").forEach(function (cookie) {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  });
};
