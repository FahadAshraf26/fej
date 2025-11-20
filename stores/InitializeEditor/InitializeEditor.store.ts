import { create } from "zustand";
import { MutableRefObject } from "react";
import { supabase } from "@database/client.connection";
import { IUserDetails } from "@Interfaces/";
import { enforceSinglePanelOpen } from "@Utils/panelVisibility";

type InitializeEditor = {
  dietaryIcons: { value: string; label: string }[];
  libraryElements: any;
  libraryLoading: boolean;
  fonts: any[];
  isContentOpen: boolean;
  isLayoutOpen: boolean;
  isStyleOpen: boolean;
  isInlineText: boolean;
  loadingEditor: boolean;
  templateModal: boolean;
  content: string;
  isPreviewLink: boolean;
  previewLink: string;
  embedCode: string;
  cesdkContainer: MutableRefObject<HTMLDivElement | null>;
  cesdkInstance: MutableRefObject<any>;
  isFlapjackUser: boolean;
  isAllLayoutModal: boolean;
  isDish: boolean;
  isSection: boolean;
  modalCesdkInstance: MutableRefObject<any>;
  showEngineModal: boolean;
  sceneUrl: string;
  template: any;
  user: IUserDetails;
  isDefault: boolean;
  editElement: string;
  layoutId: number;
  restaurantList: any[];
  isSaving: boolean;
  isNonAutoSaving: boolean;
  activityChangeId: number;
  canvasLoader: boolean;
  isInitializeEditor: boolean;
  restaurantOptions: Array<any>;
  isApplyMenu: number;
  isMenuUpdateModalOpen: boolean;
  templateVersions: Array<any>;
  selectedDishIdForLayout: number | null;
  inlineTextLayoutBlockId: Array<number>;
  setSelectedDishIdForLayout: (id: number | null) => void;
  setInlineTextLayoutBlockId: (inlineTextLayoutBlockId: number[]) => void;
  setTemplateVersions: (versions: any) => void;
  setDietaryIcons: (icons: { value: string; label: string }[]) => void;
  setIsMenuUpdatedModalOpen: (isMenuUpdateModalOpen: boolean) => void;
  setIsApplyMenu: () => void;
  setRestaurantOptions: (restaurantOptions: Array<any>) => void;
  setIsInitializeEditor: (value: boolean) => void;
  setCanvasLoader: (value: boolean) => void;
  incrementActivityChangeId: () => void;
  setIsSaving: (value: boolean) => void;
  setIsNonAutoSaving: (value: boolean) => void;
  setRestaurantList: (restaurantList: any[]) => void;
  setUserData: (user: IUserDetails) => void;
  setlibraryElements: (elements: any[]) => void;
  setlibraryLoading: (libraryLoading: boolean) => void;
  setFonts: (fonts: any[]) => void;
  setIsContentOpen: () => void;
  setLoadingEditor: (loadingEditor: boolean) => void;
  setTemplateModal: (templateModal: boolean) => void;
  setContent: (content: string) => void;
  setIsLayoutOpen: () => void;
  setIsStyleOpen: () => void;
  setIsPreviewLink: (value: boolean) => void;
  setPreviewLink: (value: string) => void;
  setEmbedCode: (value: string) => void;
  setIsAllLayoutModal: () => void;
  setLayoutModal: (isDish: boolean, isSection: boolean, isInlineText: boolean) => void;
  setShowEngineModal: (
    isDefault?: boolean,
    content?: string,
    editElement?: string,
    layoutId?: number
  ) => void;
  fetchDietaryIconOptions: (menuId: string | undefined) => void;
  fetchDefaultLayoutTemplate: (menuId: number) => void;
  resetInitialzeEditor: () => void;
  resetActivityId: () => void;
  restLayoutId: () => void;
};

export const useInitializeEditor = create<InitializeEditor>((set, get) => ({
  dietaryIcons: [],
  libraryElements: "",
  libraryLoading: false,
  fonts: [],
  template: {},
  isContentOpen: false,
  isLayoutOpen: false,
  isStyleOpen: false,
  isInlineText: false,
  loadingEditor: true,
  templateModal: false,
  content: "",
  isPreviewLink: false,
  previewLink: "",
  embedCode: "",
  cesdkContainer: { current: null },
  cesdkInstance: { current: null },
  modalCesdkInstance: { current: null },
  isFlapjackUser: false,
  isAllLayoutModal: false,
  isDish: false,
  isSection: false,
  showEngineModal: false,
  sceneUrl: "",
  user: {
    subscriptionActive: false,
    subscriptionExpiry: "",
    role: "",
    restaurant_id: "",
    restaurant: {},
    id: "",
    app_metadata: {},
    user_metadata: {},
    aud: "",
    created_at: "",
    showMenuChange: false,
    customer_name: "",
  },
  isDefault: false,
  editElement: "",
  layoutId: 0,
  restaurantList: [],
  isSaving: false,
  isNonAutoSaving: false,
  activityChangeId: 0,
  canvasLoader: false,
  isInitializeEditor: true,
  restaurantOptions: [],
  isApplyMenu: 0,
  isMenuUpdateModalOpen: false,
  templateVersions: [],
  selectedDishIdForLayout: null,
  inlineTextLayoutBlockId: [],
  setSelectedDishIdForLayout: (id) => set({ selectedDishIdForLayout: id }),
  setInlineTextLayoutBlockId: (inlineTextLayoutBlockId) => set({ inlineTextLayoutBlockId }),
  setTemplateVersions: (versions) => {
    set({ templateVersions: versions });
  },
  setDietaryIcons: (icons: { value: string; label: string }[]) => set({ dietaryIcons: icons }),
  setIsMenuUpdatedModalOpen: (isMenuUpdateModalOpen) => {
    set({ isMenuUpdateModalOpen });
  },
  setIsApplyMenu: () => {
    set((state) => ({ isApplyMenu: state.isApplyMenu + 1 }));
  },
  setRestaurantOptions: (restaurantOptions) => {
    set({ restaurantOptions });
  },
  setIsInitializeEditor: (isInitializeEditor) => {
    set({ isInitializeEditor });
  },
  setCanvasLoader: (value) => {
    set({ canvasLoader: value });
  },
  incrementActivityChangeId: () => {
    set((state) => ({ activityChangeId: state.activityChangeId + 1 }));
  },
  setIsSaving: (isSaving) => {
    set({ isSaving });
  },
  setIsNonAutoSaving: (isNonAutoSaving) => {
    set({ isNonAutoSaving });
  },
  setRestaurantList: (restaurantList) => {
    set({ restaurantList });
  },
  setlibraryElements: (elements) => set({ libraryElements: elements }),
  setlibraryLoading: (libraryLoading) => set((state) => ({ libraryLoading })),
  setFonts: (fonts) => set({ fonts }),
  setIsContentOpen: () => {
    set((state) => {
      const newOpen = !state.isContentOpen;
      if (newOpen && get().cesdkInstance.current) {
        enforceSinglePanelOpen('custom', get().cesdkInstance.current.ui);
      }
      return {
        isContentOpen: newOpen,
        isLayoutOpen: false,
        isStyleOpen: false,
      };
    });
  },
  setIsLayoutOpen: () => {
    set((state) => {
      const newOpen = !state.isLayoutOpen;
      if (newOpen && get().cesdkInstance.current) {
        enforceSinglePanelOpen('custom', get().cesdkInstance.current.ui);
      }
      return {
        isLayoutOpen: newOpen,
        isContentOpen: false,
        isStyleOpen: false,
      };
    });
  },
  setIsStyleOpen: () => {
    set((state) => {
      const newOpen = !state.isStyleOpen;
      if (newOpen && get().cesdkInstance.current) {
        enforceSinglePanelOpen('custom', get().cesdkInstance.current.ui);
      }
      return {
        isStyleOpen: newOpen,
        isLayoutOpen: false,
        isContentOpen: false,
      };
    });
  },
  setLoadingEditor: (loadingEditor) => set({ loadingEditor }),
  setTemplateModal: (templateModal) => set({ templateModal }),
  setContent: (content) => set({ content }),
  setIsPreviewLink: (value) => set({ isPreviewLink: value }),
  setPreviewLink: (value) => set({ previewLink: value }),
  setEmbedCode: (value) => set({ embedCode: value }),
  setIsAllLayoutModal: () => {
    set((state) => ({
      isAllLayoutModal: !state.isAllLayoutModal,
    }));
  },
  setLayoutModal: (isDish: boolean, isSection: boolean, isInlineText: boolean) =>
    set((state) => ({
      isAllLayoutModal: !state.isAllLayoutModal,
      isDish,
      isSection,
      isInlineText,
    })),
  setShowEngineModal: (isDefault, content, element, layoutId) => {
    set((state) => {
      const newState = {
        showEngineModal: !state.showEngineModal,
        isDefault,
      } as {
        showEngineModal: boolean;
        isDefault: boolean | undefined;
        sceneUrl?: string;
        editElement?: any;
        layoutId?: number;
      };

      if (isDefault) {
        newState.sceneUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL +
          `/storage/v1/object/public/templates/${content}?t=${new Date().toISOString()}`;
      }

      if (element) {
        const editElementUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL +
          `/storage/v1/object/public/style_layouts/${element}?t=${new Date().toISOString()}`;
        newState.editElement = editElementUrl;
        newState.layoutId = layoutId;
      }

      return newState;
    });
  },
  fetchDefaultLayoutTemplate: async (menuId: number) => {
    const { data } = await supabase.from("templates").select("*").eq("id", menuId);
    set({ template: data });
  },
  fetchDietaryIconOptions: async (restaurant_id: string | undefined) => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("dietaryIcons")
        .eq("id", restaurant_id)
        .single();

      if (error) {
        throw new Error(`Error fetching dietary icons: ${error.message}`);
      }

      if (data && data.dietaryIcons) {
        set({ dietaryIcons: data.dietaryIcons });
      } else {
        console.warn("No dietary icons found for this restaurant.");
      }
    } catch (err: any) {
      console.error(err.message);
    }
  },
  setUserData: (user) => {
    set({ user });
  },

  resetActivityId: () => {
    set({
      activityChangeId: 0,
    });
  },
  resetInitialzeEditor: () => {
    set({
      dietaryIcons: [],
      libraryElements: "",
      libraryLoading: false,
      fonts: [],
      template: {},
      isContentOpen: false,
      isLayoutOpen: false,
      isStyleOpen: false,
      isInlineText: false,
      loadingEditor: true,
      templateModal: false,
      content: "",
      isPreviewLink: false,
      previewLink: "",
      embedCode: "",
      cesdkContainer: { current: null },
      cesdkInstance: { current: null },
      modalCesdkInstance: { current: null },
      isAllLayoutModal: false,
      isDish: false,
      isSection: false,
      showEngineModal: false,
      sceneUrl: "",
      user: {
        subscriptionActive: false,
        subscriptionExpiry: "",
        role: "",
        restaurant_id: "",
        restaurant: {},
        id: "",
        app_metadata: {},
        user_metadata: {},
        aud: "",
        created_at: "",
        showMenuChange: false,
        customer_name: "",
      },
      isDefault: false,
      editElement: "",
      layoutId: 0,
      restaurantList: [],
      isSaving: false,
      activityChangeId: 0,
      canvasLoader: false,
      isInitializeEditor: true,
      restaurantOptions: [],
      isApplyMenu: 0,
      isMenuUpdateModalOpen: false,
      selectedDishIdForLayout: null, // ADDED
    });
  },
  restLayoutId: () => {
    set({
      layoutId: 0,
    });
  },
}));
