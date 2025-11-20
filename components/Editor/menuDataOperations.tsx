import { Dish, Section } from "@Interfaces/*";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { supabase } from "@database/client.connection";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

export const updateMenuSectionData = async (menuId: any, isAutoLayout: boolean) => {
  const pages = usePageStore.getState().pages;
  const oSections = useSectionsStore.getState().oSections;
  const oDishes = useDishesStore.getState().oDishes;
  const layoutSettings = useDishesStore.getState().layoutSettings;
  const horizontalAlignSettings = useDishesStore.getState().horizontalAlignSettings;
  const pagesData = pages?.map((page) => ({
    pageUUID: page?.blockUUID,
    columns: page?.columns,
    pageId: page?.pageId,
    menu_id: menuId,
    page_index: page?.page_index,
    marginTop: page?.marginTop,
    marginBottom: page?.marginBottom,
    marginLeft: page?.marginLeft,
    marginRight: page?.marginRight,
    dishSpacingValue: page?.dishSpacingValue,
    pageUniqueId: page.pageUniqueId,
    columnMargin: page.columnMargin,
    sectionGap: page.sectionGap,
  }));

  const { data: updatedPages, error: pagesError } = await supabase
    .from("pages")
    .upsert(pagesData, { onConflict: "pageUniqueId" })
    .select();

  if (pagesError) throw pagesError;

  const sectionsData: any[] = [];
  updatedPages?.forEach((page) => {
    const pageSections = oSections[page.pageId] || [];
    pageSections.forEach((section: Section, index: number) => {
      const titleHorizontalAlignSetting = horizontalAlignSettings[section.sectionId] || {};
      const titleHorizontalAlignValue = titleHorizontalAlignSetting.isCenter
        ? "Center"
        : titleHorizontalAlignSetting.isRight
        ? "Right"
        : "Left";

      sectionsData.push({
        page_id: page.id,
        name: section?.name,
        columns: section.columns,
        position_start: section.position_start,
        position_end: section.position_end,
        order_position: index,
        title_layout: section?.temp_title_layout ?? null,
        dish_layout: section?.temp_dish_layout ?? null,
        temp_dish_layout: section?.temp_dish_layout ?? null,
        temp_title_layout: section?.temp_title_layout ?? null,
        dndLayout: { ...section?.dndLayout, i: section.sectionId },
        sectionId: section.sectionId,
        sectionUniqueId: section.sectionUniqueId,
        placeholderName: section.placeholderName,
        columnMargin: section.columnMargin,
        horizontalAlign: titleHorizontalAlignValue,
        sectionGroupBlockId: section.sectionGroupBlockId,
        sectionPageGroupId: section.sectionPageGroupId,
        topMargin: section.topMargin,
        borderImageUrl: section?.borderImageUrl ?? null,
        sectionMarginLeft: section?.sectionMarginLeft ?? null,
        sectionMarginRight: section?.sectionMarginRight ?? null,
        sectionMarginTop: section?.sectionMarginTop ?? null,
        sectionMarginBottom: section?.sectionMarginBottom ?? null,
      });
    });
  });

  const { data: updatedSections, error: sectionsError } = await supabase
    .from("sections")
    .upsert(sectionsData, { onConflict: "sectionUniqueId" })
    .select();

  if (sectionsError) throw sectionsError;

  const dishesData: any[] = [];
  updatedSections?.forEach((section) => {
    const sectionDishes = oDishes[section.sectionId] || [];
    const layoutSetting = layoutSettings[section.sectionId] || {};
    const horizontalAlignSetting = horizontalAlignSettings[section.sectionId] || {};
    const horizontalAlignValue = horizontalAlignSetting.isCenter
      ? "Center"
      : horizontalAlignSetting.isRight
      ? "Right"
      : "Left";

    sectionDishes.forEach((dish: Dish) => {
      if (!dish?.frontend_id) return;

      dishesData.push({
        dietaryIcons: dish.dietaryIcons,
        frontend_id: dish?.frontend_id,
        isSpacer: dish?.isSpacer,
        title: dish?.title,
        type: dish?.type,
        description: dish?.description,
        price: dish?.price,
        visible: dish?.visible,
        order_position: dish?.order_position,
        section: section.id,
        spacer: dish?.spacer,
        column: dish?.column,
        isDishTitleAndPrice: layoutSetting.isDishTitleAndPrice,
        isDishDescriptionAndPrice: layoutSetting.isDishDescriptionAndPrice,
        isDishTitleAndDescriptionAndPrice: layoutSetting.isDishTitleAndDescriptionAndPrice,
        isJustifyPriceCenter: layoutSetting.isJustifyPriceCenter,
        isJustifyPriceTop: layoutSetting.isJustifyPriceTop,
        horizontalAlign: horizontalAlignValue,
        addOns: dish.addOns,
        placeholderTitle: dish?.placeholderTitle,
        placeholderDescription: dish?.placeholderDescription,
        placeholderPrice: dish?.placeholderPrice,
        isEdit: dish.isEdit,
        secondPrice: dish.secondPrice,
        inlineText_layout: dish.temp_inlineText_layout ?? null,
        textAlign: dish.textAlign || "Left",
        imageUrl: dish.imageUrl,
        imageHeight: dish.imageHeight,
        imageWidth: dish.imageWidth,
        imageHeightInches: dish.imageHeightInches,
        dividerImageUrl: dish.dividerImageUrl,
        dividerImageHeight: dish.dividerImageHeight,
        dividerImageWidth: dish.dividerImageWidth,
        dividerImageHeightInches: dish.dividerImageHeightInches,
        borderImageUrl: dish.borderImageUrl,
        dishMarginLeft: dish.dishMarginLeft,
        dishMarginRight: dish.dishMarginRight,
        dishMarginTop: dish.dishMarginTop,
        dishMarginBottom: dish.dishMarginBottom,
      });
    });
  });

  const { data: updatedDishes, error: dishesError } = await supabase
    .from("menu_dishes")
    .upsert(dishesData, { onConflict: "frontend_id" })
    .select();

  if (dishesError) throw dishesError;
  if (!isAutoLayout) {
    useInitializeEditor.getState().setIsNonAutoSaving(false);
  }
  return updatedPages?.map((page) => ({
    ...page,
    sections: updatedSections
      ?.filter((section) => section.page_id === page.id)
      ?.map((section) => ({
        ...section,
        menu_dishes: updatedDishes?.filter((dish) => dish.section === section.id),
      })),
  }));
};
