import { create } from "zustand";
import { Section, Dish } from "@Interfaces/";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { defaultSection, design } from "@Components/Editor/Utils/data";
import { uintId } from "@Components/Editor/Utils";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@database/client.connection";
import { useInitializeEditor } from "../InitializeEditor/InitializeEditor.store";
import { deleteSectionById } from "@Helpers/EditorData";

type TitlehorizontalAlignSettings = {
  isLeft: boolean;
  isCenter: boolean;
  isRight: boolean;
};

interface LayoutSelection {
  checked: boolean;
  layoutId: number | null;
  elementPath: string | null;
}

interface SectionLayoutState {
  [pageId: string]: {
    [sectionId: string]: {
      dishLayout: LayoutSelection;
      titleLayout: LayoutSelection;
      inlineTextLayout: LayoutSelection;
    };
  };
}

type LayoutSettings = {
  isSectionTitleWithPrice: boolean;
  isSectionTitleTopOnPrice: boolean;
};

interface SectionWithLayout {
  pageId: string;
  sectionId: string;
  currentLayoutId: number | null;
}

type SectionsStore = {
  oSections: { [pageId: string]: Section[] };
  dishLayoutBlockId: Array<number>;
  sectionTitleLayoutBlockId: Array<number>;
  sectionChangeId: number;
  sectionAddOns: { [sectionId: string]: { checked: boolean } };
  moreOptions: { [sectionId: string]: { checked: boolean } };
  titleHorizontalAlignSettings: {
    [sectionId: string]: TitlehorizontalAlignSettings;
  };
  layoutSettings: { [sectionId: string]: LayoutSettings };
  setSectionAddOns: (sectionId: string, checked: boolean) => void;
  incrementSectionChangeId: () => void;
  setOSections: (sections: { [pageId: string]: Section[] }) => void;
  setDishLayoutBlockId: (dishLayoutBlockId: number[]) => void;
  selectedSection: {
    pageId: number | -1;
    sectionId: string | "-1";
  };
  setSelectedSection: ({ pageId, sectionId }: { pageId: number; sectionId: string }) => void;
  componentLayout: Array<{
    id: number;
    elementPath: string;
    image: string;
    restaurantId: number;
    sectionId: string;
    layoutType: string;
    scenePath: string;
  }>;
  setSectionTitleLayoutBlockId: (sectionTitleLayoutBlockId: number[]) => void;
  updateSectionName: (newName: string | null) => void;
  addSection: () => void;
  removeSection: (pageId: number, sectionId: string) => void;
  duplicateSection: (pageId: number, sectionId: string) => void;
  updateSectionColumnCount: (newColumns: number) => void;
  updateSectionColumnMargin: (newMargin: number) => void;
  updateSectionTopMargin: (newMargin: number) => void;
  onLayoutChange: (sections: Section[], pageId: number) => void;
  getSectionsForSelectedPage: () => Section[];
  getSectionsForPageId: (pageId: number) => Section[];
  getSelectedSection: () => Section;
  deletedSectionIds: string[];
  getTruncatedSectionName: () => string;
  fetchComponentLayout: (menuId: number) => void;
  getDishesByColumns: (sectionId: string) => Dish[][];
  setMoreOptions: (sectionId: string, checked: boolean) => void;
  resetSections: () => void;
  setTitleHorizontalSettings: (
    sectionId: string,
    alignLayout: Partial<TitlehorizontalAlignSettings>
  ) => void;
  layoutSelections: SectionLayoutState;
  setLayoutSelection: (
    pageId: string,
    sectionId: string,
    isDish: boolean,
    selection: LayoutSelection
  ) => Promise<void>;
  setLayoutSettings: (sectionId: string, layout: Partial<LayoutSettings>) => void;
  updateSectionLayoutSelected: (
    pageId: string,
    sectionId: string,
    isDish: boolean,
    layoutId: number,
    elementPath: string,
    updateAllSections?: boolean
  ) => Promise<void>;
  getLayoutSelection: (pageId: string, sectionId: string, isDish: boolean) => LayoutSelection;
  findSectionsWithLayout: (isDish: boolean, layoutId: number | null) => SectionWithLayout[];

  updateLayoutForAllSections: (
    sections: SectionWithLayout[],
    isDish: boolean,
    newLayoutId: number,
    elementPath: string
  ) => Promise<void>;
  updateSectionGroupId: (pageId: number, sectionId: string, newId: number) => void;
  updateSectionLayout: (
    pageId: number,
    sectionId: string,
    newLayout: { x?: number; y?: number; w?: number }
  ) => void;
  updateSectionContent: (pageId: number, sectionId: string, name: string, value: any) => void;
};

export const useSectionsStore = create<SectionsStore>((set, get) => ({
  oSections: {},
  dishLayoutBlockId: [],
  sectionTitleLayoutBlockId: [],
  layoutSelections: {},
  titleHorizontalAlignSettings: {},
  layoutSettings: {},
  sectionChangeId: 0,
  incrementSectionChangeId: () => set((state) => ({ sectionChangeId: state.sectionChangeId + 1 })),
  deletedSectionIds: [],
  selectedSection: { pageId: -1, sectionId: "-1" },
  componentLayout: [],
  sectionAddOns: {},
  moreOptions: {},
  setSectionAddOns: (sectionId, checked) => {
    set((state) => ({
      sectionAddOns: {
        ...state.sectionAddOns,
        [sectionId]: { checked },
      },
    }));
  },
  setTitleHorizontalSettings(sectionId, alignLayout) {
    usePageStore
      .getState()
      .updateChangedPageIds(useSectionsStore.getState().selectedSection.pageId);
    set((state) => ({
      titleHorizontalAlignSettings: {
        ...state.titleHorizontalAlignSettings,
        [sectionId]: {
          ...state.titleHorizontalAlignSettings[sectionId],
          ...alignLayout,
        },
      },
    }));
    get().incrementSectionChangeId();
  },
  setMoreOptions: (sectionId, checked) => {
    set((state) => ({
      moreOptions: {
        ...state.moreOptions,
        [sectionId]: {
          checked,
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
    get().incrementSectionChangeId();
  },
  setSelectedSection: ({ pageId, sectionId }) => {
    set({ selectedSection: { pageId, sectionId } });
  },
  setDishLayoutBlockId: (dishLayoutBlockId) => {
    set({ dishLayoutBlockId });
  },

  setSectionTitleLayoutBlockId: (sectionTitleLayoutBlockId) => {
    set({ sectionTitleLayoutBlockId });
  },

  setOSections: (sections) => {
    set((state) => ({
      ...state,
      oSections: { ...state.oSections, ...sections },
    }));
  },
  updateSectionName: (newName) => {
    set((state) => {
      usePageStore.getState().updateChangedPageIds(state.selectedSection.pageId);
      const sections = state.oSections[state.selectedSection.pageId]?.map((section) =>
        section.sectionId === state.selectedSection.sectionId
          ? { ...section, name: newName }
          : section
      );
      return {
        oSections: {
          ...state.oSections,
          [state.selectedSection.pageId]: sections,
        },
      };
    });
    get().incrementSectionChangeId();
  },
  updateSectionContent: (pageId, sectionId, name, value) => {
    usePageStore.getState().updateChangedPageIds(pageId);
    set((state) => {
      const sections = state.oSections[pageId]?.map((section) =>
        section.sectionId === sectionId ? { ...section, [name]: value } : section
      );
      return {
        oSections: {
          ...state.oSections,
          [pageId]: sections,
        },
      };
    });
    get().incrementSectionChangeId();
  },
  updateSectionGroupId: (pageId, sectionId, newId) => {
    set((state) => {
      const sections = state.oSections[pageId]?.map((section) =>
        section.sectionId === sectionId
          ? {
              ...section,
              sectionGroupBlockId: newId,
              sectionPageGroupId: newId,
            }
          : section
      );
      return {
        oSections: {
          ...state.oSections,
          [pageId]: sections,
        },
      };
    });
    get().incrementSectionChangeId();
  },
  addSection: () => {
    set((state) => {
      const { pageId, columns } = usePageStore.getState().getSelectedPage();

      usePageStore.getState().updateChangedPageIds(pageId);
      const newId = uintId();
      const newIdString = JSON.stringify(newId);
      const sectionId = uuidv4();
      const defaultSectionObject = defaultSection(
        newIdString,
        state.dishLayoutBlockId,
        state.sectionTitleLayoutBlockId,
        sectionId
      );
      let maxOrderPosition = -1;
      if (state.oSections[pageId] && state.oSections[pageId].length > 0) {
        for (const section of state.oSections[pageId]) {
          const yBasedOrder = Math.floor(section.dndLayout.y / 5);
          maxOrderPosition = Math.max(maxOrderPosition, yBasedOrder);
        }
      }
      maxOrderPosition++;
      const newSection = {
        ...defaultSectionObject,
        id: newId,
        pageId,
        dndId: newId,
        dndLayout: {
          ...defaultSectionObject.dndLayout,
          y: maxOrderPosition * 5,
          i: sectionId,
          w: columns,
        },
        name: null,
        order_position: maxOrderPosition,
        columnMargin: 0.25,
        isSaved: false,
      };

      useDishesStore.getState().setODishes({
        [sectionId]: defaultSectionObject.dishes || [],
      });

      return {
        oSections: {
          ...state.oSections,
          [pageId]: [...(state.oSections[pageId] || []), newSection],
        },
      };
    });
    get().incrementSectionChangeId();
  },
  removeSection: async (pageId, sectionId) => {
    usePageStore.getState().updateChangedPageIds(pageId);
    await deleteSectionById(sectionId);

    set((state) => {
      const updatedSections = state.oSections[pageId].filter(
        (section) => section.sectionId !== sectionId
      );

      const updatedState = { ...state.oSections };
      if (updatedSections.length > 0) {
        updatedState[pageId] = updatedSections;
      } else {
        delete updatedState[pageId];
      }

      const updatedDishes = { ...useDishesStore.getState().oDishes };
      delete updatedDishes[sectionId];
      useDishesStore.getState().setODishes(updatedDishes);

      return {
        oSections: updatedState,
        deletedSectionIds: state.deletedSectionIds,
      };
    });
    get().incrementSectionChangeId();
  },
  duplicateSection: (pageId, sectionId) => {
    usePageStore.getState().updateChangedPageIds(pageId);
    set((state) => {
      const sections = state.oSections[pageId];
      const newSectionId = uuidv4();
      const sectionToDuplicate = sections.find((section) => section.sectionId === sectionId);

      if (sectionToDuplicate && sectionToDuplicate.sectionGroupBlockId) {
        const previousSectionMetadata = useInitializeEditor
          .getState()
          .cesdkInstance.current?.engine.block.getMetadata(
            sectionToDuplicate.sectionGroupBlockId,
            "sectionId"
          );

        if (previousSectionMetadata && sectionToDuplicate.sectionGroupBlockId) {
          useInitializeEditor
            .getState()
            .cesdkInstance.current?.engine.block.setSelected(
              sectionToDuplicate.sectionGroupBlockId,
              false
            );
        }
      }

      if (!sectionToDuplicate) {
        return state.oSections;
      }

      const newId = uintId();
      delete sectionToDuplicate.sectionPageGroupId;
      delete sectionToDuplicate.sectionGroupBlockId;

      const maxY = sections.reduce((max, section) => {
        return Math.max(max, section.dndLayout.y);
      }, 0);

      const duplicatedSection = {
        ...sectionToDuplicate,
        id: newId,
        dndId: newId,
        name: sectionToDuplicate?.name?.length
          ? `${sectionToDuplicate.name} (Copy)`
          : `${sectionToDuplicate.placeholderName} (Copy)`,
        placeholderName: sectionToDuplicate.placeholderName.length
          ? `${sectionToDuplicate.placeholderName} (Copy)`
          : null,
        dndLayout: {
          ...sectionToDuplicate.dndLayout,
          i: newSectionId,
          y: maxY + 5,
        },
        sectionId: newSectionId,
        sectionUniqueId: newSectionId,
      };

      const dishesToDuplicate = useDishesStore.getState().oDishes[sectionId] || [];
      useDishesStore.getState().setODishes({
        [newSectionId]: dishesToDuplicate.map((dish) => ({
          ...dish,
          id: uintId(),
          frontend_id: uuidv4(),
          section: newSectionId,
        })),
      });

      return {
        oSections: {
          ...state.oSections,
          [pageId]: [...sections, duplicatedSection],
        },
      };
    });

    get().incrementSectionChangeId();
  },
  updateSectionColumnCount: (newColumns: number) => {
    set((state) => {
      const selectedPageId = state.selectedSection.pageId;
      usePageStore.getState().updateChangedPageIds(selectedPageId);
      const selectedSectionId = state.selectedSection.sectionId;

      const updatedSections = state.oSections[selectedPageId].map((section) =>
        section.sectionId === selectedSectionId
          ? {
              ...section,
              columns: newColumns,
            }
          : section
      );

      const dishesStore = useDishesStore.getState();
      const dishes = dishesStore.oDishes[selectedSectionId] || [];

      const sectionTitleDishes = dishes.filter((dish: Dish) => dish.type === "sectionTitle");
      const regularDishes = dishes.filter((dish: Dish) => dish.type !== "sectionTitle");

      const sortedRegularDishes = regularDishes
        .slice()
        .sort((a: Dish, b: Dish) => a.order_position - b.order_position);

      const totalRegularDishes = sortedRegularDishes.length;
      const baseCount = Math.floor(totalRegularDishes / newColumns);
      const remainder = totalRegularDishes % newColumns;

      let currentColumn = 0;
      let dishesInCurrentColumn = 0;

      const updatedRegularDishes = sortedRegularDishes.map((dish: Dish) => {
        if (
          (dishesInCurrentColumn >= baseCount && currentColumn >= remainder) ||
          (dishesInCurrentColumn >= baseCount + 1 && currentColumn < remainder)
        ) {
          currentColumn++;
          dishesInCurrentColumn = 0;
        }

        dishesInCurrentColumn++;
        return {
          ...dish,
          column: currentColumn + 1,
          order_position: dish.order_position,
        };
      });

      const updatedSectionTitleDishes = sectionTitleDishes.map((dish: Dish) => {
        return {
          ...dish,
          column: 1,
          order_position: dish.order_position,
        };
      });

      const updatedDishes = [...updatedSectionTitleDishes, ...updatedRegularDishes];

      dishesStore.setODishes({
        ...dishesStore.oDishes,
        [selectedSectionId]: updatedDishes,
      });

      return {
        oSections: {
          ...state.oSections,
          [selectedPageId]: updatedSections,
        },
      };
    });
    get().incrementSectionChangeId();
  },
  updateSectionColumnMargin: (newMargin) => {
    set((state) => {
      const selectedPageId = state.selectedSection.pageId;
      usePageStore.getState().updateChangedPageIds(selectedPageId);
      const selectedSectionId = state.selectedSection.sectionId;

      const updatedSections = state.oSections[selectedPageId].map((section) =>
        section.sectionId === selectedSectionId ? { ...section, columnMargin: newMargin } : section
      );
      return {
        oSections: {
          ...state.oSections,
          [selectedPageId]: updatedSections,
        },
      };
    });
    get().incrementSectionChangeId();
  },
  updateSectionTopMargin: (newMargin) => {
    set((state) => {
      const selectedPageId = state.selectedSection.pageId;
      usePageStore.getState().updateChangedPageIds(selectedPageId);
      const selectedSectionId = state.selectedSection.sectionId;

      const updatedSections = state.oSections[selectedPageId].map((section) =>
        section.sectionId === selectedSectionId ? { ...section, topMargin: newMargin } : section
      );
      return {
        oSections: {
          ...state.oSections,
          [selectedPageId]: updatedSections,
        },
      };
    });
    get().incrementSectionChangeId();
  },
  updateSectionLayout: (
    pageId: number,
    sectionId: string,
    newLayout: { x?: number; y?: number; w?: number }
  ) => {
    set((state) => {
      usePageStore.getState().updateChangedPageIds(pageId);
      const updatedSections = state.oSections[pageId].map((section) =>
        section.sectionId === sectionId
          ? {
              ...section,
              dndLayout: {
                ...section.dndLayout,
                ...newLayout,
              },
            }
          : section
      );
      return {
        oSections: {
          ...state.oSections,
          [pageId]: updatedSections,
        },
      };
    });
    get().incrementSectionChangeId();
  },
  onLayoutChange: (sections, pageId) => {
    usePageStore.getState().updateChangedPageIds(pageId);
    set((state) => ({
      ...state,
      oSections: {
        ...state.oSections,
        [pageId]: sections,
      },
    }));
    get().incrementSectionChangeId();
  },
  getSectionsForSelectedPage: () => {
    const oSections = get().oSections;
    const sections = oSections[usePageStore.getState().activePageId] || [];
    return sections.slice().sort((a, b) => a.order_position - b.order_position);
  },

  getSectionsForPageId: (pageId: number) => {
    const oSections = get().oSections;
    const sections = oSections[pageId] || [];
    return sections.slice().sort((a, b) => a.order_position - b.order_position);
  },

  getSelectedSection: () => {
    const selectedSection = get().selectedSection;
    const oSections = get().oSections;
    const sections = oSections[selectedSection.pageId] || [];
    return sections.find((section) => section.sectionId === selectedSection.sectionId)!;
  },
  getTruncatedSectionName: () => {
    const { oSections, selectedSection } = get();
    const sections = oSections[selectedSection.pageId] || [];
    const section = sections.find((section) => section.sectionId === selectedSection.sectionId);
    if (section) {
      return section.name !== null
        ? section.name.length > 20
          ? section.name.slice(0, 20) + "..."
          : section.name
        : section.placeholderName.length > 20
        ? section.placeholderName.slice(0, 20) + "..."
        : section.placeholderName;
    }
    return "";
  },
  fetchComponentLayout: async (menuId) => {
    const { data, error } = await supabase.from("ComponentLayout").select("*").eq("menuId", menuId);
    set({ componentLayout: data! });
  },
  getLayoutSelection: (pageId, sectionId, isDish) => {
    const state = get().layoutSelections;
    const defaultSelection = {
      checked: false,
      layoutId: null,
      elementPath: null,
    };

    if (!state[pageId]?.[sectionId]) {
      return defaultSelection;
    }

    return isDish ? state[pageId][sectionId].dishLayout : state[pageId][sectionId].titleLayout;
  },

  setLayoutSelection: async (pageId, sectionId, isDish, selection) => {
    const cesdkInstance = useInitializeEditor.getState().cesdkInstance;
    const { oSections, layoutSelections } = get();

    const section = oSections[pageId]?.find((sec) => sec.sectionId === sectionId);

    if (!section) {
      console.error(`Section not found: ${sectionId}`);
      return;
    }

    const currentLayoutId = isDish ? section.dish_layout : section.title_layout;
    const currentTempLayoutId = isDish ? section.temp_dish_layout : section.temp_title_layout;

    const isLayoutChanging =
      selection.layoutId !== currentLayoutId || selection.layoutId !== currentTempLayoutId;

    if (isLayoutChanging) {
      usePageStore.getState().updateChangedPageIds(parseInt(pageId));
    }

    if (selection.checked && selection.elementPath) {
      try {
        const { data, error } = await supabase.storage
          .from("style_layouts")
          .download(selection.elementPath);

        if (error) throw error;

        const elementString = await data?.text();
        let loadedBlockIds: any[] = [];

        if (elementString?.length) {
          loadedBlockIds = await cesdkInstance.current?.engine.block.loadFromString(elementString);
        }

        if (!Array.isArray(loadedBlockIds) || loadedBlockIds.length === 0) {
          throw new Error("Failed to load block IDs");
        }

        const updatedSections = oSections[pageId].map((sec) =>
          sec.sectionId === sectionId
            ? {
                ...sec,
                [isDish ? "dishLayoutBlockId" : "sectionTitleLayoutBlockId"]: loadedBlockIds,
                [isDish ? "temp_dish_layout" : "temp_title_layout"]: selection.layoutId,
                [isDish ? "dish_layout" : "title_layout"]: selection.layoutId,
              }
            : sec
        );

        const updatedLayoutSelections = {
          ...layoutSelections,
          [pageId]: {
            ...layoutSelections[pageId],
            [sectionId]: {
              ...layoutSelections[pageId]?.[sectionId],
              [isDish ? "dishLayout" : "titleLayout"]: selection,
            },
          },
        };

        set({
          oSections: {
            ...oSections,
            [pageId]: updatedSections,
          },
          layoutSelections: updatedLayoutSelections,
        });
      } catch (error) {
        console.error("Error setting layout selection:", error);
        return;
      }
    } else {
      const isRemovingLayout = currentLayoutId !== null || currentTempLayoutId !== null;

      if (isRemovingLayout) {
        usePageStore.getState().updateChangedPageIds(parseInt(pageId));
      }

      const defaultLayout = await cesdkInstance.current?.engine.block.loadFromString(
        isDish ? design.value : design.title
      );

      const updatedSections = oSections[pageId].map((sec) =>
        sec.sectionId === sectionId
          ? {
              ...sec,
              [isDish ? "dishLayoutBlockId" : "sectionTitleLayoutBlockId"]: defaultLayout,
              [isDish ? "temp_dish_layout" : "temp_title_layout"]: null,
              [isDish ? "dish_layout" : "title_layout"]: null,
              [isDish ? "dishLayout" : "sectionLayout"]: null,
            }
          : sec
      );

      const updatedLayoutSelections = {
        ...layoutSelections,
        [pageId]: {
          ...layoutSelections[pageId],
          [sectionId]: {
            ...layoutSelections[pageId]?.[sectionId],
            [isDish ? "dishLayout" : "titleLayout"]: {
              checked: false,
              layoutId: null,
              elementPath: null,
            },
          },
        },
      };

      set({
        oSections: {
          ...oSections,
          [pageId]: updatedSections,
        },
        layoutSelections: updatedLayoutSelections,
      });
    }

    get().incrementSectionChangeId();
  },

  findSectionsWithLayout: (isDish: boolean, layoutId: number | null) => {
    const { oSections } = get();
    const sectionsWithLayout: SectionWithLayout[] = [];

    Object.entries(oSections).forEach(([pageId, sections]) => {
      sections.forEach((section) => {
        const currentLayoutId = isDish ? section.temp_dish_layout : section.temp_title_layout;

        if (currentLayoutId === layoutId) {
          sectionsWithLayout.push({
            pageId,
            sectionId: section.sectionId,
            currentLayoutId,
          });
        }
      });
    });

    return sectionsWithLayout;
  },

  updateLayoutForAllSections: async (
    sections: SectionWithLayout[],
    isDish: boolean,
    newLayoutId: number,
    elementPath: string
  ) => {
    const cesdkInstance = useInitializeEditor.getState().cesdkInstance;
    const { oSections } = get();

    try {
      const { data, error } = await supabase.storage.from("style_layouts").download(elementPath);

      if (error) throw error;

      const elementString = await data?.text();
      let loadedBlockIds: any[] = [];

      if (elementString?.length) {
        loadedBlockIds = await cesdkInstance.current?.engine.block.loadFromString(elementString);
      }

      if (!Array.isArray(loadedBlockIds) || loadedBlockIds.length === 0) {
        throw new Error("Failed to load block IDs");
      }

      const updatedOSections = { ...oSections };
      const updatedLayoutSelections = { ...get().layoutSelections };

      sections.forEach(({ pageId, sectionId }) => {
        usePageStore.getState().updateChangedPageIds(parseInt(pageId));

        updatedOSections[pageId] = updatedOSections[pageId].map((section) =>
          section.sectionId === sectionId
            ? {
                ...section,
                [isDish ? "dishLayoutBlockId" : "sectionTitleLayoutBlockId"]: loadedBlockIds,
                [isDish ? "temp_dish_layout" : "temp_title_layout"]: newLayoutId,
              }
            : section
        );

        if (!updatedLayoutSelections[pageId]) {
          updatedLayoutSelections[pageId] = {};
        }
        if (!updatedLayoutSelections[pageId][sectionId]) {
          updatedLayoutSelections[pageId][sectionId] = {
            dishLayout: { checked: false, layoutId: null, elementPath: null },
            titleLayout: { checked: false, layoutId: null, elementPath: null },
            inlineTextLayout: { checked: false, layoutId: null, elementPath: null },
          };
        }

        updatedLayoutSelections[pageId][sectionId][isDish ? "dishLayout" : "titleLayout"] = {
          checked: true,
          layoutId: newLayoutId,
          elementPath,
        };
      });

      set({
        oSections: updatedOSections,
        layoutSelections: updatedLayoutSelections,
      });

      get().incrementSectionChangeId();
    } catch (error) {
      console.error("Error updating layouts for sections:", error);
      throw error;
    }
  },

  updateSectionLayoutSelected: async (
    pageId: string,
    sectionId: string,
    isDish: boolean,
    layoutId: number,
    elementPath: string,
    updateAllSections: boolean = true
  ) => {
    try {
      if (updateAllSections) {
        const section = get().oSections[pageId]?.find((sec) => sec.sectionId === sectionId);
        const currentLayoutId = isDish ? section?.temp_dish_layout : section?.temp_title_layout;

        const sectionsToUpdate = get().findSectionsWithLayout(isDish, currentLayoutId!);

        await get().updateLayoutForAllSections(sectionsToUpdate, isDish, layoutId, elementPath);
      } else {
        await get().setLayoutSelection(pageId, sectionId, isDish, {
          checked: true,
          layoutId,
          elementPath,
        });
      }
    } catch (error) {
      console.error("Error in updateSectionLayoutSelected:", error);
      throw error;
    }
  },
  getDishesByColumns: (sectionId: string): Dish[][] => {
    const state = get();
    const section = Object.values(state.oSections)
      .flat()
      .find((sec) => sec.sectionId === sectionId);

    if (!section) {
      console.error(`Section with ID ${sectionId} not found`);
      return [];
    }

    const oDishes = useDishesStore.getState().oDishes;
    const sectionDishes = oDishes[sectionId] || [];

    const titleDish = sectionDishes.find((dish) => dish.type === "sectionTitle");
    const otherDishes = sectionDishes.filter((dish) => dish.type !== "sectionTitle");

    const updateDishes = otherDishes.filter(
      (dish) => !(dish.type === "sectionTitle" && dish.title === null && dish.isEdit === true)
    );

    // Separate regular dishes from inlineSectionDividers
    const regularDishes = updateDishes.filter((dish) => dish.type !== "inlineSectionDivider");
    const dividerDishes = updateDishes.filter((dish) => dish.type === "inlineSectionDivider");

    const processDishes = (dishes: Dish[]) =>
      dishes.map((dish: Dish) => {
        const hasNonNullValues =
          dish.title !== null || dish.description !== null || dish.price !== null;
        const { inlineTextLayoutBlockId: defaultInlineTextId } = useInitializeEditor.getState();
        const title = hasNonNullValues ? dish.title || "" : dish.placeholderTitle;
        const description = hasNonNullValues ? dish.description || "" : dish.placeholderDescription;
        const hasNonNullSecondPrice = dish.secondPrice !== null;
        const price =
          hasNonNullValues || hasNonNullSecondPrice ? dish.price || "" : dish.placeholderPrice;
        const finalSecondPrice = dish.secondPrice;

        // Handle inlineTextLayoutBlockId - ensure it's a single number, not an array
        const inlineTextLayoutId = Array.isArray(dish.inlineTextLayoutBlockId)
          ? dish.inlineTextLayoutBlockId[0] ?? defaultInlineTextId
          : dish.inlineTextLayoutBlockId ?? defaultInlineTextId;

        return {
          ...dish,
          dndLayout: section.dndLayout,
          sectionTitleLayoutBlockId: section.sectionTitleLayoutBlockId,
          dishLayoutBlockId: section.dishLayoutBlockId,
          inlineTextLayoutBlockId: inlineTextLayoutId,
          columns: section.columns,
          titleLayout: section.temp_title_layout,
          dishLayout: dish.temp_dish_layout,
          inlineTextLayout: dish.temp_inlineText_layout,
          title,
          description,
          price,
          secondPrice: finalSecondPrice,
          isSectionTitle: false,
        };
      });

    // Process both regular dishes and divider dishes
    const newRegularDishes = processDishes(regularDishes);
    const newDividerDishes = processDishes(dividerDishes);

    const processedTitleDish = titleDish
      ? {
          ...titleDish,
          dndLayout: section.dndLayout,
          sectionTitleLayoutBlockId: section.sectionTitleLayoutBlockId,
          dishLayoutBlockId: section.dishLayoutBlockId,
          columns: section.columns,
          titleLayout: section.temp_title_layout,
          dishLayout: section.temp_dish_layout,
          title: titleDish.title || section.name || section.placeholderName,
          description: null,
          price: titleDish.price ?? null,
          isSectionTitle: true,
          order_position: 0,
        }
      : null;

    // Combine dishes: title first, then regular dishes, then dividers
    const regularAllDishes = processedTitleDish
      ? [processedTitleDish, ...newRegularDishes]
      : newRegularDishes;

    const numberOfColumns = section.columns;
    const dishesByColumns: Dish[][] = Array.from({ length: numberOfColumns }, () => []);

    // First, distribute regular dishes (including title) to columns
    const sortedRegularDishes = regularAllDishes.sort(
      (a, b) => a.order_position - b.order_position
    );

    sortedRegularDishes.forEach((dish: any) => {
      const columnIndex = Math.min(dish.column - 1, numberOfColumns - 1);
      dishesByColumns[columnIndex].push(dish);
    });

    // Then, add divider dishes to the end of the column with the most dishes
    if (newDividerDishes.length > 0) {
      // Find the column with the most dishes
      let maxIndex = 0;
      let maxLength = dishesByColumns[0].length;
      for (let i = 1; i < dishesByColumns.length; i++) {
        if (dishesByColumns[i].length > maxLength) {
          maxLength = dishesByColumns[i].length;
          maxIndex = i;
        }
      }

      const targetColumn = maxIndex + 1; // 1-indexed column

      // Sort divider dishes by order_position and update their column property
      const sortedDividerDishes = newDividerDishes
        .sort((a, b) => a.order_position - b.order_position)
        .map((dish) => ({
          ...dish,
          column: targetColumn, // Update column to match target column (1-indexed)
        }));

      // Update the actual store state for dividers that changed columns
      const dishesToUpdate = dividerDishes.filter((dish) => dish.column !== targetColumn);
      if (dishesToUpdate.length > 0) {
        useDishesStore.getState().updateSectionDishes(
          oDishes[sectionId].map((dish) => {
            if (
              dish.type === "inlineSectionDivider" &&
              dishesToUpdate.some((d) => d.id === dish.id)
            ) {
              return { ...dish, column: targetColumn };
            }
            return dish;
          })
        );
      }

      dishesByColumns[maxIndex].push(...sortedDividerDishes);
    }

    return dishesByColumns;
  },
  resetSections: () => {
    set({
      oSections: {},
      dishLayoutBlockId: [],
      sectionTitleLayoutBlockId: [],
      deletedSectionIds: [],
      selectedSection: { pageId: -1, sectionId: "-1" },
      sectionChangeId: 0,
    });
  },
}));
