import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { placeDishesInCanvas } from "@Components/Editor/CanvasLayout/canvasOperations";
import { createSection } from "@Components/Editor/CanvasLayout/createSection";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { debounce } from "lodash";
import { toast } from "react-toastify";
import type { Page, Section, Dish as SidebarDish } from "@Interfaces/*";
import type { Dish as CanvasDish } from "./helper/interface";
import { canvasLoader } from "./canvasLoader";
import { verifyPage } from "../Utils";
import { debug } from "@Utils/debug";
import { handleSectionBorderElement } from "./helper/handleSectionBorderElement";
import { handleDishBorderElement } from "./helper/handleDishBorderElement";

const DEBOUNCE_INTERVAL = 10;

export const destroyBlocks = (pageId: Page["pageId"], instance: any): void => {
  const startTime = performance.now();
  try {
    if (!instance?.engine?.block) {
      debug.performance("destroyBlocks (no engine)", startTime);
      return;
    }

    const engine = instance.engine;
    const blockManager = engine.block;

    const childBlocks = blockManager.getChildren(pageId);
    if (!childBlocks?.length) {
      debug.performance("destroyBlocks (no children)", startTime);
      return;
    }

    let destroyedCount = 0;
    for (const childBlock of childBlocks) {
      try {
        if (!blockManager.isValid(childBlock)) continue;

        const childKind = blockManager.getKind(childBlock);
        const childName = blockManager.getName(childBlock);

        // Skip image and shape blocks
        if (childKind === "shape") continue;
        if (!childName.includes("inlineText") && childKind === "text") continue;
        if (!childName.includes("inlineImage") && childKind === "image") continue;

        if (
          childName === "section" ||
          childName === "sectionDish" ||
          childName === "sectionBorder" ||
          childName === "dishBorder" ||
          childName.includes("inlineText") ||
          childName.includes("inlineImage") ||
          childName.includes("sectionDivider")
        ) {
          blockManager.destroy(childBlock);
          destroyedCount++;
        }
      } catch (blockError) {
        console.warn(`Error destroying individual block ${childBlock}:`, blockError);
      }
    }

    debug.performance(`destroyBlocks (destroyed ${destroyedCount} blocks)`, startTime);
  } catch (error) {
    debug.performance("destroyBlocks (error)", startTime);
    console.error("Error destroying blocks:", error);
    throw new Error("Failed to destroy blocks");
  }
};

const convertToCanvasDish = (dish: SidebarDish, columns: number): CanvasDish => {
  const startTime = performance.now();
  try {
    const { inlineTextLayoutBlockId: defaultInlineTextId } = useInitializeEditor.getState();

    const result: CanvasDish = {
      id: dish.id?.toString() ?? "",
      columns,
      type: dish.type ?? "",
      section: dish.section ?? "",
      title: dish.title ?? undefined,
      price: dish.price ?? undefined,
      description: dish.description ?? undefined,
      dietaryIcons: dish.dietaryIcons?.join(" ") ?? [],
      addOns: dish.addOns ?? null,
      spacer: dish.spacer ?? undefined,
      isSpacer: dish.isSpacer ?? false,
      isEdit: dish.isEdit ?? false,
      column: dish.column,
      dndLayout: dish.dndLayout ?? { w: 1 },
      dishLayout: dish.dishLayout,
      titleLayout: dish.titleLayout,
      sectionTitleLayoutBlockId: dish.sectionTitleLayoutBlockId,
      dishLayoutBlockId: dish.dishLayoutBlockId,
      inlineTextLayoutBlockId: dish.inlineTextLayoutBlockId ?? defaultInlineTextId,
      inlineText_layout: dish.inlineText_layout,
      isSectionTitle: dish.isSectionTitle,
      secondPrice: dish.secondPrice ?? undefined,
      textAlign: dish.textAlign ?? "Left",
      imageUrl: dish.imageUrl ?? undefined,
      imageHeight: dish.imageHeight ?? undefined,
      imageWidth: dish.imageWidth ?? undefined,
      imageHeightInches: dish.imageHeightInches ?? undefined,
      borderImageUrl: dish.borderImageUrl ?? undefined,
      dishMarginTop: dish.dishMarginTop ?? 0,
      dishMarginBottom: dish.dishMarginBottom ?? 0,
      dishMarginLeft: dish.dishMarginLeft ?? 0,
      dishMarginRight: dish.dishMarginRight ?? 0,
      dividerImageUrl: dish.dividerImageUrl ?? undefined,
      dividerImageWidth: dish.dividerImageWidth ?? undefined,
      dividerImageHeight: dish.dividerImageHeight ?? undefined,
      dividerImageHeightInches: dish.dividerImageHeightInches ?? undefined,
    };
    debug.performance("convertToCanvasDish", startTime);
    return result;
  } catch (error) {
    debug.performance("convertToCanvasDish (error)", startTime);
    throw error;
  }
};

const convertDishArray = (dishes: SidebarDish[], columns: number): CanvasDish[] => {
  const startTime = performance.now();
  try {
    const result = dishes.map((dish) => convertToCanvasDish(dish, columns));
    debug.performance(`convertDishArray (${dishes.length} dishes)`, startTime);
    return result;
  } catch (error) {
    console.error("Error converting dish array:", error);
    debug.performance("convertDishArray (error)", startTime);
    return [];
  }
};

const sortSections = (sections: Section[]): Section[] => {
  const startTime = performance.now();
  try {
    const result = sections.sort((a, b) => {
      if (a.dndLayout.y !== b.dndLayout.y) {
        return a.dndLayout.y - b.dndLayout.y;
      }
      return b.dndLayout.w - a.dndLayout.w;
    });
    debug.performance(`sortSections (${sections.length} sections)`, startTime);
    return result;
  } catch (error) {
    console.error("Error sorting sections:", error);
    debug.performance("sortSections (error)", startTime);
    return sections;
  }
};

export const handleSections = debounce((callback) => {
  const overallStartTime = performance.now();
  try {
    const {
      changedPageIds: pageIds,
      calculatePageDimensions,
      getPageById,
      resetChangedPageIds,
    } = usePageStore.getState();
    const { cesdkInstance, setIsSaving, setCanvasLoader } = useInitializeEditor.getState();
    const instance = cesdkInstance?.current;
    const { getAllDishesWithLayout } = useDishesStore.getState();
    const { getSectionsForPageId, updateSectionGroupId } = useSectionsStore.getState();

    if (!instance) {
      console.error("CESDK instance not available");
      if (callback) callback();
      return;
    }

    if (pageIds.size === 0) {
      debug.performance("handleSections (no changed pages)", overallStartTime);
      return;
    }

    pageIds.forEach((pageId) => {
      const pageStartTime = performance.now();
      try {
        const page = getPageById(pageId);
        const sections = getSectionsForPageId(pageId);

        if (!page) {
          console.warn(`Page not found: ${pageId}`);
          setIsSaving(true);
          callback?.();
          setCanvasLoader(false);
          canvasLoader();
          debug.performance(`handleSections (Page ${pageId} not found)`, pageStartTime);
          return;
        }

        const verifyStartTime = performance.now();
        const isValidPage = verifyPage(page.blockUUID, instance);
        debug.performance("verifyPage", verifyStartTime);

        if (!isValidPage) {
          const newUUID = instance.engine.block.getUUID(pageId);
          page.blockUUID = newUUID;
          page.pageUUID = newUUID;
        }

        const dimensionsStartTime = performance.now();
        const { pageColumnWidth, pageHeightWithSpacing } = calculatePageDimensions(page);
        debug.performance("calculatePageDimensions", dimensionsStartTime);

        const destroyStartTime = performance.now();
        destroyBlocks(pageId, instance);
        debug.performance("destroyBlocks call", destroyStartTime);

        const getDishesStartTime = performance.now();
        const initialDishes = getAllDishesWithLayout(pageId, sections);
        debug.performance(
          `getAllDishesWithLayout (${initialDishes.length} dishes)`,
          getDishesStartTime
        );

        let rowTransitions = 0;
        const sortStartTime = performance.now();
        const sortedSections = sortSections(sections);
        if (sortedSections.length > 1) {
          rowTransitions = sortedSections[sortedSections.length - 1]?.dndLayout?.y / 5;
        }
        debug.performance(`sortSections (${sections.length} sections)`, sortStartTime);

        const sectionColumnWidthMap = new Map<string, number>();
        const columnWidthStartTime = performance.now();
        sortedSections.forEach((section) => {
          const sectionMarginLeft = section?.sectionMarginLeft || 0;
          const sectionMarginRight = section?.sectionMarginRight || 0;
          const hasSectionBorder = section?.borderImageUrl;
          const horizontalPadding = hasSectionBorder
            ? Math.max(0, sectionMarginLeft) + Math.max(0, sectionMarginRight)
            : 0;
          const sectionWidth =
            pageColumnWidth * section.dndLayout.w +
            (section.dndLayout.w - 1) * page.columnMargin -
            horizontalPadding;

          const sectionColumnGap = (section.columns - 1) * section.columnMargin;
          const columnWidth = (sectionWidth - sectionColumnGap) / section.columns;
          sectionColumnWidthMap.set(section.sectionId, columnWidth);
        });
        debug.performance("precompute column widths", columnWidthStartTime);

        const dishesMapStartTime = performance.now();
        const dishesWithColumnWidth = initialDishes.map((dish: any) => {
          const section = sortedSections.find((s) => s.sectionId === dish.section);
          if (!section) return dish;

          const columnWidth = sectionColumnWidthMap.get(section.sectionId);
          return {
            ...dish,
            columnWidth,
          };
        });
        debug.performance(
          `map dishes with column width (${initialDishes.length} dishes)`,
          dishesMapStartTime
        );

        const initialSectionStartTime = performance.now();
        const initialResponse: any = createSection(0, dishesWithColumnWidth, 0, pageId, page);
        debug.performance("initial createSection", initialSectionStartTime);

        const calcHeightsStartTime = performance.now();
        let { maxCombinationInfo } = usePageStore
          .getState()
          .calculateHeights(initialResponse.dishBlocks, pageHeightWithSpacing);
        debug.performance("calculateHeights", calcHeightsStartTime);

        destroyBlocks(pageId, instance);

        const dishGapStartTime = performance.now();
        const sectionGapMultiplier =
          page.sectionGap !== undefined ? Math.max(1, page.sectionGap) : 1;
        let dishGap = getMinDishGap(
          pageHeightWithSpacing,
          maxCombinationInfo,
          rowTransitions,
          sectionGapMultiplier
        );
        debug.performance("getMinDishGap", dishGapStartTime);

        const totalContentHeight = maxCombinationInfo.height;
        const totalGapSpace = (maxCombinationInfo.dishCount - 1) * dishGap;
        const estimatedTotalHeight = totalContentHeight + totalGapSpace;
        const isOverflowing = estimatedTotalHeight > pageHeightWithSpacing;

        debug.log("Overflow Analysis:", {
          totalContentHeight,
          totalGapSpace,
          estimatedTotalHeight,
          pageHeightWithSpacing,
          isOverflowing,
          dishGap,
          note: "Section margins now included in totalContentHeight",
        });

        let sectionTitleHeights = {};
        const trackPageColumns = new Array(page.columns).fill(page.marginTop);

        // Get row positions for row-based gap application
        const rowPositions = sortedSections[sortedSections.length - 1]?.dndLayout?.y / 5;
        let currentRowIdx = 0;
        console.log("dishGap (margins included in content height):", dishGap, {
          pageHeight: pageHeightWithSpacing,
          contentHeight: maxCombinationInfo.height,
          note: "Margins now included in section heights",
        });

        if ((dishGap < 0.15 || isOverflowing) && sections.length) {
          toast.warn(
            `The content on this page is overflowing, please adjust your design so that the content will fit.`
          );
          dishGap = Math.max(dishGap, 0.15);
        }
        const sectionToGroup: Record<string, any[]> = {};

        const sectionsProcessingStartTime = performance.now();
        sortedSections.forEach((section, sectionIndex) => {
          const sectionStartTime = performance.now();

          const dishesByColumnsStartTime = performance.now();
          const dishesByColumns = useSectionsStore.getState().getDishesByColumns(section.sectionId);
          debug.performance(
            `getDishesByColumns for section ${section.sectionId}`,
            dishesByColumnsStartTime
          );

          // Find the row index for this section
          const rowIndex = rowPositions;

          // If we've moved to a new row, add the section gap
          if (rowIndex > currentRowIdx) {
            currentRowIdx = rowIndex;

            // Add extra spacing between rows
            if (page.sectionGap !== undefined && page.sectionGap > 1) {
              // Apply the multiplier to all columns in this row's starting position
              for (let col = 0; col < page.columns; col++) {
                trackPageColumns[col] += (page.sectionGap - 1) * dishGap;
              }
            }
          }

          const yPosArray = Array(section.dndLayout.w)
            .fill(0)
            .map((_, i) => trackPageColumns[section.dndLayout.x + i] || page.marginTop);
          let sectionStartY = Math.max(...yPosArray);

          const hasSectionBorder = Boolean(section?.borderImageUrl);
          const sectionMarginLeft = section?.sectionMarginLeft || 0;
          const sectionMarginRight = section?.sectionMarginRight || 0;
          const sectionMarginTop = section?.sectionMarginTop || 0;
          const sectionMarginBottom = section?.sectionMarginBottom || 0;

          const fullSectionWidth =
            pageColumnWidth * section.dndLayout.w + (section.dndLayout.w - 1) * page.columnMargin;

          const basePageX =
            section.dndLayout.x * pageColumnWidth + section.dndLayout.x * page.columnMargin;

          const contentAreaX =
            basePageX + page.marginLeft + (hasSectionBorder ? Math.max(0, sectionMarginLeft) : 0);

          for (let i = 0; i < section.columns; i++) {
            const columnStartTime = performance.now();
            const sectionColumnMargin = i > 0 ? section.columnMargin : 0;
            const columnWidth = sectionColumnWidthMap.get(section.sectionId);

            const xPos = contentAreaX + i * ((columnWidth ?? 0) + sectionColumnMargin);

            const dishesInColumn = dishesByColumns[i] || [];

            const convertStartTime = performance.now();
            const convertedDishesInColumn = convertDishArray(dishesInColumn, section.columns);
            debug.performance(`convertDishArray for column ${i}`, convertStartTime);

            const createSectionStartTime = performance.now();
            const response: any = createSection(
              xPos,
              convertedDishesInColumn,
              columnWidth,
              pageId,
              page
            );
            debug.performance(`createSection for column ${i}`, createSectionStartTime);

            if (!response.dishBlocks?.length) {
              trackPageColumns[i + section.dndLayout.x] =
                trackPageColumns[i - 1 + section.dndLayout.x] || sectionStartY;
              debug.performance(`column ${i} processing (no dishes)`, columnStartTime);
              continue;
            }

            const sectionGroupStartTime = performance.now();
            sectionToGroup[section.sectionId]
              ? sectionToGroup[section.sectionId].push(response.dishBlocks)
              : (sectionToGroup[section.sectionId] = [response.dishBlocks]);
            debug.performance("update sectionToGroup", sectionGroupStartTime);

            const placeDishesStartTime = performance.now();
            const contentStartY = hasSectionBorder
              ? sectionStartY + Math.max(0, sectionMarginTop)
              : sectionStartY;

            const dishBlocksWithPositiveMargins = response.dishBlocks.map((dishBlock: any) => ({
              ...dishBlock,
              dishMarginTop: Math.max(0, dishBlock.dishMarginTop || 0),
              dishMarginBottom: Math.max(0, dishBlock.dishMarginBottom || 0),
            }));

            let { currentY, sectionTitleHeights: sectionTitlesHeight } = placeDishesInCanvas(
              contentStartY,
              dishBlocksWithPositiveMargins,
              dishGap,
              i,
              sectionTitleHeights
            );
            debug.performance(`placeDishesInCanvas for column ${i}`, placeDishesStartTime);

            Object.assign(sectionTitleHeights, sectionTitlesHeight);

            const effectiveBottomY = hasSectionBorder
              ? currentY + Math.max(0, sectionMarginBottom)
              : currentY;

            for (let col = 0; col < section.dndLayout.w; col++) {
              trackPageColumns[section.dndLayout.x + col] = Math.max(
                effectiveBottomY,
                trackPageColumns[section.dndLayout.x + col]
              );
            }

            debug.performance(`column ${i} total processing`, columnStartTime);
          }

          // Handle section borders
          if (section?.borderImageUrl) {
            try {
              const borderStartTime = performance.now();
              const borderX = basePageX + page.marginLeft + Math.min(0, sectionMarginLeft);
              const borderWidth =
                fullSectionWidth +
                Math.abs(Math.min(0, sectionMarginLeft)) +
                Math.abs(Math.min(0, sectionMarginRight));

              const sectionDishBlocks = sectionToGroup[section.sectionId] || [];
              let maxContentY = sectionStartY;

              sectionDishBlocks.forEach((columnBlocks: any[]) => {
                columnBlocks.forEach((dishBlock: any) => {
                  if (dishBlock && dishBlock.newDish) {
                    try {
                      const blockY = instance.engine.block.getPositionY(dishBlock.newDish);
                      const blockHeight = instance.engine.block.getGlobalBoundingBoxHeight(
                        dishBlock.newDish
                      );
                      const blockBottom = blockY + blockHeight;
                      maxContentY = Math.max(maxContentY, blockBottom);
                    } catch (error) {
                      console.warn("Could not get block dimensions, using fallback");
                    }
                  }
                });
              });

              if (maxContentY === sectionStartY && sectionDishBlocks.length === 0) {
                maxContentY = Math.max(
                  ...Array(section.dndLayout.w)
                    .fill(0)
                    .map((_, i) => trackPageColumns[section.dndLayout.x + i] || page.marginTop)
                );
              }

              const borderStartY = sectionStartY + Math.min(0, sectionMarginTop);
              const borderEndY =
                maxContentY +
                Math.max(0, sectionMarginBottom) +
                Math.abs(Math.min(0, sectionMarginBottom));
              const borderHeight = Math.max(0.1, borderEndY - borderStartY);

              const borderElement = instance.engine.block.create("graphic");
              instance.engine.block.appendChild(pageId, borderElement);

              handleSectionBorderElement(
                instance.engine.block,
                borderElement,
                section,
                borderX,
                borderStartY,
                borderWidth,
                borderHeight
              );
              debug.performance(`section border for ${section.sectionId}`, borderStartTime);
            } catch (error) {
              console.error(`Error creating section border for ${section.sectionId}:`, error);
            }
          }

          // Handle dish borders - similar to section borders but for individual dishes
          const sectionDishBlocks = sectionToGroup[section.sectionId] || [];
          sectionDishBlocks.forEach((columnBlocks: any[]) => {
            columnBlocks.forEach((dishBlock: any) => {
              if (
                dishBlock &&
                dishBlock.newDish &&
                dishBlock.dishBorderImageUrl &&
                dishBlock.type === "dish"
              ) {
                try {
                  const borderStartTime = performance.now();

                  const dishX = instance.engine.block.getPositionX(dishBlock.newDish);
                  const dishY = instance.engine.block.getPositionY(dishBlock.newDish);
                  const dishWidth = instance.engine.block.getWidth(dishBlock.newDish);
                  const actualRenderedHeight = instance.engine.block.getGlobalBoundingBoxHeight(
                    dishBlock.newDish
                  );

                  const dishMarginLeft = dishBlock.dishMarginLeft || 0;
                  const dishMarginRight = dishBlock.dishMarginRight || 0;
                  const dishMarginTop = dishBlock.dishMarginTop || 0;
                  const dishMarginBottom = dishBlock.dishMarginBottom || 0;

                  const borderX = dishX - Math.max(0, dishMarginLeft) + Math.min(0, dishMarginLeft);

                  const borderWidth =
                    dishWidth +
                    Math.max(0, dishMarginLeft) +
                    Math.abs(Math.min(0, dishMarginLeft)) +
                    Math.max(0, dishMarginRight) +
                    Math.abs(Math.min(0, dishMarginRight));

                  const borderStartY =
                    dishY - Math.max(0, dishMarginTop) + Math.min(0, dishMarginTop);

                  const borderHeight =
                    actualRenderedHeight +
                    Math.max(0, dishMarginTop) +
                    Math.abs(Math.min(0, dishMarginTop)) +
                    Math.max(0, dishMarginBottom) +
                    Math.abs(Math.min(0, dishMarginBottom));

                  const dishBorderElement = instance.engine.block.create("graphic");
                  instance.engine.block.appendChild(pageId, dishBorderElement);

                  handleDishBorderElement(
                    instance.engine.block,
                    dishBorderElement,
                    dishBlock,
                    borderX,
                    borderStartY,
                    borderWidth,
                    borderHeight
                  );

                  debug.performance(`dish border for dish ${dishBlock.dishUUID}`, borderStartTime);
                } catch (error) {
                  console.error(
                    `Error creating dish border for dish ${dishBlock.dishUUID}:`,
                    error
                  );
                }
              }
            });
          });

          debug.performance(`section ${section.sectionId} total processing`, sectionStartTime);
        });
        debug.performance(
          `All sections processing (${sortedSections.length} sections)`,
          sectionsProcessingStartTime
        );

        const groupingStartTime = performance.now();
        Object.entries(sectionToGroup).forEach(([sectionId, dishBlocks]) => {
          try {
            const sectionGroupStartTime = performance.now();
            const blockIds = dishBlocks.flatMap((block) => block.map((item: any) => item.newDish));
            const groupStartTime = performance.now();
            const groupedSections = instance.engine.block.group(blockIds);
            debug.performance(`engine.block.group for section ${sectionId}`, groupStartTime);

            const updateStartTime = performance.now();
            updateSectionGroupId(page.pageId, sectionId, groupedSections);
            debug.performance("updateSectionGroupId", updateStartTime);

            const metadataStartTime = performance.now();
            instance.engine.block.setMetadata(groupedSections, "sectionId", sectionId);
            instance.engine.block.setMetadata(groupedSections, "pageId", page.pageId.toString());
            instance.engine.block.setName(groupedSections, `section`);
            instance.engine.block.setHeightMode(groupedSections, "Auto");
            instance.engine.block.setBool(groupedSections, "transformLocked", true);
            debug.performance("set block metadata and properties", metadataStartTime);

            debug.performance(`group section ${sectionId} total processing`, sectionGroupStartTime);
          } catch (error) {
            console.error(`Error grouping section ${sectionId}:`, error);
          }
        });
        debug.performance("Group all sections", groupingStartTime);

        if (callback) {
          setCanvasLoader(false);
          canvasLoader();
          setIsSaving(true);
          callback();
        }

        debug.performance(`Total page ${pageId} processing`, pageStartTime);
      } catch (pageError) {
        console.error(`Error processing page ${pageId}:`, pageError);
        debug.performance(`page ${pageId} processing (error)`, pageStartTime);
      }
    });

    resetChangedPageIds();
    usePageStore.getState().setNaci(false);
    debug.performance("handleSections total", overallStartTime);
  } catch (error) {
    console.error("Error in handleSections:", error);
    debug.performance("handleSections (error)", overallStartTime);
    if (callback) callback();
  }
}, DEBOUNCE_INTERVAL);

/**
 * SPACING CALCULATION SYSTEM
 *
 * PURPOSE: Calculate the gap between dishes needed to fit content within page constraints
 * WHY: We need to distribute available space evenly between content elements
 */

/**
 * Calculate minimum gap between dishes to fit content on page
 *
 * PURPOSE: Determine spacing needed to make the selected combination fit within page height
 * WHY: After selecting optimal content, we need appropriate spacing for readability
 * ALGORITHM: (Available Space) / (Number of Gaps) = Gap Size
 *
 * @param {number} pageHeightWithSpacing - Total available page height
 * @param {Object} maxCombinationInfo - Selected combination metrics
 * @param {number} rowTransitions - Number of row transitions in layout
 * @param {number} sectionGapMultiplier - Additional spacing between section rows
 * @returns {number} Calculated gap size between dishes
 */
const getMinDishGap = (
  pageHeightWithSpacing: number,
  maxCombinationInfo: any,
  rowTransitions: number,
  sectionGapMultiplier = 1
): number => {
  const startTime = performance.now();
  let minDishGap = Infinity;

  debug.group("getMinDishGap Debug");
  debug.log("Input Parameters:", {
    pageHeightWithSpacing,
    maxCombinationInfo,
    rowTransitions,
    sectionGapMultiplier,
  });

  // Only calculate if we have valid content
  if (maxCombinationInfo && maxCombinationInfo.height > 0 && maxCombinationInfo.dishCount > 1) {
    /**
     * SPACE CALCULATION
     *
     * PURPOSE: Determine how much space is available for gaps
     * COMPONENTS:
     * - additionalSpaces: Extra gaps needed between section rows
     * - totalSpaces: All gap locations (between dishes + between sections)
     * - availableSpace: Page height minus content height
     */

    // Calculate extra spaces needed for section gaps between rows
    // WHY: Section transitions might need larger gaps than dish transitions
    const additionalSpaces = rowTransitions * Math.max(0, sectionGapMultiplier - 1);

    // Total gap locations = gaps between dishes + additional section gaps
    const totalSpaces = maxCombinationInfo.dishCount - 1 + additionalSpaces;

    // Space available for distribution = total page - content height
    const availableSpace = pageHeightWithSpacing - maxCombinationInfo.height;

    debug.log("Intermediate Calculations:", {
      additionalSpaces,
      totalSpaces,
      availableSpace,
      contentHeight: maxCombinationInfo.height,
      dishCount: maxCombinationInfo.dishCount,
      isValid: maxCombinationInfo.isValid,
    });

    /**
     * GAP SIZE CALCULATION
     *
     * PURPOSE: Distribute available space evenly across all gap locations
     * FORMULA: Gap Size = Available Space / Number of Gaps
     * RESULT: Uniform spacing that fills the page optimally
     */
    if (totalSpaces > 0) {
      minDishGap = availableSpace / totalSpaces;

      /**
       * OVERFLOW HANDLING
       *
       * PURPOSE: Handle cases where content doesn't fit within page constraints
       * WHY: Height priority might select combinations that overflow the page
       * STRATEGY: Use minimum readable gap size to maintain usability
       */
      if (maxCombinationInfo.willOverflow === true) {
        minDishGap = Math.max(minDishGap, 0.1); // Minimum readable gap
        debug.log("Overflow detected, using minimum gap:", minDishGap);
      }

      debug.log("Final Calculation:", {
        minDishGap,
        calculation: `${availableSpace} / ${totalSpaces} = ${minDishGap}`,
        willOverflow: minDishGap < 0.15, // Flag potential readability issues
      });
    }
  }

  debug.groupEnd();
  debug.performance("getMinDishGap", startTime);
  return minDishGap === Infinity ? 0.15 : minDishGap; // Return sensible default
};
