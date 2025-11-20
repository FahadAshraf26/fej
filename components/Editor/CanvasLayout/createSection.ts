import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { Page } from "@Interfaces/";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { handleSectionTitle } from "./helper/handleSectionTitle";
import { handleSpacer } from "./helper/handleSpacer";
import { handleDishElements } from "./helper/handleDishElement";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { groupBy } from "lodash";
import { handleTextElement } from "./helper/handleTextElement";
import { handleImageElement } from "./helper/handleImageElement";
import { handleSectionDividerElement } from "./helper/handleSectionDividerElement";
import { debug } from "@Utils/debug";

export const createSection = (
  x: number,
  dishes: any[],
  columnWidth: any,
  currentPage: number,
  page: Page
) => {
  const startTime = performance.now();
  try {
    if (dishes.length === 0) {
      debug.performance("createSection (no dishes)", startTime);
      return { dishBlocks: [], halfIndex: 0 };
    }

    let sectioTopMargin = 0;
    const cesdkInstance = useInitializeEditor.getState().cesdkInstance.current;

    if (!cesdkInstance?.engine?.block) {
      return { dishBlocks: [], halfIndex: 0 };
    }

    const engine = cesdkInstance.engine.block;

    const fontSize = page.dishSpacingValue;
    const halfIndex = Math.ceil(dishes.length / page.columns);
    const dishBlocks: any[] = [];
    const dishesBySection = groupBy(dishes, "section");
    let totalSectionHeight = 0;

    const sectionProcessingStartTime = performance.now();
    Object.entries(dishesBySection).forEach(([sectionId, sectionDishes]) => {
      const section = useSectionsStore
        .getState()
        .oSections[page.pageId]?.find((s: any) => s.sectionId === sectionId);

      if (!section) {
        console.warn(`Section not found for sectionId: ${sectionId}`);
        return;
      }

      if (section.topMargin && sectionDishes.length > 0) {
        const title = { ...sectionDishes[0] };
        sectioTopMargin = section.topMargin;
        title.id = "abc";
        title.title = "";
        title.order_position = -1;
        title.type = "spacer";
        (title.isSpacer = true),
          (title.spacer = { height: sectioTopMargin, width: 0 }),
          (sectionDishes = [title, ...sectionDishes]);
      }

      // Process each dish in the section
      sectionDishes.forEach((dish: any, index: number) => {
        const dishProcessingStartTime = performance.now();

        const totalSectionWidth =
          (dish.columnWidth || columnWidth) * (section.columns || 1) +
          (section.columns - 1) * section.columnMargin;

        dish.order_position = index + 1;
        const layoutSettings = useDishesStore.getState().layoutSettings[dish.section] || {};
        const titleLayoutSettings =
          useSectionsStore.getState().layoutSettings[section.sectionId] || {};
        const horizontalSettings =
          useDishesStore.getState().horizontalAlignSettings[dish.section] || {};

        let newDish;

        try {
          if (dish.type === "inlineImage") {
            newDish = engine.create("graphic");
            engine.appendChild(currentPage, newDish);
          } else if (dish.type === "inlineSectionDivider") {
            newDish = engine.create("graphic");
            engine.appendChild(currentPage, newDish);
          } else {
            const layoutBlock =
              dish.type === "sectionTitle" || dish.isSpacer
                ? dish.sectionTitleLayoutBlockId?.[dish.sectionTitleLayoutBlockId.length - 1]
                : dish.type === "dish"
                ? dish.dishLayoutBlockId?.[dish.dishLayoutBlockId.length - 1]
                : dish.inlineTextLayoutBlockId?.[dish.inlineTextLayoutBlockId.length - 1];

            if (!layoutBlock) {
              console.warn(`Layout block not found for dish type: ${dish.type}`);
              return;
            }

            newDish = engine.duplicate(layoutBlock);
            engine.appendChild(currentPage, newDish);
          }
        } catch (error) {
          console.error(`Error creating dish element for type ${dish.type}:`, error);
          return;
        }

        const blockWidth = dish.columnWidth || columnWidth;
        engine.setBool(newDish, "transformLocked", false);

        let dishHeight = 0;
        let titleHeight = 0;
        let descriptionHeight = 0;
        let spacerHeight = 0;
        let dishBlockHeight = 0;
        let addonHeight = 0;
        let imageBlockHeight = 0;
        let sectionDividerHeight = 0;

        if (
          dish.type !== "inlineText" &&
          dish.type !== "inlineImage" &&
          dish.type !== "inlineSectionDivider"
        ) {
          engine.setName(newDish, "sectionDish");
        }

        try {
          if (dish.type === "sectionSpacer") {
            const { dishElementHeight, spacerHeight: totalSpacerHeight } = handleSpacer(
              engine,
              newDish,
              dish,
              blockWidth,
              x,
              dishHeight
            );
            dishHeight = dishElementHeight;
            spacerHeight = totalSpacerHeight;
          } else if (dish.type === "sectionTitle") {
            dishHeight = handleSectionTitle(
              engine,
              newDish,
              dish,
              fontSize,
              x,
              dishHeight,
              totalSectionWidth,
              section,
              titleLayoutSettings
            );
          } else if (dish.type === "spacer") {
            const { dishElementHeight, spacerHeight: totalSpacerHeight } = handleSpacer(
              engine,
              newDish,
              dish,
              blockWidth,
              x,
              dishHeight
            );
            dishHeight = dishElementHeight;
            spacerHeight = totalSpacerHeight;
          } else if (dish.type === "dish") {
            const childrenList = engine.getChildren(newDish);

            if (
              horizontalSettings.isCenter &&
              !layoutSettings.isJustifyPriceCenter &&
              !layoutSettings.isJustifyPriceTop
            ) {
              childrenList.forEach((element: any) => {
                engine.setEnum(element, "text/horizontalAlignment", "Center");
              });
            } else if (horizontalSettings.isRight) {
              childrenList.forEach((element: any) => {
                engine.setEnum(element, "text/horizontalAlignment", "Right");
              });
            } else if (horizontalSettings.isLeft) {
              childrenList.forEach((element: any) => {
                engine.setEnum(element, "text/horizontalAlignment", "Left");
              });
            }

            for (const element of childrenList) {
              const result = handleDishElements(
                engine,
                element,
                dish,
                layoutSettings,
                blockWidth,
                fontSize,
                x,
                dishHeight,
                titleHeight,
                descriptionHeight,
                childrenList,
                section,
                addonHeight
              );
              dishHeight = result.dishHeight;
              titleHeight = result.titleHeight;
              descriptionHeight = result.descriptionHeight;
            }
          } else if (dish.type === "inlineImage") {
            imageBlockHeight = handleImageElement(engine, newDish, dish, x, dishHeight);
            dishHeight = imageBlockHeight;
          } else if (dish.type === "inlineSectionDivider") {
            const sectionStartX =
              x - (dish.column - 1) * (blockWidth + (section.columnMargin || 0));
            sectionDividerHeight = handleSectionDividerElement(
              engine,
              newDish,
              dish,
              x,
              dishHeight,
              blockWidth,
              totalSectionWidth,
              sectionStartX
            );
            dishHeight = sectionDividerHeight;
          } else {
            dishHeight = handleTextElement(
              engine,
              newDish,
              dish,
              blockWidth,
              fontSize,
              x,
              dishHeight
            );
          }
        } catch (error) {
          console.error(`Error processing dish type ${dish.type}:`, error);
          return;
        }

        dishBlockHeight += dishHeight;
        const uuid = engine.getUUID(newDish);

        dishBlocks.push({
          newDish,
          uuid,
          dishUUID: dish.id,
          sectionID: dish.section,
          dndLayout: dish.dndLayout,
          column: dish.column,
          type: dish.type,
          pageColumn: page.columns,
          pageMarginTop: page.marginTop ?? 0,
          pageMarginBottom: page.marginBottom ?? 0,
          sectionColumn: dish.columns,
          title: dish.title,
          sectionTitle: dish.isSectionTitle && dish.title,
          isSectionTitle: dish.isSectionTitle,
          spacerHeight: dish.type === "spacer" ? spacerHeight : 0,
          dishBlockHeight: dishBlockHeight ?? 0,
          sectionSpacerHeight: section.topMargin ? sectioTopMargin : 0,
          borderImageUrl: section?.borderImageUrl,
          sectionMarginTop: section?.sectionMarginTop || 0,
          sectionMarginBottom: section?.sectionMarginBottom || 0,
          sectionMarginLeft: section?.sectionMarginLeft || 0,
          sectionMarginRight: section?.sectionMarginRight || 0,
          originalDishX: x,
          originalDishWidth: blockWidth,
          dishBorderImageUrl: dish?.borderImageUrl,
          dishMarginTop: dish?.dishMarginTop || 0,
          dishMarginBottom: dish?.dishMarginBottom || 0,
          dishMarginLeft: dish?.dishMarginLeft || 0,
          dishMarginRight: dish?.dishMarginRight || 0,
        });

        totalSectionHeight = Math.max(totalSectionHeight, dishBlockHeight);
        debug.performance(`dish processing for ${dish.type} ${dish.id}`, dishProcessingStartTime);
      });
    });
    debug.performance("section processing", sectionProcessingStartTime);

    debug.performance(`createSection (${dishes.length} dishes)`, startTime);
    return { dishBlocks, halfIndex };
  } catch (error) {
    console.error("Error in createSection:", error);
    debug.performance("createSection (error)", startTime);
    throw error;
  }
};
