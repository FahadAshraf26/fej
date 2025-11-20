import { getUser } from "@Hooks/useUser";
import { supabase } from "@database/client.connection";
import { Page, IUserDetails, Section, Dish } from "@Interfaces/";
import { convertToSectionList } from "@Helpers/convertToSectionList";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { design } from "./data";

export const isOnlyWhitespace = (str: string): boolean => {
  return str.trim().length === 0;
};

export const getCurrentSelectedPage = () => {
  const instance = useInitializeEditor.getState().cesdkInstance;
  const pages = instance.current?.engine.block.findByType("page");

  if (pages?.length > 1) {
    const selectedBlocks = instance.current?.engine.block.findAllSelected();
    if (selectedBlocks?.length === 0) {
      const nearestPageByType =
        instance.current?.engine.scene.findNearestToViewPortCenterByType("//ly.img.ubq/page")[0];
      const nearestPageByKind =
        instance.current?.engine.scene.findNearestToViewPortCenterByKind("page")[0];
      return nearestPageByType || nearestPageByKind || pages[pages.length - 1];
    }
    const targetBlock = selectedBlocks[0];
    if (instance.current?.engine.block.getType(targetBlock) == "//ly.img.ubq/page") {
      return targetBlock;
    }
    let parentID = instance.current?.engine.block.getParent(targetBlock);
    while (instance.current?.engine.block.getType(parentID) !== "//ly.img.ubq/page") {
      parentID = instance.current?.engine.block.getParent(parentID);
    }
    return parentID;
  } else {
    return pages[0];
  }
};

export const getCESDKModalCurrentSelectedPage = (instance: any) => {
  const pages = instance.engine.block.findByType("page");

  if (pages?.length > 1) {
    const selectedBlocks = instance.engine.block.findAllSelected();
    if (selectedBlocks?.length === 0) {
      const nearestPageByType =
        instance.engine.scene.findNearestToViewPortCenterByType("//ly.img.ubq/page")[0];
      const nearestPageByKind = instance.engine.scene.findNearestToViewPortCenterByKind("page")[0];
      return nearestPageByType || nearestPageByKind || pages[pages.length - 1];
    }
    const targetBlock = selectedBlocks[0];
    if (instance.engine.block.getType(targetBlock) == "//ly.img.ubq/page") {
      return targetBlock;
    }
    let parentID = instance.engine.block.getParent(targetBlock);
    while (instance.engine.block.getType(parentID) !== "//ly.img.ubq/page") {
      parentID = instance.engine.block.getParent(parentID);
    }
    return parentID;
  } else {
    return pages[0];
  }
};
export const getPageIndex = (pageId: number) => {
  const cesdk = useInitializeEditor.getState().cesdkInstance;
  const pagesId = cesdk.current?.engine.scene.getPages();
  return pagesId?.indexOf(pageId);
};

export const destroyAll = async (cesdk: any) => {
  const pageId = getCurrentSelectedPage();

  const canvasDishes = cesdk.engine.block.getChildren(pageId);
  for (const element of canvasDishes) {
    cesdk.engine.block.destroy(element);
  }
  return true;
};

export const translateToAssetResult = (image: any) => {
  return {
    id: image.id.toString(),
    meta: {
      uri: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templateImages/${image?.content}`,
      thumbUri: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templateImages/${image?.content}`,
      width: image?.width,
      height: image?.height,
      blockType: "//ly.img.ubq/graphic",
      fillType: "//ly.img.ubq/fill/image",
      shapeType: "//ly.img.ubq/shape/rect",
      kind: "image",
    },
    name: image.restaurant_id.name,
  };
};

export const getConfigOfImageComponent = (eleList: any, id: string, restaurantName?: string) => {
  const createCleanId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const cleanId = restaurantName ? createCleanId(restaurantName) : id;

  const recentcustomSource = {
    id: cleanId,
    previewLength: 3,
    gridItemHeight: "square",
    previewBackgroundType: "cover",
    async findAssets(queryData: any) {
      const query = queryData.query?.toLowerCase() || "";
      const newRestaurantList = query.length
        ? useInitializeEditor.getState().restaurantList.filter((item: any) => {
            return typeof item.name === "string" && item.name.toLowerCase().includes(query);
          })
        : useInitializeEditor.getState().restaurantList;

      const instance = useInitializeEditor.getState().cesdkInstance.current;
      const entryIds = instance.ui.findAllAssetLibraryEntries();

      if (entryIds.includes("ly.img.upload") && queryData.perPage === 10) {
        const entry = instance.ui.getAssetLibraryEntry("ly.img.upload");

        const cleanSourceIds = newRestaurantList.map((item: any) => {
          return createCleanId(item.name);
        });

        instance.ui.updateAssetLibraryEntry("ly.img.upload", {
          sourceIds: [entry.sourceIds[0], ...cleanSourceIds],
        });
      }

      const neweleList = query.length
        ? eleList.filter(
            (item: any) => typeof item.name === "string" && item.name.toLowerCase().includes(query)
          )
        : eleList;

      const totalPages = Math.ceil(neweleList.length / queryData.perPage);
      const startIndex = queryData.page * queryData.perPage;
      const endIndex = startIndex + queryData.perPage;
      const currentPageItems = neweleList.slice(startIndex, endIndex);

      const assetsWithProperLabels = currentPageItems.map((item: any) => ({
        ...item,
        label: item.name || item.label || "Unnamed Item",
        meta: {
          ...item.meta,
          title: item.name || item.label || "Unnamed Item",
          restaurant: restaurantName || cleanId,
        },
        context: {
          ...item.context,
          sourceId: cleanId,
        },
      }));

      return Promise.resolve({
        assets: assetsWithProperLabels,
        query: queryData.query,
        total: neweleList.length,
        currentPage: queryData.page + 1,
        nextPage: queryData.page + 1 < totalPages ? queryData.page + 1 : undefined,
      });
    },
  };

  return recentcustomSource;
};

export const getFonts = (fontsData: any) => {
  let fonts: any = [];
  fontsData.map((item: any) => {
    if (item?.name) {
      const user = getUser();
      let key = user?.role === "flapjack" ? `${item?.name} (${item.id})` : item?.name;

      let fontObj = {
        id: key,
        label: {
          en: item?.name,
        },
        payload: {
          typeface: {
            name: key,
            fonts: [
              {
                uri: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fonts/${item?.content}`,
                subFamily: "Regular",
                weight: "regular",
                style: "normal",
              },
            ],
          },
        },
      };

      fonts.push(fontObj);
    }
  });
  return fonts;
};

const sortAssetsImages = async (user: IUserDetails) => {
  const { restaurant_id, role } = user;
  if (role === "flapjack") {
    const { data: globalTemplates, error: globalTemplatesError } = await supabase
      .from("assets")
      .select("id, createdBy, content ,restaurant_id (id, name)")
      .order("created_at", { ascending: false });
    if (globalTemplatesError) {
      return [];
    }
    const sectionedList = Object?.values(convertToSectionList(globalTemplates, true));
    return sectionedList ?? [];
  } else if (restaurant_id) {
    const { data: globalTemplates, error: globalTemplatesError } = await supabase
      .from("assets")
      .select("id, createdBy, content ,restaurant_id (id, name)")
      .eq("restaurant_id", restaurant_id)
      .order("created_at", { ascending: false });

    if (globalTemplatesError) {
      return [];
    }
    const sectionedList = Object?.values(convertToSectionList(globalTemplates, true));
    return sectionedList ?? [];
  }
};

export const getElementsWithRestaurant = async (user: IUserDetails) => {
  const globalTemplates = await sortAssetsImages(user);

  return {
    globalTemplates,
  };
};

export const updateMenuStates = async (cesdkInstance: any) => {
  const pages = usePageStore.getState().pages;
  const oSections = useSectionsStore.getState().oSections;
  const oDishes = useDishesStore.getState().oDishes;
  const setPages = usePageStore.getState().setPages;
  const setOSections = useSectionsStore.getState().setOSections;
  const setODishes = useDishesStore.getState().setODishes;

  const dishesMap: Map<string, Dish[]> = new Map(
    Object.entries(oDishes).map(([key, value]) => [key, value])
  );
  const sectionsMap: Map<Number, Section[]> = new Map(
    Object.entries(oSections).map(([key, value]) => [Number(key), value])
  );

  await Promise.all(
    pages.map(async (page) => {
      page.isSaved = true;
      const sections = oSections[page.pageId] || [];
      await Promise.all(
        sections.map(async (section) => {
          if (section.dishLayout || section.sectionLayout) {
            let dishLayoutBlockId = section.dishLayoutBlockId;
            let sectionTitleLayoutBlockId = section.sectionTitleLayoutBlockId;
            const newSection = {
              ...section,
              dishLayoutBlockId,
              sectionTitleLayoutBlockId,
              isSaved: true,
            };

            if (!sectionsMap.has(page.pageId)) {
              sectionsMap.set(page.pageId, []);
            }
            const existingSections = sectionsMap.get(page.pageId)!;
            const sectionIndex = existingSections.findIndex(
              (sec) => sec.sectionId === newSection.sectionId
            );
            if (sectionIndex === -1) {
              existingSections.push(newSection);
            } else {
              existingSections[sectionIndex] = newSection;
            }

            const dishes = oDishes[section.sectionId] || [];
            if (!dishesMap.has(section.sectionId)) {
              dishesMap.set(section.sectionId, []);
            }
            const existingDishes = dishesMap.get(section.sectionId)!;
            dishes.forEach((dish) => {
              const dishIndex = existingDishes.findIndex((d) => d.id === dish.id);
              if (dishIndex === -1) {
                existingDishes.push(dish);
              } else {
                existingDishes[dishIndex] = dish;
              }
            });
          }
        })
      );
    })
  );

  const sectionsObj = Object.fromEntries(sectionsMap);
  const dishesObj = Object.fromEntries(dishesMap);

  setOSections(sectionsObj);
  setODishes(dishesObj);
  setPages(pages);
};

export const uintId = (): number => {
  const randomNumber = Math.random();
  return parseFloat(randomNumber.toFixed(8));
};

export const getPageByUUID = (blockUUID: string, cesdkInstance: any) => {
  const allPages = cesdkInstance.current?.engine.scene.getPages();
  return allPages?.find((p: any) => cesdkInstance.current?.engine.block.getUUID(p) === blockUUID);
};

export const verifyPage = (blockUUID: Page["blockUUID"], instance: any): boolean => {
  return (
    instance.engine?.scene
      .getPages()
      ?.some((p: Page["blockUUID"]) => instance.engine.block.getUUID(p) === blockUUID) ?? false
  );
};

export const handleSetPagesState = async (pages: Page[]) => {
  const cesdkInstance = useInitializeEditor.getState().cesdkInstance;
  const dishesMap: Map<string, Dish[]> = new Map();
  const sectionsMap: Map<number, Section[]> = new Map();
  for (const page of pages) {
    page.isSaved = true;
    page.blockUUID = page.pageUUID!;
    page.sectionGap = page.sectionGap ?? 1;
    const sections = page.sections || [];
    if (!sections.length) continue;
    for (const section of sections) {
      let dishLayoutBlockId = section.dishLayoutBlockId;
      let sectionTitleLayoutBlockId = section.sectionTitleLayoutBlockId;
      section.columnMargin =
        section.columns > 1 ? (section.columnMargin > 0 ? section.columnMargin : 0.25) : 0;
      if (section.dishLayout !== null) {
        const { data, error } = await supabase.storage
          .from("style_layouts")
          .download(section.dishLayout?.elementPath!);
        const elementString = await data?.text();
        [dishLayoutBlockId] = await Promise.all([
          cesdkInstance.current?.engine.block.loadFromString(elementString),
        ]);
        useSectionsStore.getState().setDishLayoutBlockId(dishLayoutBlockId);
      } else {
        [dishLayoutBlockId] = await Promise.all([
          cesdkInstance.current?.engine.block.loadFromString(design.value),
        ]);
      }
      if (section.sectionLayout !== null) {
        const { data, error } = await supabase.storage
          .from("style_layouts")
          .download(section.sectionLayout?.elementPath!);
        const elementString = await data?.text();
        const [loadedBlockIds] = await Promise.all([
          cesdkInstance.current?.engine.block.loadFromString(elementString),
        ]);
        if (!Array.isArray(loadedBlockIds) || loadedBlockIds.length === 0) {
        }
        sectionTitleLayoutBlockId = loadedBlockIds;
        useSectionsStore.getState().setSectionTitleLayoutBlockId(sectionTitleLayoutBlockId);
      } else {
        [sectionTitleLayoutBlockId] = await Promise.all([
          cesdkInstance.current?.engine.block.loadFromString(design.title),
        ]);
      }

      const newSection = {
        ...section,
        dishLayoutBlockId,
        sectionTitleLayoutBlockId,
        isSaved: true,
        pageId: page.pageId,
        borderImageUrl: section.borderImageUrl ?? undefined,
        sectionMarginLeft: section.sectionMarginLeft ?? undefined,
        sectionMarginRight: section.sectionMarginRight ?? undefined,
        sectionMarginTop: section.sectionMarginTop ?? undefined,
        sectionMarginBottom: section.sectionMarginBottom ?? undefined,
      };

      useSectionsStore.getState().setTitleHorizontalSettings(section.sectionId, {
        isLeft: section?.horizontalAlign === "Left" ? true : false,
        isCenter: section?.horizontalAlign === "Center" ? true : false,
        isRight: section?.horizontalAlign === "Right" ? true : false,
      });
      if (!sectionsMap.has(page.pageId)) {
        sectionsMap.set(page.pageId, []);
      }
      const existingSections = sectionsMap.get(page.pageId)!;
      const sectionIndex = existingSections.findIndex(
        (sec) => sec.sectionId === newSection.sectionId
      );
      if (sectionIndex === -1) {
        existingSections.push(newSection);
      } else {
        existingSections[sectionIndex] = newSection;
      }
      sectionsMap.set(page.pageId, existingSections);

      const menuDishes = section.menu_dishes || [];
      if (menuDishes.length) {
        const blockIdMap = new Map<number, number>();
        const inlineTextDishesToLoad = menuDishes.filter(
          (d: any) => d.type === "text" && d.inlineTextLayout?.elementPath
        );

        await Promise.all(
          inlineTextDishesToLoad.map(async (dish: any) => {
            try {
              const { data } = await supabase.storage
                .from("style_layouts")
                .download(dish.inlineTextLayout.elementPath);
              const elementString = await data?.text();
              if (elementString) {
                const newBlockId = await cesdkInstance.current?.engine.block.loadFromString(
                  elementString
                );
                blockIdMap.set(dish.id, newBlockId);
              }
            } catch (e) {
              console.error("Failed to load inline text layout for dish:", dish.id, e);
            }
          })
        );

        if (!dishesMap.has(section.sectionId)) {
          dishesMap.set(section.sectionId, []);
        }
        const existingDishes = dishesMap.get(section.sectionId)!;

        menuDishes.forEach((dish: Dish) => {
          if (dish.type === "inlineText") {
            dish.temp_inlineText_layout = dish.inlineText_layout;
            if (blockIdMap.has(dish.id)) {
              dish.inlineTextLayoutBlockId = blockIdMap.get(dish.id);
            }
          }

          // --- Your original core functionality remains below ---
          const dishIndex = existingDishes.findIndex((d) => d.id === dish.id);
          dish.section = section.sectionId;
          useDishesStore.getState().setLayoutSettings(dish.section, {
            isDishTitleAndPrice: dish.isDishTitleAndPrice,
            isDishDescriptionAndPrice: dish.isDishDescriptionAndPrice,
            isDishTitleAndDescriptionAndPrice: dish.isDishTitleAndDescriptionAndPrice,
            isJustifyPriceCenter: dish.isJustifyPriceCenter,
            isJustifyPriceTop: dish.isJustifyPriceTop,
            isDefaultLayout:
              !dish.isDishTitleAndPrice ||
              !dish.isDishDescriptionAndPrice ||
              !dish.isDishTitleAndDescriptionAndPrice ||
              !dish.isJustifyPriceCenter ||
              !dish.isJustifyPriceTop,
          });
          useDishesStore.getState().setHorizontalSettings(dish.section, {
            isLeft: dish.horizontalAlign === "Left" ? true : false,
            isCenter: dish.horizontalAlign === "Center" ? true : false,
            isRight: dish.horizontalAlign === "Right" ? true : false,
          });
          if (dishIndex === -1) {
            existingDishes.push(dish);
          } else {
            existingDishes[dishIndex] = dish;
          }
        });

        dishesMap.set(section.sectionId, existingDishes);
      }
    }
  }

  const sectionsObj = Object.fromEntries(sectionsMap);
  const dishesObj = Object.fromEntries(dishesMap);
  return { sectionsObj, dishesObj, pages };
};

export const findTextBlock = (blockId: number): number | null => {
  const cesdkInstance = useInitializeEditor.getState().cesdkInstance;
  const children = cesdkInstance.current?.engine.block.getChildren(blockId) || [];

  for (const child of children) {
    const blockType = cesdkInstance.current?.engine.block.getType(child);
    const blockName = cesdkInstance.current?.engine.block.getName(child);
    if (blockType === "//ly.img.ubq/text" && blockName.includes("sectionTitleLayout")) {
      return child;
    }

    const nestedTextBlock = findTextBlock(child);
    if (nestedTextBlock !== null) {
      return nestedTextBlock;
    }
  }
  return null;
};

export const checkFileExists = async (fileUrl: string) => {
  const response = await fetch(fileUrl);
  return response?.status === 200;
};
export const filterInvalidSectionTitles = (dishes: Dish[]): Dish[] => {
  return dishes.filter(
    (dish) => !(dish.type === "sectionTitle" && dish.title === null && dish.isEdit)
  );
};

/**
 * Reads an image file and returns its dimensions.
 * @param file The image file selected by the user.
 * @returns A promise that resolves with the image's width and height.
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
