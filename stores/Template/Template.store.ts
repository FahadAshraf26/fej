import { supabase } from "@database/client.connection";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { templateActions } from "../../components/TemplateGallery/actions/template.actions";
import { restaurantActions } from "../../components/TemplateGallery/actions/restaurant.actions";
import { IRestaurantDetail, ITemplateDetails } from "@Interfaces/*";
import _ from "lodash";
import { APP_CONFIG } from "@Contants/app";

interface TemplateState {
  autoLayoutStatus: Record<string, boolean>;
  initializeTemplateLayout: (templates: any[]) => void;
  persistLayoutStatus: (templateId: string, isAutoLayout: boolean) => Promise<void>;
  toggleAutoLayout: (templateId: string, isAutoLayout: boolean) => void;
}
// Define UI state
interface TemplatePage {
  activeTab: string;
  currentTemplate?: ITemplateDetails;
  deleteModalState: {
    isOpen: boolean;
    restaurantId: string | null;
    restaurantName: string | null;
    menuCount: number | null;
    userCount: number | null;
  };
  groupedMenus: Record<string, ITemplateDetails[]>;
  hasMenus: boolean;
  loading: boolean;
  loadingMenus: { [key: string]: boolean };
  modalState: {
    isOpen: boolean;
    type: string;
  };
  openAccordionTab: string;
  search: string;
  statusFilter: string[];
  userInput: string;
  visibleCards: { [key: string]: boolean };
}

// Define data state
interface TemplateData {
  cachedTemplates: Record<string, ITemplateDetails[]>;
  filteredRestaurants: IRestaurantDetail[];
  globalTemplates: ITemplateDetails[];
  groupedMenus: Record<string, ITemplateDetails[]>;
  restaurantOptions: IRestaurantDetail[];
  templates: ITemplateDetails[];
  thumbnailTimestamps: Record<number, number>;
  validThumbnails: Record<number, boolean>;
  page: number;
  pageSize: number;
  hasMoreGlobalTemplates: boolean;
  isLoadingGlobalTemplates: boolean;
}

// Define API operations
interface TemplateOperations {
  deleteRestaurant: (restaurantId: string) => Promise<void>;
  deleteTemplate: (template: ITemplateDetails, userId: string) => Promise<void>;
  duplicateTemplate: (
    id: number,
    name: string,
    description: string,
    userId: string
  ) => Promise<ITemplateDetails>;
  fetchGlobalTemplates: () => Promise<ITemplateDetails[]>;
  fetchRestaurants: (user: any) => Promise<IRestaurantDetail[]>;
  fetchTemplatesByRestaurantId: (restaurantId: string) => Promise<ITemplateDetails[]>;
  getRestaurantLocations: (restaurantId: string) => Promise<any[]>;
  getRestaurantStats: (restaurantId: string) => Promise<{ menuCount: number; userCount: number }>;
  initializeData: (user: any) => Promise<void>;
  renameTemplate: (id: number, name: string, description: string) => Promise<void>;
  toggleGlobalTemplate: (template: ITemplateDetails, userId: string) => Promise<void>;
  transferTemplate: (templateId: number, restaurantId: string, locationId: string) => Promise<void>;
  updateAutoLayoutStatus: (templateId: number, isAutoLayout: boolean) => Promise<void>;
  updateTemplateLocation: (templateId: number, locationId: string) => Promise<void>;
  updateTemplatePublishedStatus: (templateId: number, isPublished: boolean) => Promise<void>;
  uploadCoverImage: (templateId: number, imageFile: File) => Promise<string>;
}

// Define UI actions
interface TemplateStoreActions {
  addTemplate: (template: ITemplateDetails) => void;
  addTemplateToState: (newTemplate: ITemplateDetails) => Promise<void>;
  addToCachedTemplates: (restaurantId: string, templates: ITemplateDetails[]) => void;
  closeDeleteModal: () => void;
  filterRestaurants: (search: string, statusFilter?: string[]) => void;
  invalidateRestaurantCache: (restaurantId: string) => void;
  refreshTemplatesForRestaurant: (restaurantId: string) => Promise<void>;
  removeTemplate: (templateId: number) => void;
  removeTemplateFromCache: (restaurantId: string, templateId: number) => void;
  removeTemplateFromState: (template: ITemplateDetails) => Promise<void>;
  setActiveTab: (tab: string) => void;
  setCurrentTemplate: (template?: ITemplateDetails) => void;
  setDeleteModalState: (state: {
    isOpen: boolean;
    restaurantId: string | null;
    restaurantName: string | null;
    menuCount: number | null;
    userCount: number | null;
  }) => void;
  setGlobalTemplates: (templates: ITemplateDetails[]) => void;
  setGroupedMenus: (grouped: Record<string, ITemplateDetails[]>) => void;
  setHasMenus: (hasMenus: boolean) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMenus: (restaurantId: string, isLoading: boolean) => void;
  setModalState: (isOpen: boolean, type: string) => void;
  setOpenAccordionTab: (tab: string) => void;
  setRestaurantOptions: (options: IRestaurantDetail[]) => void;
  setSearch: (search: string) => void;
  setStatusFilter: (statusFilter: string[]) => void;
  setTemplates: (templates: ITemplateDetails[]) => void;
  setUserInput: (input: string) => void;
  setVisibleCards: (restaurantId: string, isVisible: boolean) => void;
  updateGroupedMenus: (templates: ITemplateDetails[]) => void;
  updateTemplate: (updatedTemplate: ITemplateDetails) => void;
  updateTemplateInState: (updatedTemplate: ITemplateDetails) => Promise<void>;
  refreshThumbnail: (templateId: number) => void;
  getThumbnailUrl: (templateId: number) => string | null;
  markThumbnailInvalid: (templateId: number) => void;
  markThumbnailValid: (templateId: number) => void;
}

// Combined store type
type TemplateStore = TemplatePage &
  TemplateData &
  TemplateOperations &
  TemplateStoreActions &
  TemplateState;

// Create the store
export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      // UI state - sorted alphabetically
      activeTab:
        typeof window !== "undefined" ? localStorage.getItem("activeTab") || "myMenu" : "myMenu",
      currentTemplate: undefined,
      deleteModalState: {
        isOpen: false,
        restaurantId: null,
        restaurantName: null,
        menuCount: null,
        userCount: null,
      },
      groupedMenus: {},
      hasMenus: false,
      loading: true,
      loadingMenus: {},
      modalState: {
        isOpen: false,
        type: "",
      },
      openAccordionTab: "",
      search: "",
      statusFilter: [],
      userInput: "",
      visibleCards: {},

      // Data - sorted alphabetically
      autoLayoutStatus: {},
      cachedTemplates: {},
      filteredRestaurants: [],
      globalTemplates: [],
      restaurantOptions: [],
      templates: [],
      thumbnailTimestamps: {},
      validThumbnails: {},

      // Pagination
      page: 0,
      pageSize: 15,
      hasMoreGlobalTemplates: true,
      isLoadingGlobalTemplates: false,

      // UI Actions - sorted alphabetically
      addTemplate: (template) => {
        set((state) => ({
          templates: [...state.templates, template],
        }));

        // Update grouped menus
        get().updateGroupedMenus([...get().templates, template]);
      },

      addTemplateToState: async (newTemplate) => {
        // 1. Add the template to the templates array
        get().addTemplate(newTemplate);

        // 2. Add the template to the cache if the restaurant exists
        if (newTemplate.restaurant_id) {
          const cachedTemplates = get().cachedTemplates[newTemplate.restaurant_id] || [];
          get().addToCachedTemplates(newTemplate.restaurant_id, [...cachedTemplates, newTemplate]);
        }

        // 3. Grouped menus are already updated in addTemplate
      },

      addToCachedTemplates: (restaurantId, templates) => {
        set((state) => ({
          cachedTemplates: {
            ...state.cachedTemplates,
            [restaurantId]: templates,
          },
        }));
      },

      closeDeleteModal: () =>
        set({
          deleteModalState: {
            isOpen: false,
            restaurantId: null,
            restaurantName: null,
            menuCount: null,
            userCount: null,
          },
          userInput: "",
        }),

      filterRestaurants: (search, statusFilter) => {
        const { restaurantOptions } = get();
        const currentStatusFilter = statusFilter || get().statusFilter;

        let filtered = restaurantOptions;

        // First, filter out restaurants with invalid JSON status only
        filtered = filtered.filter((restaurant) => {
          const subscriptionStatusString = restaurant.subscriptionStatus;

          // Exclude restaurants with no subscription status
          if (!subscriptionStatusString) {
            return false;
          }

          // Check if it's a valid JSON
          try {
            JSON.parse(subscriptionStatusString);
            return true;
          } catch (error) {
            // Exclude restaurants with invalid JSON status
            return false;
          }
        });

        // Hide restaurants with unknown status or "{}" unless unknown filter is selected
        if (!currentStatusFilter || !currentStatusFilter.includes("unknown")) {
          filtered = filtered.filter((restaurant) => {
            const subscriptionStatusString = restaurant.subscriptionStatus;

            // Skip restaurants with no subscription status
            if (!subscriptionStatusString) {
              return false;
            }

            let subscriptionStatus;

            try {
              subscriptionStatus = JSON.parse(subscriptionStatusString);
            } catch (error) {
              return false;
            }

            // Hide restaurants with empty status object "{}"
            if (
              !subscriptionStatus ||
              Object.keys(subscriptionStatus).length === 0 ||
              subscriptionStatusString === "{}"
            ) {
              return false;
            }

            const statuses = [];

            if (subscriptionStatus.Editor) {
              statuses.push(subscriptionStatus.Editor.toLowerCase());
            }

            if (subscriptionStatus.Design) {
              statuses.push(subscriptionStatus.Design.toLowerCase());
            }

            // Hide restaurants with no valid statuses
            if (statuses.length === 0) {
              return false;
            }

            return true;
          });
        }

        // Apply search filter
        if (search) {
          filtered = filtered.filter((restaurant) =>
            restaurant.label?.toLowerCase().includes(search.toLowerCase())
          );
        }

        // Apply status filter
        if (
          currentStatusFilter &&
          currentStatusFilter.length > 0 &&
          !currentStatusFilter.includes("all")
        ) {
          filtered = filtered.filter((restaurant) => {
            const subscriptionStatusString = restaurant.subscriptionStatus;

            // This should be safe since we already filtered out undefined/null values above
            if (!subscriptionStatusString) {
              return currentStatusFilter.includes("unknown");
            }

            let subscriptionStatus;

            try {
              subscriptionStatus = JSON.parse(subscriptionStatusString);
            } catch (error) {
              return currentStatusFilter.includes("unknown");
            }

            // If unknown filter is selected, show restaurants with empty/unknown status
            if (currentStatusFilter.includes("unknown")) {
              if (
                !subscriptionStatus ||
                Object.keys(subscriptionStatus).length === 0 ||
                subscriptionStatusString === "{}"
              ) {
                return true;
              }

              const statuses = [];

              if (subscriptionStatus.Editor) {
                statuses.push(subscriptionStatus.Editor.toLowerCase());
              }

              if (subscriptionStatus.Design) {
                statuses.push(subscriptionStatus.Design.toLowerCase());
              }

              if (statuses.length === 0) {
                return true;
              }
            }

            // For other filters, check specific statuses
            const statuses = [];

            if (subscriptionStatus.Editor) {
              statuses.push(subscriptionStatus.Editor.toLowerCase());
            }

            if (subscriptionStatus.Design) {
              statuses.push(subscriptionStatus.Design.toLowerCase());
            }

            return statuses.some((status) => currentStatusFilter.includes(status));
          });
        }

        set({ filteredRestaurants: filtered });
      },
      initializeTemplateLayout: (templates) => {
        const layoutStatus = templates.reduce(
          (acc, template) => ({
            ...acc,
            [template.id]: template.isAutoLayout ?? true,
          }),
          {}
        );

        set({ autoLayoutStatus: layoutStatus });
      },

      persistLayoutStatus: async (templateId, isAutoLayout) => {
        const { error } = await supabase
          .from("templates")
          .update({ isAutoLayout: isAutoLayout })
          .eq("id", Number(templateId));

        if (error) throw error;
      },

      refreshTemplatesForRestaurant: async (restaurantId) => {
        if (!restaurantId) return;

        const updatedTemplates = await get().fetchTemplatesByRestaurantId(restaurantId);
        get().setTemplates(updatedTemplates);
      },

      removeTemplate: (templateId) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== templateId),
          globalTemplates: state.globalTemplates.filter((t) => t.id !== templateId),
        }));

        // Update grouped menus
        get().updateGroupedMenus(get().templates);
      },

      removeTemplateFromCache: (restaurantId, templateId) => {
        set((state) => {
          const cachedForRestaurant = state.cachedTemplates[restaurantId];
          if (!cachedForRestaurant) return state;

          return {
            cachedTemplates: {
              ...state.cachedTemplates,
              [restaurantId]: cachedForRestaurant.filter((template) => template.id !== templateId),
            },
          };
        });
      },

      removeTemplateFromState: async (template) => {
        // 1. Remove the template from the templates array
        get().removeTemplate(template.id);

        // 2. Remove the template from the cache if it exists
        if (template.restaurant_id) {
          get().removeTemplateFromCache(template.restaurant_id, template.id);
        }

        // 3. Grouped menus are already updated in removeTemplate
      },

      setActiveTab: (tab) => {
        localStorage.setItem("activeTab", tab);
        set({ activeTab: tab });
      },

      setCurrentTemplate: (template) => set({ currentTemplate: template }),

      setDeleteModalState: (state) =>
        set({
          deleteModalState: state,
        }),

      setGlobalTemplates: (templates) => set({ globalTemplates: templates }),

      setGroupedMenus: (grouped: Record<string, ITemplateDetails[]>) =>
        set({ groupedMenus: grouped }),

      setHasMenus: (hasMenus: boolean) => set({ hasMenus }),

      setLoading: (loading) => set({ loading }),

      setLoadingMenus: (restaurantId: string, isLoading: boolean) =>
        set((state) => ({
          loadingMenus: {
            ...state.loadingMenus,
            [restaurantId]: isLoading,
          },
        })),

      setModalState: (isOpen, type) =>
        set({
          modalState: { isOpen, type },
        }),

      setOpenAccordionTab: (tab) => set({ openAccordionTab: tab }),

      setRestaurantOptions: (options) => {
        set({
          restaurantOptions: options,
        });
        // Apply current filters to the new options
        get().filterRestaurants(get().search, get().statusFilter);
      },

      setSearch: (search) => {
        set({ search });
        get().filterRestaurants(search);
      },

      setStatusFilter: (statusFilter: string[]) => {
        set({ statusFilter });
        get().filterRestaurants(get().search, statusFilter);
      },

      setTemplates: (templates) => {
        set({ templates });
        get().updateGroupedMenus(templates);
      },

      setUserInput: (input) => set({ userInput: input }),

      setVisibleCards: (restaurantId: string, isVisible: boolean) =>
        set((state) => ({
          visibleCards: {
            ...state.visibleCards,
            [restaurantId]: isVisible,
          },
        })),

      toggleAutoLayout: (templateId, isAutoLayout) => {
        set((state) => ({
          autoLayoutStatus: {
            ...state.autoLayoutStatus,
            [templateId]: isAutoLayout,
          },
        }));
      },

      updateGroupedMenus: (templates) => {
        const groupedMenus: any = _.groupBy(templates, (menu) =>
          _.get(menu, "locationInformation.name", "No Location")
        );
        const sortedGroupedMenus: any = Object.fromEntries(
          Object.entries(groupedMenus).sort(([locationA], [locationB]) => {
            // DEFAULT_LOCATION should always be last
            if (locationA === APP_CONFIG.LOCATION.DEFAULT) return 1;
            if (locationB === APP_CONFIG.LOCATION.DEFAULT) return -1;

            // For all other locations, sort alphabetically
            return locationA.localeCompare(locationB);
          })
        );

        // Check if we have any menus and set hasMenus accordingly
        const hasAnyMenus = _.some(sortedGroupedMenus, (menus) => menus.length > 0);

        set({
          groupedMenus: sortedGroupedMenus,
          hasMenus: hasAnyMenus,
        });
      },

      updateTemplate: (updatedTemplate) => {
        set((state) => {
          // Update in templates array
          const updatedTemplates = state.templates.map((t) =>
            t.id === updatedTemplate.id ? updatedTemplate : t
          );

          // Update in global templates array
          const updatedGlobalTemplates = state.globalTemplates.map((t) =>
            t.id === updatedTemplate.id ? updatedTemplate : t
          );

          return {
            templates: updatedTemplates,
            globalTemplates: updatedGlobalTemplates,
          };
        });

        // Update grouped menus
        get().updateGroupedMenus(get().templates);
      },

      updateTemplateInState: async (updatedTemplate) => {
        // 1. Update the template in the templates array
        get().updateTemplate(updatedTemplate);

        // 2. Update the template in the cache if it exists
        if (updatedTemplate.restaurant_id) {
          const cachedTemplates = get().cachedTemplates[updatedTemplate.restaurant_id];
          if (cachedTemplates) {
            const updatedCache = cachedTemplates.map((t) =>
              t.id === updatedTemplate.id ? updatedTemplate : t
            );
            get().addToCachedTemplates(updatedTemplate.restaurant_id, updatedCache);
          }
        }

        // 3. Grouped menus are already updated in updateTemplate
      },

      // API Operations - sorted alphabetically
      deleteRestaurant: async (restaurantId) => {
        try {
          await restaurantActions.deleteRestaurant(restaurantId);

          // Update restaurant options
          set((state) => ({
            restaurantOptions: state.restaurantOptions.filter((r) => r.value !== restaurantId),
            filteredRestaurants: state.filteredRestaurants.filter((r) => r.value !== restaurantId),
          }));

          // Remove from cache
          set((state) => {
            const { [restaurantId]: _, ...restCache } = state.cachedTemplates;
            return { cachedTemplates: restCache };
          });
        } catch (error) {
          console.error("Error deleting restaurant:", error);
          throw error;
        }
      },

      deleteTemplate: async (template, userId) => {
        try {
          await templateActions.deleteTemplate(template.id, userId);

          // Remove from state using helper
          await get().removeTemplateFromState(template);

          // Refresh templates for the restaurant if needed
          if (template.restaurant_id) {
            await get().refreshTemplatesForRestaurant(template.restaurant_id);
          }
        } catch (error) {
          console.error("Error deleting template:", error);
          throw error;
        }
      },

      duplicateTemplate: async (id, name, description, userId) => {
        try {
          const duplicatedTemplate = await templateActions.duplicateTemplate(
            id,
            name,
            description,
            userId
          );

          // Add to state using helper
          await get().addTemplateToState(duplicatedTemplate);

          // Refresh templates for the restaurant if needed
          if (duplicatedTemplate.restaurant_id) {
            await get().refreshTemplatesForRestaurant(duplicatedTemplate.restaurant_id);
          }

          return duplicatedTemplate;
        } catch (error) {
          console.error("Error duplicating template:", error);
          throw error;
        }
      },

      fetchGlobalTemplates: async () => {
        try {
          set({ isLoadingGlobalTemplates: true });
          const { globalTemplates, page, pageSize } = get();

          const fetchedTemplates = await templateActions.getByRestaurantId("2", page, pageSize);

          // Sort by most recently updated
          fetchedTemplates.sort(
            (a, b) =>
              new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime()
          );

          // Append to existing templates
          const updatedTemplates = [...globalTemplates, ...fetchedTemplates];

          // Disable load more if fetched less than pageSize
          const hasMore = fetchedTemplates.length === pageSize;

          set({
            globalTemplates: updatedTemplates,
            page: page + 1,
            hasMoreGlobalTemplates: hasMore,
          });

          return fetchedTemplates;
        } catch (error) {
          console.error("Error fetching global templates:", error);
          throw error;
        } finally {
          set({ isLoadingGlobalTemplates: false });
        }
      },

      fetchRestaurants: async (user) => {
        try {
          const restaurants = await restaurantActions.getRestaurants(user);
          get().setRestaurantOptions(restaurants);
          return restaurants;
        } catch (error) {
          console.error("Error fetching restaurants:", error);
          throw error;
        }
      },

      fetchTemplatesByRestaurantId: async (restaurantId) => {
        try {
          const { cachedTemplates } = get();

          // Check if we have cached data
          if (cachedTemplates[restaurantId]) {
            return cachedTemplates[restaurantId];
          }

          const templates = await templateActions.getByRestaurantId(restaurantId);

          // Cache the results
          get().addToCachedTemplates(restaurantId, templates);

          return templates;
        } catch (error) {
          console.error("Error fetching templates:", error);
          throw error;
        }
      },

      getRestaurantLocations: async (restaurantId) => {
        try {
          return await restaurantActions.getRestaurantLocations(restaurantId);
        } catch (error) {
          console.error("Error fetching restaurant locations:", error);
          throw error;
        }
      },

      getRestaurantStats: async (restaurantId) => {
        try {
          return await restaurantActions.getRestaurantStats(restaurantId);
        } catch (error) {
          console.error("Error getting restaurant stats:", error);
          throw error;
        }
      },

      initializeData: async (user) => {
        if (!user) return;

        try {
          set({ search: "" }); // Reset search state
          const templates = await get().fetchTemplatesByRestaurantId(user.restaurant_id);
          get().setTemplates(templates);
          // Fetch restaurant options for all users
          await get().fetchRestaurants(user);

          // Complete loading
          get().setLoading(false);
        } catch (error) {
          console.error("Error initializing data:", error);
          get().setLoading(false);
        }
      },

      renameTemplate: async (id, name, description) => {
        try {
          // Call the API to update the template on the server
          await templateActions.renameTemplate(id, name, description);

          // Update template in state
          const template = get().templates.find((t) => t.id === id);
          if (template) {
            const updatedTemplate = {
              ...template,
              name,
              description,
            };

            // Update state using helper
            await get().updateTemplateInState(updatedTemplate);
          }
        } catch (error) {
          console.error("Error renaming template:", error);
          throw error;
        }
      },

      toggleGlobalTemplate: async (template, userId) => {
        try {
          await templateActions.toggleGlobalTemplate(template.id, userId);

          // Update template in state
          const updatedTemplate = {
            ...template,
            isGlobal: !template.isGlobal,
          };

          // Update state using helper
          await get().updateTemplateInState(updatedTemplate);
        } catch (error) {
          console.error("Error toggling global status:", error);
          throw error;
        }
      },

      transferTemplate: async (templateId, restaurantId, locationId) => {
        try {
          await templateActions.transferTemplate(templateId, restaurantId, locationId);

          // Update template in state
          const template = get().templates.find((t) => t.id === templateId);
          if (template) {
            const oldRestaurantId = template.restaurant_id;
            // Update state using helper
            // await get().updateTemplateInState(updatedTemplate);

            if (oldRestaurantId) {
              await get().refreshTemplatesForRestaurant(oldRestaurantId);
              get().removeTemplateFromState(template);
            }
            // Delete the cached templates for the target restaurant
            delete get().cachedTemplates[restaurantId];
          }
        } catch (error) {
          console.error("Error transferring template:", error);
          throw error;
        }
      },

      updateAutoLayoutStatus: async (templateId, isAutoLayout) => {
        try {
          await templateActions.updateAutoLayoutStatus(templateId, isAutoLayout);

          // Update template in state
          const template = get().templates.find((t) => t.id === templateId);

          if (template) {
            const updatedTemplate = {
              ...template,
              isAutoLayout,
            };

            // Update state using helper
            await get().updateTemplateInState(updatedTemplate);
          }
        } catch (error) {
          console.error("Error updating auto layout status:", error);
          throw error;
        }
      },

      updateTemplateLocation: async (templateId, locationId) => {
        try {
          const updateLocationTemplate = await templateActions.updateTemplateLocation(
            templateId,
            locationId
          );

          // Update template in state
          const template = get().templates.find((t) => t.id === templateId);

          if (template) {
            await get().updateTemplateInState(updateLocationTemplate[0]);
          }
        } catch (error) {
          console.error("Error updating template location:", error);
          throw error;
        }
      },

      updateTemplatePublishedStatus: async (templateId, isPublished) => {
        try {
          await templateActions.updateTemplatePublishedStatus(templateId, isPublished);

          // Update template in state
          const template = get().templates.find((t) => t.id === templateId);
          if (template) {
            const updatedTemplate = {
              ...template,
              isGlobal: isPublished,
            };

            // Update state using helper
            await get().updateTemplateInState(updatedTemplate);
          }
        } catch (error) {
          console.error("Error updating template published status:", error);
          throw error;
        }
      },
      markThumbnailInvalid: (templateId: number) => {
        set((state) => ({
          validThumbnails: {
            ...state.validThumbnails,
            [templateId]: false,
          },
        }));
      },

      // Add a function to mark a thumbnail as valid
      markThumbnailValid: (templateId: number) => {
        set((state) => ({
          validThumbnails: {
            ...state.validThumbnails,
            [templateId]: true,
          },
        }));
      },
      uploadCoverImage: async (templateId, imageFile) => {
        try {
          const url = await templateActions.uploadCoverImage(templateId, imageFile);
          get().refreshThumbnail(templateId);
          get().markThumbnailValid(templateId);
          // Update template in state to get the new URL
          set((state) => ({
            templates: state.templates.map((template) =>
              template.id === templateId ? { ...template, hasThumbnail: true } : template
            ),
          }));
          return url;
        } catch (error) {
          console.error("Error uploading cover image:", error);
          throw error;
        }
      },
      // Add this new function to get a cache-busted thumbnail URL
      getThumbnailUrl: (templateId) => {
        const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/renderings/${templateId}/coverImage`;

        // Only add the timestamp parameter if we have a timestamp stored for this template
        const timestamp = get().thumbnailTimestamps[templateId];
        if (timestamp) {
          return `${baseUrl}?t=${timestamp}`;
        }

        // Otherwise return the base URL without a timestamp
        return baseUrl;
      },

      // Add this new function to refresh a specific thumbnail
      refreshThumbnail: (templateId) => {
        set((state) => ({
          thumbnailTimestamps: {
            ...state.thumbnailTimestamps,
            [templateId]: Date.now(),
          },
        }));
      },

      invalidateRestaurantCache: (restaurantId) => {
        set((state) => {
          // Remove from cached templates
          const { [restaurantId]: _, ...restCache } = state.cachedTemplates;

          // Remove from grouped menus
          const updatedGroupedMenus = { ...state.groupedMenus };
          Object.keys(updatedGroupedMenus).forEach((location) => {
            updatedGroupedMenus[location] = updatedGroupedMenus[location].filter(
              (template) => template.restaurant_id !== restaurantId
            );
          });

          return {
            cachedTemplates: restCache,
            groupedMenus: updatedGroupedMenus,
          };
        });
      },
    }),
    {
      name: "template-store",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => {
        const persistedState = {
          activeTab: state.activeTab,
          //cachedTemplates: state.cachedTemplates,
          validThumbnails: state.validThumbnails,
        };
        return persistedState as unknown as TemplateStore;
      },
    }
  )
);
