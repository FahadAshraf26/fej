import { create } from "zustand";
import { Page } from "@Interfaces/";
import { useInitializeEditor } from "../InitializeEditor/InitializeEditor.store";
import { useSectionsStore } from "./Sections.store";
import { deletePageById } from "@Helpers/EditorData";
import { debug } from "@Utils/debug";

type PageStore = {
  pages: Page[];
  activePageId: number;
  activePageUUID: string;
  isTreeView: boolean;
  dishSpace: number;
  menuName: string;
  menuId: number;
  pageChangeId: number;
  pageWidth: number;
  pageHeight: number;
  moreOptions: { [pageId: number]: { checked: boolean } };
  changedPageIds: Set<number>;
  isAutoLayoutComponent: boolean;
  naci: boolean; //Non AutoLayout Component Interacted
  setNaci: (arg: boolean) => void;
  setMoreOptions: (pageId: number, checked: boolean) => void;
  incrementPageChangeId: () => void;
  setPages: (pages: Page[]) => void;
  addPage: (page: Page) => void;
  updatePage: (updatedPage: Page) => void;
  deletePage: (pageId: number, menu_id: number) => void;
  updatePageDishSpacing: (spacing: number) => void;
  setActivePageId: (pageId: number) => void;
  setActivePageUUID: (pageUUID: string) => void;
  setIsTreeView: () => void;
  updatePageColumnCount: (columns: number) => void;
  getPageColumnCount: () => number;
  getSelectedPage: () => Page;
  hasPages: () => boolean;
  deletedPageIds: number[];
  setMenuName: (name: string) => void;
  setMenuId: (id: number) => void;
  resetPages: () => void;
  updateChangedPageIds: (pageId: number) => void;
  resetChangedPageIds: () => void;
  setAutoLayoutComponent: (autoComponent: boolean) => void;
  reorderPages: (pages: Page[]) => void;
  calculatePageDimensions: (page: Page) => {
    pageColumnWidth: number;
    pageHeightWithSpacing: number;
  };
  calculateHeights: (
    dishBlocks: any[],
    pageHeightWithSpacing: number,
    minDishGap?: number
  ) => {
    maxCombinationInfo: {
      height: number;
      dishCount: number;
    };
  };
  calculateSectionHeight: (
    dishes: any,
    oneColumn: boolean,
    titleHeight: any,
    isSectionTitle: boolean,
    sectionSpacerHeight: number
  ) => {
    sectionHeight: number;
    maxDishes: number;
  };
  getPageById: (pageId: number) => Page | null;
  updatePageOrientation: (orientation: "portrait" | "landscape") => void;
};

export const usePageStore = create<PageStore>((set, get) => ({
  pages: [],
  isTreeView: false,
  activePageId: 3,
  activePageUUID: "",
  dishSpace: 10,
  menuName: "Untitled Menu",
  menuId: 1,
  deletedPageIds: [],
  pageChangeId: 0,
  pageWidth: 0,
  pageHeight: 0,
  moreOptions: {},
  isAutoLayoutComponent: false,
  naci: false,
  changedPageIds: new Set<number>(),
  setMoreOptions: (pageId, checked) => {
    set((state) => ({
      moreOptions: {
        ...state.moreOptions,
        [pageId]: {
          checked,
        },
      },
    }));
  },
  setAutoLayoutComponent: (autoComponent) => {
    set(() => ({ isAutoLayoutComponent: autoComponent }));
  },
  updateChangedPageIds: (pageId: number) =>
    set((state) => ({
      changedPageIds: new Set([...Array.from(state.changedPageIds), pageId]),
    })),
  incrementPageChangeId: () => set((state) => ({ pageChangeId: state.pageChangeId + 1 })),
  setPages: (pages) => set({ pages }),
  addPage: (page) =>
    set((state) => {
      const existingPage = state.pages.find((p) => p.pageId === page.pageId);
      if (!existingPage) {
        return { pages: [...state.pages, page] };
      }
      state.changedPageIds.add(page.pageId);
      return state;
    }),
  updatePage: (updatedPage) =>
    set((state) => ({
      pages: state.pages.map((page) => (page.pageId === updatedPage.pageId ? updatedPage : page)),
      changedPageIds: new Set([...Array.from(state.changedPageIds), updatedPage.pageId]),
    })),
  deletePage: (pageId: number, menu_id: number) =>
    set((state) => {
      state.updateChangedPageIds(pageId);
      const updatedPages = state.pages.filter((page) => page.pageId !== pageId);
      const reindexedPages = updatedPages.map((page, index) => ({
        ...page,
        page_index: index,
      }));
      const newActivePageId = reindexedPages.length > 0 ? reindexedPages[0].pageId : 3;

      const pageToDelete = state.pages.find((page) => page.pageId === pageId && page.menu_id === menu_id);
      deletePageById(pageToDelete!.pageId, pageToDelete!.menu_id);

      return {
        pages: reindexedPages,
        activePageId: newActivePageId,
        deletedPageIds: state.deletedPageIds,
      };
    }),

  updatePageDishSpacing: (spacing) => {
    set((state) => {
      state.updateChangedPageIds(state.activePageId);
      const updatePage = state.pages.find((page) => page.pageId === state.activePageId);

      if (updatePage) {
        updatePage.dishSpacingValue = spacing;
      }

      return {
        ...state,
        dishSpace: spacing,
      };
    }),
      get().incrementPageChangeId;
  },
  setActivePageId: (pageId) => set({ activePageId: pageId }),
  setActivePageUUID: (pageUUID) => set({ activePageUUID: pageUUID }),
  setIsTreeView: () => set((state) => ({ isTreeView: !state.isTreeView })),
  resetChangedPageIds: () => {
    get().changedPageIds.clear();
  },
  updatePageColumnCount: (pageColCount) =>
    set((state) => {
      if (pageColCount < 1 || !Number.isInteger(pageColCount)) {
        console.warn("Invalid page column count:", pageColCount);
        return state;
      }

      const pageIndex = state.pages.findIndex((page) => page.pageId === state.activePageId);

      if (pageIndex === -1) {
        return state;
      }

      const updatedPages = [...state.pages];
      const activePage = { ...updatedPages[pageIndex] };
      activePage.columns = pageColCount;

      const sections = useSectionsStore.getState().getSectionsForPageId(state.activePageId);

      const updatedSections = sections.map((section) => {
        const currentLayout = section.dndLayout;

        const newWidth = Math.min(currentLayout.w, pageColCount);

        let newX = currentLayout.x;

        const maxX = Math.max(0, pageColCount - newWidth);
        newX = Math.min(newX, maxX);

        if (pageColCount === 1) {
          newX = 0;
        }

        newX = Math.max(0, newX);

        return {
          ...section,
          dndLayout: {
            ...currentLayout,
            w: newWidth,
            x: newX,
            y: currentLayout.y,
            h: currentLayout.h,
          },
        };
      });

      const nonOverlappingSections = resolveLayoutOverlaps(updatedSections, pageColCount);

      useSectionsStore.getState().setOSections({
        [state.activePageId]: nonOverlappingSections,
      });

      updatedPages[pageIndex] = activePage;
      state.updateChangedPageIds(state.activePageId);
      state.incrementPageChangeId();

      return { pages: updatedPages };
    }),

  getPageColumnCount: () => {
    const state = get();
    const currentPage = state.pages.find((page) => page.pageId === state.activePageId);
    return currentPage ? currentPage.columns : 1;
  },
  getSelectedPage: () => {
    const { pages, activePageId } = get();
    return pages.find((page) => page.pageId === activePageId)!;
  },
  getPageById: (pageId) => {
    const { pages } = get();
    return pages.find((page) => page.pageId === pageId) || null;
  },
  hasPages: () => {
    const pages = get().pages;
    return pages.length > 0;
  },
  setMenuName: (name) => set({ menuName: name }),
  setMenuId: (id: number) => {
    set({ menuId: id });
  },
  resetPages: () => {
    set({
      pages: [],
      isTreeView: false,
      activePageId: 3,
      activePageUUID: "",
      dishSpace: 10,
      menuName: "Menu Template 001",
      deletedPageIds: [],
      menuId: 1,
      pageChangeId: 0,
      changedPageIds: new Set<number>(),
    });
  },
  setNaci: (arg: boolean) => {
    set({
      naci: arg,
    });
  },
  calculatePageDimensions: (page) => {
    const instance = useInitializeEditor.getState().cesdkInstance.current;

    if (!page) {
      return { pageColumnWidth: 0, pageHeightWithSpacing: 0 };
    }

    const pageHeightFromImgly = instance.engine.block.getHeight(page.pageId);

    const pageWidthFromImgly = instance.engine.block.getWidth(page.pageId);

    let { pageHeight = pageHeightFromImgly, pageWidth = pageWidthFromImgly } = page;
    const effectivePageWidth = pageWidth - page.marginLeft - page.marginRight;
    const totalColumnMargins = (page.columns - 1) * page.columnMargin;
    let pageColumnWidth = (effectivePageWidth - totalColumnMargins) / page.columns;
    const pageHeightWithSpacing = pageHeight - page.marginTop - page.marginBottom;

    if (get().pageHeight !== pageHeightWithSpacing || get().pageWidth !== pageColumnWidth) {
      get().incrementPageChangeId();
    }
    set({ pageWidth: pageColumnWidth, pageHeight: pageHeightWithSpacing });
    return { pageColumnWidth, pageHeightWithSpacing };
  },
  updatePageOrientation: (orientation: "portrait" | "landscape") => {
    const instance = useInitializeEditor.getState().cesdkInstance.current;
    const activePage = get().pages.find((page) => page.pageId === get().activePageId);

    // get the current selected page
    const currentPage = instance.engine.scene.getCurrentPage();
    const pageWidth = instance.engine.block.getWidth(currentPage);
    const pageHeight = instance.engine.block.getHeight(currentPage);
    if (instance && activePage) {
      const pages = instance.engine.block.findByType("page");
      if (pages && pages.length > 0) {
        const pageBlock = pages[0];
        const width = pageWidth || 0;
        const height = pageHeight || 0;
        if (orientation === "landscape") {
          // For landscape, make width greater than height
          instance.engine.block.setWidth(pageBlock, Math.max(width, height));
          instance.engine.block.setHeight(pageBlock, Math.min(width, height));
        } else {
          // For portrait, make height greater than width
          instance.engine.block.setWidth(pageBlock, Math.min(width, height));
          instance.engine.block.setHeight(pageBlock, Math.max(width, height));
        }
      }
    }
  },
  reorderPages: (pages) => {
    set((state) => ({
      pages,
      changedPageIds: new Set([
        ...Array.from(state.changedPageIds),
        ...pages.map((page) => page.pageId),
      ]),
    }));
    get().incrementPageChangeId();
  },
  /**
   * MENU LAYOUT CALCULATION SYSTEM
   *
   * This system determines the optimal layout for menu sections on a page by:
   * 1. Analyzing all possible section combinations
   * 2. Calculating heights and dish counts for each combination
   * 3. Selecting the combination that maximizes height utilization
   * 4. Computing appropriate spacing to fit within page constraints
   */

  /**
   * Main function to calculate the optimal menu layout
   *
   * PURPOSE: Finds the best combination of menu sections using height-first optimization
   * STRATEGY: Height priority with dish count tie-breaker:
   *   1. Primary: Maximum height utilization (best space usage)
   *   2. Secondary: Maximum dish count (when heights are equal)
   *   3. Tertiary: Leftmost position (when both height and dishes are equal)
   *
   * @param {Array} dishBlocks - Array of dish/section block objects from the canvas
   * @param {number} pageHeightWithSpacing - Available page height including margins
   * @param {number} minDishGap - Minimum gap between dishes (default 0.15)
   * @returns {Object} Contains the optimal combination info and metadata
   */

  calculateHeights: (dishBlocks, pageHeightWithSpacing, minDishGap = 0.15) => {
    debug.group("Heights Calculation - Maximum Height Priority");
    debug.log("Input dishBlocks:", dishBlocks);
    debug.log("Page constraints:", { pageHeightWithSpacing, minDishGap });

    // Early exit if no content to process
    if (!dishBlocks?.length) {
      debug.log("No dish blocks found");
      debug.groupEnd();
      return {
        maxCombinationInfo: { height: 0, dishCount: 0 },
      };
    }

    const sectionsDishes: any = {};

    /**
     * STEP 1: GROUP DISHES BY SECTION
     *
     * PURPOSE: Organize all dish blocks by their parent section
     * WHY: We need to calculate section-level heights and dish counts
     * RESULT: sectionsDishes object with section metadata and dish arrays
     */
    dishBlocks?.forEach((block) => {
      let blockHeight = 0;
      blockHeight += block.dishBlockHeight; // Height of this specific dish block

      if (block.dishBorderImageUrl && block.type === "dish") {
        const topMargin = block.dishMarginTop || 0;
        const bottomMargin = block.dishMarginBottom || 0;

        if (topMargin > 0) blockHeight += topMargin;
        if (bottomMargin > 0) blockHeight += bottomMargin;

        const marginHeight = Math.max(0, topMargin) + Math.max(0, bottomMargin);
        block._dishMarginHeight = marginHeight;
      }

      let sectionId = block.sectionID;
      // Initialize or update section data
      sectionsDishes[sectionId] = {
        // Accumulate all dishes in this section
        dishes: [
          ...(sectionsDishes[sectionId]?.dishes ? sectionsDishes[sectionId]?.dishes : []),
          {
            blockHeight,
            column: block.column,
            type: block.type,
            dishMarginHeight: block._dishMarginHeight || 0, // Include margin height for gap calculations
            hasDishBorder: !!block.dishBorderImageUrl,
          },
        ],
        // Section metadata - only set once per section
        sectionTitleHeight: sectionsDishes[sectionId]?.sectionTitleHeight
          ? sectionsDishes[sectionId]?.sectionTitleHeight
          : 0,
        columns: block.sectionColumn, // Number of columns in this section
        pageColumns: block.pageColumn, // Total page columns
        title: block.title, // Section display name
        sectionX: block.dndLayout.x, // Horizontal position in grid
        sectionW: block.dndLayout.w, // Width in grid units
        sectionId: block.sectionID, // Unique identifier
        sectionY: block.dndLayout.y, // Vertical position in grid
        isSectionTitle: block.isSectionTitle, // Has a title block
        sectionSpacerHeight: block.sectionSpacerHeight, // Extra spacing
        borderImageUrl: block.borderImageUrl,
        sectionMarginTop: block.sectionMarginTop || 0,
        sectionMarginBottom: block.sectionMarginBottom || 0,
        sectionMarginLeft: block.sectionMarginLeft || 0,
        sectionMarginRight: block.sectionMarginRight || 0,
      };

      // Special handling for section title blocks
      if (block.type === "sectionTitle") {
        sectionsDishes[sectionId].sectionTitleHeight = blockHeight;
      }
    });

    // Debug output showing what sections we found and their basic stats
    debug.log(
      "Sections Analysis:",
      Object.entries(sectionsDishes).map(([sectionId, section]: any) => ({
        sectionId,
        title: section.title,
        totalDishes: section.dishes.length,
        position: `(${section.sectionX}, ${section.sectionY})`, // Grid coordinates
        size: `${section.sectionW}w`, // Width in grid units
        nonSpacerDishes: section.dishes.filter((dish: any) => dish.type != "sectionSpacer").length,
        dishTypes: section.dishes.reduce((acc: any, dish: any) => {
          acc[dish.type] = (acc[dish.type] || 0) + 1;
          return acc;
        }, {}),
        hasBorder: !!section.borderImageUrl,
        margins: section.borderImageUrl
          ? {
              top: section.sectionMarginTop,
              bottom: section.sectionMarginBottom,
              left: section.sectionMarginLeft,
              right: section.sectionMarginRight,
            }
          : null,
      }))
    );

    /**
     * STEP 2: CALCULATE SECTION HEIGHTS AND DISH COUNTS
     *
     * PURPOSE: Determine the rendered height and effective dish count for each section
     * WHY: Different column layouts affect both height and dish count calculations
     * RESULT: Each section gets .height and .dishCount properties
     */
    Object.values(sectionsDishes).forEach((section: any) => {
      const { sectionHeight, maxDishes } = get().calculateSectionHeight(
        section.dishes,
        section.columns === 1, // Is single column layout?
        section.sectionTitleHeight, // Height of section title
        section.isSectionTitle, // Does section have a title?
        section.sectionSpacerHeight // Additional spacing
      );

      // Add section border margins to height calculation
      // Only positive margins consume page space; negative margins are visual extensions
      const marginHeight = section.borderImageUrl
        ? Math.max(0, section.sectionMarginTop || 0) + Math.max(0, section.sectionMarginBottom || 0)
        : 0;

      section.height = sectionHeight + marginHeight; // Total rendered height including margins
      section.dishCount = maxDishes; // Effective number of dishes (affects spacing)

      debug.log(`Section ${section.sectionId} height calculation:`, {
        contentHeight: sectionHeight,
        marginHeight,
        totalHeight: section.height,
        hasMargins: !!section.borderImageUrl,
        margins: {
          top: section.sectionMarginTop,
          bottom: section.sectionMarginBottom,
        },
      });
    });

    // Note: Section margins are now included in section height calculations above.
    // Positive margins consume page space and reduce available dishGap.
    // Content positioning details are handled in handleSection.ts.

    /**
     * STEP 3: GROUP SECTIONS BY ROW
     *
     * PURPOSE: Organize sections by their vertical position (Y coordinate)
     * WHY: Combinations can only be formed from sections in overlapping columns across rows
     * RESULT: rowSections object where keys are Y positions and values are section arrays
     */
    const rowSections: any = {};
    Object.values(sectionsDishes).forEach((section: any) => {
      const rowY = section.sectionY;
      if (!rowSections[rowY]) {
        rowSections[rowY] = [];
      }
      rowSections[rowY].push(section);
    });

    // Sort rows by vertical position (top to bottom)
    const sortedRows = Object.keys(rowSections)
      .map(Number)
      .sort((a, b) => a - b);

    // Early exit if no valid rows found
    if (sortedRows.length === 0) {
      debug.log("No rows found");
      debug.groupEnd();
      return {
        maxCombinationInfo: { height: 0, dishCount: 0 },
      };
    }

    /**
     * STEP 4: GENERATE ALL VALID COMBINATIONS
     *
     * PURPOSE: Find all possible vertical paths through the section grid
     * WHY: We need to evaluate every valid layout option to find the optimal one
     * RESULT: Array of combinations, each containing sections that can work together
     */
    const combinations = generateCombinations(rowSections, sortedRows);

    // Debug output showing all possible combinations
    debug.log(
      "Generated Combinations:",
      combinations.map((combination, index) => ({
        index,
        sections: combination.map((section: any) => ({
          sectionId: section.sectionId,
          title: section.title,
          dishCount: section.dishCount,
          height: section.height.toFixed(3),
          position: `(${section.sectionX}, ${section.sectionY})`,
          size: `${section.sectionW}w`,
        })),
        totalDishes: combination.reduce((sum: number, section: any) => sum + section.dishCount, 0),
        totalHeight: combination
          .reduce((sum: number, section: any) => sum + section.height, 0)
          .toFixed(3),
      }))
    );

    /**
     * STEP 5: SELECT OPTIMAL COMBINATION
     *
     * PURPOSE: Find the layout's "bottleneck" by identifying the most constrained combination.
     * STRATEGY: Instead of maximizing height, we find the combination that requires the
     * smallest (potentially negative) dish gap to fit on the page. This is the
     * true limiting factor for the layout.
     *
     * WHY: This prevents overflows in dense-but-short sections that the previous "height-first"
     * logic missed. The global dish gap will be based on this true bottleneck, ensuring
     * that if any combination overflows, the warning system will be triggered correctly.
     */
    let bestCombination: any = null;
    let minPotentialGap = Infinity; // We are now looking for the minimum gap
    let selectedCombinationIndex = -1;

    // Handle case where no combinations are possible
    if (combinations.length === 0) {
      debug.log("No valid combinations found to evaluate.");
      debug.groupEnd();
      return {
        maxCombinationInfo: { height: 0, dishCount: 0 },
      };
    }

    combinations.forEach((combination, index) => {
      const totalHeight = combination.reduce(
        (sum: number, section: any) => sum + section.height,
        0
      );
      const totalDishes = combination.reduce(
        (sum: number, section: any) => sum + section.dishCount,
        0
      );

      // Calculate the potential dish gap this specific combination would need to fit.
      let potentialGap = Infinity;
      if (pageHeightWithSpacing) {
        const availableSpace = pageHeightWithSpacing - totalHeight;
        // Number of gaps is one less than the number of dishes. Avoid division by zero.
        const totalSpaces = totalDishes > 1 ? totalDishes - 1 : 1;
        potentialGap = availableSpace / totalSpaces;
      }

      debug.log(`Evaluating Combination ${index}:`, {
        potentialGap: potentialGap.toFixed(3), // This is our new key metric
        totalHeight: totalHeight.toFixed(3),
        totalDishes,
        availableSpace: pageHeightWithSpacing
          ? (pageHeightWithSpacing - totalHeight).toFixed(3)
          : "N/A",
      });

      // SELECTION LOGIC: Find the combination with the minimum potential gap.
      // A smaller (or negative) gap means the combination is more "cramped".
      if (potentialGap < minPotentialGap) {
        minPotentialGap = potentialGap;
        bestCombination = combination;
        selectedCombinationIndex = index;

        debug.log(`🎯 NEW BOTTLENECK Combination ${index}:`, {
          reason: "This combination has the smallest required gap, making it the most constrained.",
          newMinGap: potentialGap.toFixed(3),
          sections: combination.map((s: any) => s.title).join(" + "),
        });
      }
    });

    // Fallback if no combination was selected
    if (!bestCombination && combinations.length > 0) {
      bestCombination = combinations[0];
      selectedCombinationIndex = 0;
    }

    // Calculate final metrics based on the selected "bottleneck" combination
    const finalHeight = bestCombination.reduce(
      (sum: number, section: any) => sum + section.height,
      0
    );
    const finalDishCount = bestCombination.reduce(
      (sum: number, section: any) => sum + section.dishCount,
      0
    );

    const maxCombination = {
      height: finalHeight,
      dishCount: finalDishCount,
    };

    /**
     * STEP 6: VALIDATE SELECTION AGAINST PAGE CONSTRAINTS
     *
     * PURPOSE: Check if the selected combination will fit within the page
     * WHY: We prioritize height, but still need to know if it causes overflow
     * RESULT: willOverflow flag and detailed spacing calculations
     */
    const willOverflow =
      pageHeightWithSpacing &&
      maxCombination.height + (maxCombination.dishCount - 1) * minDishGap > pageHeightWithSpacing;

    // Final summary of the selection decision
    debug.log("🏆 FINAL SELECTION:", {
      selectedIndex: selectedCombinationIndex,
      selectedCombination: bestCombination?.map((s: any) => ({
        title: s.title,
        position: `(${s.sectionX}, ${s.sectionY})`,
        dishes: s.dishCount,
        height: s.height.toFixed(3),
      })),
      totalDishes: maxCombination.dishCount,
      totalHeight: maxCombination.height.toFixed(3),
      willOverflow,

      // Space analysis
      estimatedRequiredSpace: pageHeightWithSpacing
        ? (maxCombination.height + (maxCombination.dishCount - 1) * minDishGap).toFixed(3)
        : "N/A",
      availableSpace: pageHeightWithSpacing || "N/A",
    });

    if (willOverflow) {
      debug.log(
        "⚠️ WARNING: Selected combination will overflow page, but prioritizing maximum height utilization"
      );
    }

    debug.groupEnd();

    return {
      maxCombinationInfo: {
        height: maxCombination.height,
        dishCount: maxCombination.dishCount,
        willOverflow,
        selectedCombination: bestCombination,
      },
    };
  },

  /**
   * Calculate the height and dish count for a single section
   *
   * PURPOSE: Determine how a section will render based on its column layout
   * WHY: Single vs multi-column sections have different height/dish count calculations
   *
   * @param {Array} dishes - Array of dish objects in this section
   * @param {boolean} oneColumn - Is this a single-column section?
   * @param {number} titleHeight - Height of the section title
   * @param {boolean} isSectionTitle - Does this section have a title?
   * @param {number} sectionSpacerHeight - Additional spacing for this section
   * @returns {Object} {sectionHeight, maxDishes} - Calculated metrics
   */
  calculateSectionHeight: (
    dishes: any,
    oneColumn: boolean,
    titleHeight: number,
    isSectionTitle: boolean,
    sectionSpacerHeight: number
  ) => {
    debug.group("Section Height Calculation");
    debug.log("Input Parameters:", {
      oneColumn,
      titleHeight,
      isSectionTitle,
      sectionSpacerHeight,
      totalDishes: dishes.length,
    });

    /**
     * SINGLE COLUMN LAYOUT
     *
     * PURPOSE: Handle sections that display dishes in a single vertical column
     * WHY: Simple case - all dishes stack vertically, total height = sum of all dish heights
     * CALCULATION: height = sum(dish.blockHeight), dishCount = total dishes
     */
    if (oneColumn) {
      const dishTypeCount = dishes.reduce((acc: any, dish: any) => {
        acc[dish.type] = (acc[dish.type] || 0) + 1;
        return acc;
      }, {});
      debug.log("Single Column Analysis:", {
        totalDishes: dishes.length,
        dishTypeCount,
        sectionHeight: dishes.reduce((sum: number, { blockHeight }: any) => sum + blockHeight, 0),
        maxDishes: dishes.length,
      });
      debug.groupEnd();
      return {
        sectionHeight: dishes.reduce((sum: number, { blockHeight }: any) => sum + blockHeight, 0),
        maxDishes: dishes.length,
      };
    } else {
      /**
       * MULTI-COLUMN LAYOUT
       *
       * PURPOSE: Handle sections that display dishes in multiple columns side-by-side
       * WHY: Complex case - dishes are distributed across columns, need to find tallest column
       * STRATEGY:
       *   1. Group dishes by column number
       *   2. Calculate height of each column
       *   3. Find column with most dishes (affects spacing calculations)
       *   4. Return the height of the tallest column with most dishes
       */

      // Group dishes by their column assignment
      const dishesByColumn = dishes.reduce((acc: any, { blockHeight, column, type }: any) => {
        acc[column] = [...(acc[column] || []), { blockHeight, type }];
        return acc;
      }, {});

      // Get column numbers in sorted order
      const sortedColumns = Object.keys(dishesByColumn)
        .map(Number)
        .sort((a, b) => a - b);

      debug.log("Multi Column Analysis:", {
        columns: sortedColumns.map((column) => ({
          column,
          totalDishes: dishesByColumn[column].length,
          dishTypes: dishesByColumn[column].reduce((acc: any, dish: any) => {
            acc[dish.type] = (acc[dish.type] || 0) + 1;
            return acc;
          }, {}),
        })),
      });

      /**
       * CALCULATE COLUMN HEIGHTS
       *
       * PURPOSE: Find the actual rendered height of each column
       * WHY: Columns after the first need to include section title height
       * LOGIC: First column = dish heights only, subsequent columns = dish heights + title height
       */
      const columnHeights = sortedColumns.map((column) => {
        let columnHeight = 0;
        columnHeight = dishesByColumn[column].reduce(
          (sum: number, dish: any) => sum + dish.blockHeight,
          0
        );

        // Add title height to columns after the first one
        // WHY: Section title appears in first column, other columns need space for alignment
        return column > 1 ? columnHeight + titleHeight : columnHeight;
      });

      /**
       * CALCULATE EFFECTIVE DISH COUNT PER COLUMN
       *
       * PURPOSE: Determine how many "dish units" each column represents for spacing
       * WHY: Columns with section titles count as having one extra dish for spacing calculations
       * LOGIC: Add 1 to dish count for non-first columns that have section titles
       */
      const dishesPerColumn = sortedColumns.map((column) => {
        const dishCount = dishesByColumn[column].length;

        // Add 1 for section title if it exists and this isn't the first column
        return column > 1 && isSectionTitle ? dishCount + 1 : dishCount;
      });

      // Find the maximum number of dishes in any column
      const maxDishesCount = Math.max(...dishesPerColumn);

      /**
       * FIND OPTIMAL COLUMN
       *
       * PURPOSE: Select the column that represents this section's characteristics
       * STRATEGY:
       *   1. Find all columns with the maximum dish count
       *   2. Among those, select the one with the greatest height
       * WHY: We want the column that has the most content and takes up the most space
       */
      const maxDishColumns = dishesPerColumn
        .map((count, index) => ({ count, index }))
        .filter((item) => item.count === maxDishesCount);

      let maxHeightColumn = maxDishColumns[0].index;
      let maxHeight = columnHeights[maxHeightColumn];

      // Among columns with max dishes, find the tallest one
      for (let i = 1; i < maxDishColumns.length; i++) {
        const columnIndex = maxDishColumns[i].index;
        if (columnHeights[columnIndex] > maxHeight) {
          maxHeight = columnHeights[columnIndex];
          maxHeightColumn = columnIndex;
        }
      }

      debug.log("Final Column Selection:", {
        maxDishesCount,
        maxHeightColumn,
        maxHeight,
        dishesPerColumn,
        columnHeights,
      });

      debug.groupEnd();
      return {
        sectionHeight: columnHeights[maxHeightColumn],
        maxDishes: maxDishesCount,
      };
    }
  },
}));

/**
 * COMBINATION GENERATION SYSTEM
 *
 * PURPOSE: Generate all valid paths through the section grid
 * WHY: We need to evaluate every possible layout to find the optimal one
 * STRATEGY: Dynamic programming approach building paths row by row
 */

/**
 * Generate all valid combinations of sections that can work together
 *
 * PURPOSE: Find every possible vertical path through the section grid
 * WHY: Different section arrangements create different layout options
 * ALGORITHM: Build paths row by row, checking column overlap compatibility
 *
 * @param {Object} rowSections - Sections grouped by row (Y coordinate)
 * @param {Array} sortedRows - Row Y coordinates in ascending order
 * @returns {Array} Array of valid section combinations
 */
function generateCombinations(rowSections: any, sortedRows: any) {
  // No rows means no combinations possible
  if (sortedRows.length === 0) {
    return [];
  }

  /**
   * INITIALIZATION: Start with first row
   *
   * PURPOSE: Create initial paths containing each section from the first row
   * WHY: Every valid combination must start with a section from the topmost row
   * RESULT: Array of single-section paths
   */
  const initialPaths = rowSections[sortedRows[0]].map((section: any) => [section]);

  let validPaths = [...initialPaths];

  /**
   * ROW-BY-ROW PATH BUILDING
   *
   * PURPOSE: Extend existing paths by adding compatible sections from each subsequent row
   * STRATEGY: For each existing path, check which sections from the current row are compatible
   * COMPATIBILITY: Sections must have overlapping columns to work together vertically
   */
  for (let i = 1; i < sortedRows.length; i++) {
    const currentRow = sortedRows[i];
    const currentRowSections = rowSections[currentRow];
    const newPaths: any = [];

    // Process each existing path
    validPaths.forEach((path: any) => {
      const lastSection = path[path.length - 1]; // Last section in current path
      let foundCompatibleSection = false;

      // Check each section in the current row for compatibility
      currentRowSections.forEach((currentSection: any) => {
        const hasColumnOverlap = checkColumnOverlap(lastSection, currentSection);

        /**
         * COMPATIBILITY CHECK
         *
         * PURPOSE: Determine if two sections can work together vertically
         * WHY: Sections must share column space to create a coherent layout
         * RESULT: If compatible, extend the path; if not, path ends
         */
        if (hasColumnOverlap) {
          newPaths.push([...path, currentSection]);
          foundCompatibleSection = true;
        }
      });

      /**
       * PATH TERMINATION HANDLING
       *
       * PURPOSE: Handle paths that can't be extended further
       * WHY: Not every path can reach the bottom row - some end naturally
       * RESULT: Preserve the path as-is for final evaluation
       */
      if (!foundCompatibleSection) {
        newPaths.push([...path]); // Path ends here, but still valid
      }
    });

    validPaths = newPaths;
  }

  /**
   * DEDUPLICATION
   *
   * PURPOSE: Remove duplicate paths that contain the same sections
   * WHY: Multiple paths might lead to identical section combinations
   * METHOD: Create unique string identifiers for each path
   */
  const uniquePaths = removeDuplicatePaths(validPaths);

  return uniquePaths;
}

/**
 * Check if two sections have overlapping columns
 *
 * PURPOSE: Determine if sections can be vertically adjacent in the layout
 * WHY: Sections must share horizontal space to work together in a combination
 * ALGORITHM: Check if horizontal ranges [start, end) overlap
 *
 * @param {Object} section1 - First section to compare
 * @param {Object} section2 - Second section to compare
 * @returns {boolean} True if sections have overlapping columns
 */
function checkColumnOverlap(section1: any, section2: any) {
  // Calculate horizontal range for each section
  const section1Start = section1.sectionX; // Left edge
  const section1End = section1.sectionX + section1.sectionW; // Right edge
  const section2Start = section2.sectionX; // Left edge
  const section2End = section2.sectionX + section2.sectionW; // Right edge

  /**
   * OVERLAP DETECTION LOGIC
   *
   * Three conditions that indicate overlap:
   * 1. section2 starts within section1's range
   * 2. section2 ends within section1's range
   * 3. section2 completely contains section1
   *
   * WHY: Covers all possible overlap scenarios between two ranges
   */
  const hasOverlap =
    (section2Start >= section1Start && section2Start < section1End) ||
    (section2End > section1Start && section2End <= section1End) ||
    (section2Start <= section1Start && section2End >= section1End);

  return hasOverlap;
}

/**
 * Remove duplicate paths from the combinations array
 *
 * PURPOSE: Eliminate redundant combinations to avoid evaluating the same layout multiple times
 * WHY: Different generation paths might produce identical section combinations
 * METHOD: Create unique string signatures for each combination
 *
 * @param {Array} paths - Array of section combination paths
 * @returns {Array} Array of unique paths only
 */
function removeDuplicatePaths(paths: any[]) {
  const uniquePaths: any[] = [];
  const pathStrings = new Set(); // Track seen combinations

  paths.forEach((path: any) => {
    // Create unique identifier by joining section IDs
    const pathString = path.map((section: any) => section.sectionId).join("-");

    // Only add if we haven't seen this combination before
    if (!pathStrings.has(pathString)) {
      pathStrings.add(pathString);
      uniquePaths.push(path);
    }
  });

  return uniquePaths;
}

// Helper function to check for overlaps
const checkForOverlap = (x: any, y: any, w: any, h: any, occupiedSpaces: any) => {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      if (occupiedSpaces.has(`${col}-${row}`)) {
        return true;
      }
    }
  }
  return false;
};

// Helper function to resolve overlapping sections
const resolveLayoutOverlaps = (sections: any, columnCount: any) => {
  // Sort sections by y position, then by x position
  const sortedSections = [...sections].sort((a, b) => {
    if (a.dndLayout.y === b.dndLayout.y) {
      return a.dndLayout.x - b.dndLayout.x;
    }
    return a.dndLayout.y - b.dndLayout.y;
  });

  const resolvedSections = [];
  const occupiedSpaces = new Set();

  for (const section of sortedSections) {
    let { x, y, w, h } = section.dndLayout;

    // Find the first available position for this section
    let positioned = false;
    let attempts = 0;
    const maxAttempts = columnCount * 10; // Prevent infinite loops

    while (!positioned && attempts < maxAttempts) {
      const wouldOverlap = checkForOverlap(x, y, w, h, occupiedSpaces);

      if (!wouldOverlap && x + w <= columnCount) {
        // Position is valid, mark spaces as occupied
        for (let row = y; row < y + h; row++) {
          for (let col = x; col < x + w; col++) {
            occupiedSpaces.add(`${col}-${row}`);
          }
        }
        positioned = true;
      } else {
        // Try next position
        x++;
        if (x + w > columnCount) {
          x = 0;
          y++;
        }
      }
      attempts++;
    }

    resolvedSections.push({
      ...section,
      dndLayout: { ...section.dndLayout, x, y, w, h },
    });
  }

  return resolvedSections;
};
