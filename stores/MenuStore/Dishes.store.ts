import { Dish, Section } from "@Interfaces/";
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { filterInvalidSectionTitles, uintId } from "@Components/Editor/Utils";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { design } from "@Components/Editor/Utils/data";
import { usePageStore } from "./Pages.store";
import { deleteDishById } from "@Helpers/EditorData";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { supabase } from "@database/client.connection";

type Spacer = {
  height: number;
  width: number;
};

type LayoutSettings = {
  isDishTitleAndPrice: boolean;
  isDishDescriptionAndPrice: boolean;
  isDishTitleAndDescriptionAndPrice: boolean;
  isJustifyPriceCenter: boolean;
  isJustifyPriceTop: boolean;
  isDefaultLayout: boolean;
};

type HorizontalAlignSettings = {
  isLeft: boolean;
  isCenter: boolean;
  isRight: boolean;
};

type DishesStore = {
  oDishes: { [sectionId: string]: Dish[] };
  deletedDishIds: number[];
  selectedDish: number;
  dishChangeId: number;
  contentChange: boolean;
  sectionDivider: boolean;
  layoutSettings: { [sectionId: string]: LayoutSettings };
  horizontalAlignSettings: { [sectionId: string]: HorizontalAlignSettings };
  textAlign?: "Left" | "Center" | "Right";
  dishAddOns: {
    [sectionId: string]: {
      [dishId: string]: { checked: boolean };
    };
  };
  dishDietaryIcons: {
    [sectionId: string]: {
      [dishId: string]: { checked: boolean };
    };
  };
  setDishAddOns: (sectionId: string, dishId: string, checked: boolean) => void;
  setDietaryIconInputVisible: (sectionId: string, dishId: string, checked: boolean) => void;
  incrementDishChangeId: () => void;
  setContentChange: (value: boolean) => void;
  setODishes: (dishes: { [sectionId: string]: Dish[] }) => void;
  addDish: (isSpacer: boolean, column: number, defaultPosition: number) => number;
  addTextDish: (column: number, defaultPosition: number) => number;
  addInlineImageDish: (column: number, defaultPosition: number) => number;
  addSectionDivider: (column: number, defaultPosition: number) => number;
  duplicateDish: (dishId: number) => void;
  removeDish: (dishId: string) => Promise<void>;
  updateSectionDishes: (sectionDishes: Dish[]) => void;
  updateSpacerHeight: (sectionId: string, dishId: number, height: number) => void;
  updateDishContent: (
    sectionId: string,
    dishId: number,
    name: string,
    value: string | number | string[] | null
  ) => void;
  getSpacerInfo: (sectionId: string, dishId: number) => Spacer | null;
  getDishesForSelectedPage: () => Dish[];
  getDishesForSelectedSection: () => Dish[];
  getDishesByColumn: () => Dish[][];
  setSelectedDish: (id: number) => void;
  updateSectiontitleAddon: (newAddOn: string | null) => void;
  updateSectionTitleDish: (newTitle: string | null) => void;
  updateSectionPrice: (newPrice: string | null) => void;
  getSelectedSectionTitle: () => void;
  getAllSectionTitles: () => Array<{
    name: string;
    sectionId: string;
    pageId: number;
    columns: number;
    title: string | null | undefined;
    dndLayout: any;
    addOns: string | null | undefined;
    price: string | null | undefined;
    placeholderName: string;
  }>;
  getAllDishesWithLayout: (pageId: number, sections: Section[]) => any;
  setLayoutSettings: (sectionId: string, layout: Partial<LayoutSettings>) => void;
  setHorizontalSettings: (sectionId: string, alignLayout: Partial<HorizontalAlignSettings>) => void;
  resetDishes: () => void;
  updateSectionTitle: (sectionId: string, newTitle: string | null) => void;
  removeAllDishesExceptTitle: (sectionId: string) => void;
  setDishInlineTextLayout: (
    sectionId: string,
    dishId: number,
    selection: {
      layoutId: number | null;
      elementPath: string | null;
    }
  ) => Promise<void>;
};

export const useDishesStore = create<DishesStore>((set, get) => ({
  oDishes: {},
  deletedDishIds: [],
  selectedDish: -1,
  dishChangeId: 0,
  contentChange: false,
  sectionDivider: false,
  layoutSettings: {},
  horizontalAlignSettings: {},
  dishAddOns: {},
  dishDietaryIcons: {},
  textAlign: "Left",
  setDishAddOns: (sectionId, dishId, checked) => {
    set((state) => ({
      dishAddOns: {
        ...state.dishAddOns,
        [sectionId]: {
          ...state.dishAddOns[sectionId],
          [dishId]: { checked },
        },
      },
    }));
  },
  setDietaryIconInputVisible: (sectionId, dishId, checked) => {
    set((state) => ({
      dishDietaryIcons: {
        ...state.dishAddOns,
        [sectionId]: {
          ...state.dishAddOns[sectionId],
          [dishId]: { checked },
        },
      },
    }));
  },
  setLayoutSettings: (sectionId, layout) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    set((state) => ({
      layoutSettings: {
        ...state.layoutSettings,
        [sectionId]: {
          ...state.layoutSettings[sectionId],
          ...layout,
        },
      },
    }));
    get().incrementDishChangeId();
  },
  setHorizontalSettings(sectionId, alignLayout) {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    set((state) => ({
      horizontalAlignSettings: {
        ...state.horizontalAlignSettings,
        [sectionId]: {
          ...state.horizontalAlignSettings[sectionId],
          ...alignLayout,
        },
      },
    }));
    get().incrementDishChangeId();
  },
  setContentChange: (value) => {
    set({ contentChange: value });
  },
  incrementDishChangeId: () => set((state) => ({ dishChangeId: state.dishChangeId + 1 })),
  setODishes: (dishes) => {
    set((state) => ({ ...state, oDishes: { ...state.oDishes, ...dishes } }));
  },
  addDish: (isSpacer, column, defaultPosition) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    const existingDishes = useDishesStore.getState().oDishes[sectionId] || [];
    const dishId = uintId();
    const newDish: Dish = isSpacer
      ? {
          id: dishId,
          title: "Spacer",
          description: "Spacer",
          column,
          price: "0",
          spacer: { height: 0, width: 0 },
          order_position: defaultPosition,
          created_at: Date.now().toString(),
          isSpacer: true,
          visible: true,
          section: sectionId,
          frontend_id: uuidv4(),
          type: "spacer",
          placeholderTitle: "Dish Title",
          placeholderDescription: "Dish Description",
          placeholderPrice: "0",
          isEdit: false,
        }
      : {
          id: dishId,
          title: null,
          column,
          description: null,
          price: null,
          isSpacer: false,
          order_position: defaultPosition,
          created_at: Date.now().toString(),
          visible: true,
          section: sectionId,
          layout: design.value,
          frontend_id: uuidv4(),
          type: "dish",
          placeholderTitle: "Dish Title",
          placeholderDescription: "Dish Description",
          placeholderPrice: "10",
          isEdit: false,
          secondPrice: null,
        };

    let incrementedOrder = defaultPosition;

    const updatedDishes = existingDishes.map((dish) => {
      if (dish.order_position >= defaultPosition) {
        return {
          ...dish,
          order_position: ++incrementedOrder,
        };
      }
      return dish;
    });

    const finalDishes = [...updatedDishes, newDish].sort(
      (a, b) => a.order_position - b.order_position
    );

    set((state) => ({
      oDishes: {
        ...state.oDishes,
        [sectionId]: [...existingDishes, newDish],
      },
    }));
    get().incrementDishChangeId();
    return dishId;
  },
  addTextDish: (column, defaultPosition) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    const existingDishes = useDishesStore.getState().oDishes[sectionId] || [];
    const dishId = uintId();
    const newDish: Dish = {
      id: dishId,
      title: null,
      description: null,
      price: null,
      column,
      isSpacer: false,
      order_position: defaultPosition,
      created_at: Date.now().toString(),
      visible: true,
      section: sectionId,
      frontend_id: uuidv4(),
      type: "inlineText",
      placeholderTitle: "Enter text...",
      placeholderDescription: "",
      placeholderPrice: "",
      isEdit: false,
      secondPrice: null,
      textAlign: "Left",
    };

    set((state) => ({
      oDishes: {
        ...state.oDishes,
        [sectionId]: [...existingDishes, newDish],
      },
    }));
    get().incrementDishChangeId();
    return dishId;
  },
  addInlineImageDish: (column, defaultPosition) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    const existingDishes = useDishesStore.getState().oDishes[sectionId] || [];
    const dishId = uintId();
    const newDish: Dish = {
      id: dishId,
      title: "Inline Image",
      description: null,
      price: null,
      column,
      isSpacer: false,
      order_position: defaultPosition,
      created_at: Date.now().toString(),
      visible: true,
      section: sectionId,
      frontend_id: uuidv4(),
      type: "inlineImage",
      placeholderTitle: "Image",
      placeholderDescription: "",
      placeholderPrice: "",
      isEdit: false,
      imageUrl: null,
      imageHeight: 0,
      imageWidth: 0,
      imageHeightInches: 1,
    };

    set((state) => ({
      oDishes: {
        ...state.oDishes,
        [sectionId]: [...existingDishes, newDish],
      },
    }));
    return dishId;
  },

  addSectionDivider: (column, defaultPosition) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    const existingDishes = useDishesStore.getState().oDishes[sectionId] || [];
    const dishId = uintId();
    const newDish: Dish = {
      id: dishId,
      title: "Section Divider",
      description: null,
      price: null,
      column,
      isSpacer: false,
      order_position: defaultPosition,
      created_at: Date.now().toString(),
      visible: true,
      section: sectionId,
      frontend_id: uuidv4(),
      type: "inlineSectionDivider",
      placeholderTitle: "Section Divider",
      placeholderDescription: "",
      placeholderPrice: "",
      isEdit: false,
      dividerImageUrl: null,
      dividerImageHeight: 0,
      dividerImageWidth: 0,
      dividerImageHeightInches: 0.1,
    };

    set((state) => ({
      oDishes: {
        ...state.oDishes,
        [sectionId]: [...existingDishes, newDish],
      },
    }));
    return dishId;
  },
  duplicateDish: (dishId) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    set((state) => {
      const prevState = state.oDishes;
      if (!prevState[sectionId]) return prevState;

      const dishToDuplicate = prevState[sectionId].find((dish) => dish.id === dishId);
      if (!dishToDuplicate) return prevState;
      const title =
        dishToDuplicate.title != null ? dishToDuplicate.title : dishToDuplicate.placeholderTitle;
      const newDish = {
        ...dishToDuplicate,
        id: uintId(),
        frontend_id: uuidv4(),
        order_position: prevState[sectionId].length,
      };
      return {
        oDishes: {
          ...prevState,
          [sectionId]: [...prevState[sectionId], newDish],
        },
      };
    });
    get().incrementDishChangeId();
  },
  removeDish: async (dishId) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    await deleteDishById(dishId);

    set((state) => {
      const prevState = state.oDishes;
      const updatedDishes = prevState[sectionId].filter((dish) => dish.frontend_id != dishId);
      const updatedState = { ...prevState };
      if (updatedDishes.length > 0) {
        updatedState[sectionId] = updatedDishes;
      } else {
        delete updatedState[sectionId];
      }

      return {
        oDishes: updatedState,
        deletedDishIds: state.deletedDishIds,
      };
    });
    get().incrementDishChangeId();
  },
  updateSectionDishes: (sectionDishes) => {
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    const pageId = useSectionsStore.getState().selectedSection.pageId;
    usePageStore.getState().updateChangedPageIds(pageId);
    if (!sectionDishes.length || !sectionId || !pageId) return;
    set((state) => ({
      oDishes: { ...state.oDishes, [sectionId]: sectionDishes },
    }));
    get().incrementDishChangeId();
  },
  updateSpacerHeight: (sectionId, dishId, height) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const getSpacerInfo = (sectionId: string, dishId: number) => {
      const dish = get().oDishes[sectionId].find((dish: Dish) => dish.id === dishId);
      if (!dish || !dish.isSpacer) return null;
      return dish.spacer;
    };

    const spacerInfo = getSpacerInfo(sectionId, dishId);
    if (!spacerInfo) return;

    set((state) => {
      const prevState = state.oDishes;
      const sectionDishes = prevState[sectionId];
      if (!sectionDishes) return prevState;

      const updatedDishes = sectionDishes.map((dish) => {
        if (dish.id === dishId) {
          const newHeight = height;

          return {
            ...dish,
            spacer: {
              ...spacerInfo,
              height: newHeight,
            },
          };
        }
        return dish;
      });

      return { oDishes: { ...prevState, [sectionId]: updatedDishes } };
    });
    get().incrementDishChangeId();
  },
  updateDishContent: (sectionId, dishId, name, value) => {
    get().setContentChange(false),
      usePageStore
        .getState()
        .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    // Trigger canvas re-rendering for non-auto layout menus
    usePageStore.getState().setNaci(true);
    set((state) => {
      const prevState = state.oDishes;
      if (!prevState[sectionId]) return prevState;
      const updatedDishes = prevState[sectionId].map((dish) => {
        if (dish.id === dishId) {
          return {
            ...dish,
            [name]: value,
          };
        }
        return dish;
      });

      return { oDishes: { ...prevState, [sectionId]: updatedDishes } };
    });
    get().incrementDishChangeId();
  },
  setDishInlineTextLayout: async (sectionId, dishId, selection) => {
    const { cesdkInstance, inlineTextLayoutBlockId: defaultInlineTextId } =
      useInitializeEditor.getState();
    const { oDishes } = get();

    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);

    let newBlockId = defaultInlineTextId;

    if (selection.elementPath && selection.layoutId) {
      try {
        const { data, error } = await supabase.storage
          .from("style_layouts")
          .download(selection.elementPath);
        if (error) throw error;

        const elementString = await data?.text();
        if (elementString?.length) {
          newBlockId = await cesdkInstance.current?.engine.block.loadFromString(elementString);
        }
      } catch (error) {
        console.error("Error loading custom inline text layout:", error);
        // Fallback to default if loading fails
        newBlockId = await cesdkInstance.current?.engine.block.loadFromString(design.inlineText);
      }
    } else {
      // If deselecting, load the default block to get its ID
      newBlockId = await cesdkInstance.current?.engine.block.loadFromString(design.inlineText);
    }

    set((state: any) => {
      const updatedDishes = state.oDishes[sectionId].map((dish: Dish) => {
        if (dish.id === dishId) {
          return {
            ...dish,
            temp_inlineText_layout: selection.layoutId,
            inlineText_layout: selection.layoutId,
            inlineTextLayoutBlockId: newBlockId,
          };
        }
        return dish;
      });

      return {
        oDishes: {
          ...state.oDishes,
          [sectionId]: updatedDishes,
        },
      };
    });

    get().incrementDishChangeId();
  },
  getSpacerInfo: (sectionId, dishId) => {
    const state = get();
    const dish = state.oDishes[sectionId]?.find((dish: Dish) => dish.id === dishId);
    if (!dish || !dish.isSpacer) return null;
    return dish.spacer!;
  },
  getDishesForSelectedPage: () => {
    const state = get();
    const sections = useSectionsStore.getState().getSectionsForSelectedPage();
    let allDishes: Dish[] = [];
    sections.forEach((section) => {
      const sectionDishes = state.oDishes[section.sectionId] || [];
      const regularDishes = sectionDishes.filter((dish) => dish.type !== "inlineSectionDivider");
      const dividerDishes = sectionDishes.filter((dish) => dish.type === "inlineSectionDivider");
      allDishes = [...allDishes, ...regularDishes, ...dividerDishes];
    });
    return allDishes;
  },
  getDishesForSelectedSection: () => {
    const state = get();
    const section = useSectionsStore.getState().getSelectedSection();
    let allDishes: Dish[] = [];
    if (!!section) {
      const sectionDishes = state.oDishes[section.sectionId] || [];
      const regularDishes = sectionDishes.filter((dish) => dish.type !== "inlineSectionDivider");
      const dividerDishes = sectionDishes.filter((dish) => dish.type === "inlineSectionDivider");
      allDishes = [...allDishes, ...regularDishes, ...dividerDishes];
    }
    return allDishes;
  },
  getDishesByColumn: () => {
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    const dishes = get().oDishes[sectionId] || [];
    const section = useSectionsStore.getState().getSelectedSection();

    const numberOfColumns = section.columns;
    const dishesByColumn: Dish[][] = Array.from({ length: numberOfColumns }, () => []);

    const sortedDishes = dishes.slice().sort((a, b) => a.order_position - b.order_position);

    get().sectionDivider = false;
    let inlineSectionDividerDish: Dish | undefined;

    sortedDishes.forEach((dish) => {
      if (dish.type === "inlineSectionDivider") {
        get().sectionDivider = true;
        inlineSectionDividerDish = dish;
      } else {
        const columnIndex = Math.min(dish.column - 1, numberOfColumns - 1);
        dishesByColumn[columnIndex].push(dish);
      }
    });

    if (inlineSectionDividerDish) {
      // Find the column with the most dishes
      let maxIndex = 0;
      let maxLength = dishesByColumn[0].length;
      for (let i = 1; i < dishesByColumn.length; i++) {
        if (dishesByColumn[i].length > maxLength) {
          maxLength = dishesByColumn[i].length;
          maxIndex = i;
        }
      }

      const targetColumn = maxIndex + 1; // 1-indexed column

      // Update the dish.column property in the store if it's different
      if (inlineSectionDividerDish.column !== targetColumn) {
        // Update the store state to persist the column change
        set((state) => {
          const prevState = state.oDishes;
          const updatedDishes = prevState[sectionId].map((dish) => {
            if (dish.id === inlineSectionDividerDish?.id && dish.type === "inlineSectionDivider") {
              return {
                ...dish,
                column: targetColumn, // Update the column property
              };
            }
            return dish;
          });

          return { oDishes: { ...prevState, [sectionId]: updatedDishes } };
        });

        // Update the local reference to reflect the new column
        inlineSectionDividerDish = {
          ...inlineSectionDividerDish,
          column: targetColumn,
        };

        // Trigger change notification
        get().incrementDishChangeId();
      }

      dishesByColumn[maxIndex].push(inlineSectionDividerDish);
    }

    return dishesByColumn;
  },

  setSelectedDish: (id) => {
    set({ selectedDish: id });
  },
  updateSectionTitleDish: (newTitle) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    get().setContentChange(false),
      set((state) => {
        const prevState = state.oDishes;
        if (!prevState[sectionId]) return prevState;

        const updatedDishes = prevState[sectionId].map((dish) => {
          if (dish.type === "sectionTitle") {
            return {
              ...dish,
              title: newTitle,
              isEdit: true,
            };
          }
          return dish;
        });

        useSectionsStore.getState().updateSectionName(newTitle);
        return { oDishes: { ...prevState, [sectionId]: updatedDishes } };
      });
    get().setContentChange(true), get().incrementDishChangeId();
  },

  updateSectiontitleAddon: (newAddOn) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    set((state) => {
      const prevState = state.oDishes;
      if (!prevState[sectionId]) return prevState;

      const updatedDishes = prevState[sectionId].map((dish) => {
        if (dish.type === "sectionTitle") {
          return {
            ...dish,
            addOns: newAddOn,
          };
        }
        return dish;
      });

      return { oDishes: { ...prevState, [sectionId]: updatedDishes } };
    });
    get().incrementDishChangeId();
  },
  updateSectionPrice: (newPrice) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    set((state) => {
      const prevState = state.oDishes;
      if (!prevState[sectionId]) return prevState;

      const updatedDishes = prevState[sectionId].map((dish) => {
        if (dish.type === "sectionTitle") {
          return {
            ...dish,
            price: newPrice,
          };
        }
        return dish;
      });

      return { oDishes: { ...prevState, [sectionId]: updatedDishes } };
    });
    get().incrementDishChangeId();
  },
  getSelectedSectionTitle: () => {
    const sectionId = useSectionsStore.getState().selectedSection.sectionId;
    const state = get();
    const sectionDishes = state.oDishes[sectionId] || [];
    const sectionTitleDish = sectionDishes.find((dish) => dish.type === "sectionTitle");
    return sectionTitleDish ? sectionTitleDish.title : null;
  },
  getAllSectionTitles: () => {
    const state = get();
    const allSections = useSectionsStore.getState().getSectionsForSelectedPage();
    return allSections.map((section) => {
      const sectionDishes = state.oDishes[section.sectionId] || [];
      const sectionTitleDish = sectionDishes.find((dish) => dish.type === "sectionTitle");
      return {
        sectionId: section.sectionId,
        pageId: section.pageId,
        columns: section.columns,
        title: sectionTitleDish ? sectionTitleDish.title : null,
        name: section.name,
        dndLayout: section.dndLayout,
        addOns: sectionTitleDish ? sectionTitleDish.addOns : null,
        price: sectionTitleDish ? sectionTitleDish.price : null,
        placeholderName: section.placeholderName,
      };
    });
  },
  getAllDishesWithLayout: (pageId: number, sections: Section[]) => {
    const oDishes = get().oDishes;
    const sectionDishes = sections.flatMap((section) => {
      const sectionDishes = oDishes[section.sectionId] || [];
      const updateDishes = filterInvalidSectionTitles(sectionDishes);
      const shouldSetSectionTitle = updateDishes.some((dish) => dish.type === "sectionTitle");
      const regularDishes = updateDishes.filter((dish) => dish.type !== "inlineSectionDivider");
      const dividerDishes = updateDishes.filter((dish) => dish.type === "inlineSectionDivider");
      const processDishes = (dishes: Dish[]) =>
        dishes.map((dish: Dish) => {
          const hasNonNullValues =
            dish.title !== null || dish.description !== null || dish.price !== null;
          const { inlineTextLayoutBlockId: defaultInlineTextId } = useInitializeEditor.getState();
          const title = hasNonNullValues ? dish.title ?? "" : dish.placeholderTitle;
          const description = hasNonNullValues
            ? dish.description ?? ""
            : dish.placeholderDescription;
          const hasNonNullSecondPrice = dish.secondPrice !== null;
          const price =
            hasNonNullValues || hasNonNullSecondPrice ? dish.price ?? "" : dish.placeholderPrice;

          const finalSecondPrice = dish.secondPrice;

          return {
            ...dish,
            dndLayout: section.dndLayout,
            sectionTitleLayoutBlockId: section.sectionTitleLayoutBlockId,
            dishLayoutBlockId: section.dishLayoutBlockId,
            columns: section.columns,
            titleLayout: section.temp_title_layout,
            dishLayout: dish.temp_dish_layout,
            inlineText_layout: dish.temp_inlineText_layout,
            inlineTextLayoutBlockId: dish.inlineTextLayoutBlockId ?? defaultInlineTextId,
            title,
            description,
            price,
            secondPrice: finalSecondPrice,
            isSectionTitle: shouldSetSectionTitle,
            borderImageUrl: dish.borderImageUrl,
            dishMarginLeft: dish.dishMarginLeft,
            dishMarginRight: dish.dishMarginRight,
            dishMarginTop: dish.dishMarginTop,
            dishMarginBottom: dish.dishMarginBottom,
          };
        });
      const processedRegularDishes = processDishes(regularDishes);
      const processedDividerDishes = processDishes(dividerDishes);
      return [...processedRegularDishes, ...processedDividerDishes];
    });
    return sectionDishes;
  },
  resetDishes: () => {
    set({
      oDishes: {},
      deletedDishIds: [],
      selectedDish: -1,
      dishChangeId: 0,
    });
  },
  updateSectionTitle: (sectionId: string, newTitle: string | null) => {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);

    set((state) => {
      const prevState = state.oDishes;
      if (!prevState[sectionId]) return prevState;

      const updatedDishes = prevState[sectionId].map((dish) => {
        if (dish.type === "sectionTitle") {
          return {
            ...dish,
            title: newTitle,
            isEdit: true,
          };
        }
        return dish;
      });

      return { oDishes: { ...prevState, [sectionId]: updatedDishes } };
    });

    get().incrementDishChangeId();
  },
  removeAllDishesExceptTitle: (sectionId: string) => {
    const { pageId } = useSectionsStore.getState().selectedSection;
    usePageStore.getState().updateChangedPageIds(pageId);

    set((state) => {
      const dishes = state.oDishes[sectionId];
      if (!dishes) return state;

      const titleDish = dishes.find((dish) => dish.type === "sectionTitle");
      return {
        ...state,
        oDishes: {
          ...state.oDishes,
          [sectionId]: titleDish ? [titleDish] : [],
        },
      };
    });

    get().incrementDishChangeId();
  },
}));
