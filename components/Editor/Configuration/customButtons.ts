import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { ITemplateDetails } from "@Interfaces/";
import { supabase } from "@database/client.connection";
import { toast } from "react-toastify";
import { UploadService } from "../../../backend/services/UploadService";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";

export const customButtons = (instance: any, template: ITemplateDetails | null) => {
  instance.ui.registerComponent(
    "contentButton.dock",
    ({ builder: { Button } }: { builder: { Button: any } }) => {
      Button("content-id", {
        label: "Content",
        key: "content",
        icon: "@flapjack/icon/content",
        isSelected: useInitializeEditor.getState().isContentOpen,
        onClick: () => {
          useInitializeEditor.getState().setIsContentOpen();
        },
      });
    }
  );

  instance.ui.registerComponent(
    "layoutButton.dock",
    ({ builder: { Button } }: { builder: { Button: any } }) => {
      Button("layout-id", {
        label: "Layout",
        key: "layout",
        icon: "@flapjack/icon/layout",
        isSelected: useInitializeEditor.getState().isLayoutOpen,
        onClick: () => {
          useInitializeEditor.getState().setIsLayoutOpen();
        },
      });
    }
  );

  instance.ui.registerComponent(
    "styleButton.dock",
    ({ builder: { Button } }: { builder: { Button: any } }) => {
      Button("style-id", {
        label: "Style",
        key: "style",
        icon: "@flapjack/icon/style",
        isSelected: useInitializeEditor.getState().isStyleOpen,
        onClick: () => {
          useInitializeEditor.getState().setIsStyleOpen();
        },
      });
    }
  );

  instance.ui.registerComponent(
    "uploadButton.dock",
    ({ builder: { Button } }: { builder: { Button: any } }) => {
      const user = useInitializeEditor.getState().user;
      // also only show if menu is autolayout
      if (user?.role !== "flapjack" || template?.isAutoLayout !== true) return null;

      Button("upload-id", {
        label: "Import",
        key: "upload",
        icon: "@flapjack/icon/upload",
        onClick: async () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.style.display = "none";

          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
              const uploadToast = toast.info("Uploading menu image...", {
                autoClose: false,
                hideProgressBar: true,
              });

              const publicUrl = await UploadService.uploadImage(file);

              // Ensure toast stays visible for at least 3 seconds
              const uploadTime = Date.now();
              const remainingTime = Math.max(0, 3000 - (Date.now() - uploadTime));
              if (remainingTime > 0) {
                await new Promise((resolve) => setTimeout(resolve, remainingTime));
                toast.dismiss(uploadToast);
              }

              const processToast = toast.info(
                "Processing menu image. This may take a minute or two...",
                {
                  autoClose: 3000,
                  hideProgressBar: true,
                  isLoading: true,
                }
              );

              const response = await fetch("/api/import/process-menu", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${
                    (
                      await supabase.auth.getSession()
                    ).data.session?.access_token
                  }`,
                },
                body: JSON.stringify({
                  fileUrls: [publicUrl],
                  fileTypes: [file.type],
                  restaurantInfo: {
                    name: template?.name || "",
                  },
                }),
              });

              if (!response.ok) {
                toast.dismiss(processToast);
                throw new Error("Failed to process menu image");
              }

              const { results } = await response.json();
              toast.dismiss(processToast);

              // Get store instances
              const pageStore = usePageStore.getState();
              const sectionsStore = useSectionsStore.getState();
              const dishesStore = useDishesStore.getState();

              // Get the current page
              const currentPage = pageStore.getSelectedPage();
              if (!currentPage) {
                throw new Error("No active page found");
              }

              // Update page columns based on menu layout
              const menuData = JSON.parse(results[0]);
              if (menuData.layout?.columns) {
                pageStore.updatePageColumnCount(menuData.layout.columns);
              }

              // Update page orientation if available
              if (menuData.layout?.orientation) {
                pageStore.updatePageOrientation(menuData.layout.orientation);
              }

              // Clear existing sections for this page
              sectionsStore.setOSections({
                ...sectionsStore.oSections,
                [currentPage.pageId]: [],
              });

              // Process each section from the results
              menuData.sections.forEach((section: any, index: number) => {
                // Add section using store method
                sectionsStore.addSection();

                // Get the newly created section
                const sections = sectionsStore.getSectionsForPageId(currentPage.pageId);
                const newSection = sections[sections.length - 1];

                if (!newSection) {
                  console.error("Failed to create section");
                  return;
                }

                // Update section layout if available
                if (section.layout) {
                  sectionsStore.updateSectionLayout(currentPage.pageId, newSection.sectionId, {
                    x: section.layout.x ?? newSection.dndLayout.x,
                    y: section.layout.y ?? index,
                    w: section.layout.w ?? newSection.dndLayout.w,
                  });
                }

                // get all section titles
                const sectionTitles = dishesStore.getAllSectionTitles();

                // Update section name
                sectionsStore.setSelectedSection({
                  pageId: currentPage.pageId,
                  sectionId: newSection.sectionId,
                });
                sectionsStore.updateSectionName(section.name);

                dishesStore.removeAllDishesExceptTitle(newSection.sectionId);

                // Add dishes to the section
                if (section.items && Array.isArray(section.items)) {
                  const dishes = section.items.map((item: any, dishIndex: number) => {
                    const dishId = dishesStore.addDish(false, 1, dishIndex);
                    dishesStore.updateDishContent(newSection.sectionId, dishId, "title", item.name);
                    dishesStore.updateDishContent(
                      newSection.sectionId,
                      dishId,
                      "description",
                      item.description
                    );
                    dishesStore.updateDishContent(
                      newSection.sectionId,
                      dishId,
                      "price",
                      item.price
                    );

                    if (item.addOns && item.addOns.length > 0) {
                      // modify items.addons to be a string of addons
                      const addons = item.addOns
                        .map((addon: any) => `${addon.name} - ${addon.price}`)
                        .join(" ");
                      dishesStore.updateDishContent(newSection.sectionId, dishId, "addOns", addons);
                    }

                    return dishId;
                  });
                }
              });

              toast.success("Menu imported successfully", {
                autoClose: 3000,
                hideProgressBar: true,
              });
            } catch (error) {
              console.error("Import failed:", error);
              toast.error("Failed to import menu", {
                autoClose: 3000,
                hideProgressBar: true,
              });
            }
          };

          document.body.appendChild(input);
          input.click();
          document.body.removeChild(input);
        },
      });
    }
  );

  const createCleanId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const restaurantList = useInitializeEditor.getState().restaurantList;
  const cleanSourceIds = restaurantList
    .map((item: any) => {
      if (item?.name) {
        return createCleanId(item.name);
      }
      return null;
    })
    .filter(Boolean);

  instance.ui.addAssetLibraryEntry({
    id: "Images",
    sourceIds: ["ly.img.upload", ...cleanSourceIds],
    previewLength: 5,
    previewBackgroundType: "cover",
    gridBackgroundType: "cover",
    gridColumns: 3,
  });

  if (template?.isAutoLayout || template?.isAutoLayout === null) {
    instance.ui.setDockOrder([
      {
        id: "contentButton.dock",
      },
      {
        id: "layoutButton.dock",
      },
      {
        id: "styleButton.dock",
      },
      {
        id: "ly.img.assetLibrary.dock",
        key: "Images",
        icon: "@flapjack/icon/image",
        label: "libraries.ly.img.image.label",
        entries: ["ly.img.upload"],
      },
      {
        id: "ly.img.assetLibrary.dock",
        key: "ly.img.text",
        icon: "@flapjack/icon/text",
        label: "libraries.ly.img.text.label",
        entries: ["ly.img.text"],
      },
      {
        id: "ly.img.assetLibrary.dock",
        key: "ly.img.vectorpath",
        icon: "@flapjack/icon/shape",
        label: "libraries.ly.img.vectorpath.label",
        entries: ["ly.img.vectorpath"],
      },
      {
        id: "uploadButton.dock",
      },
    ]);
  } else {
    instance.ui.setDockOrder([
      {
        id: "ly.img.assetLibrary.dock",
        key: "Images",
        icon: "@flapjack/icon/image",
        label: "libraries.ly.img.image.label",
        entries: ["ly.img.upload"],
      },
      {
        id: "ly.img.assetLibrary.dock",
        key: "ly.img.text",
        icon: "@flapjack/icon/text",
        label: "libraries.ly.img.text.label",
        entries: ["ly.img.text"],
      },
      {
        id: "ly.img.assetLibrary.dock",
        key: "ly.img.vectorpath",
        icon: "@flapjack/icon/shape",
        label: "libraries.ly.img.vectorpath.label",
        entries: ["ly.img.vectorpath"],
      },
      {
        id: "uploadButton.dock",
      },
    ]);
  }

  const navigationBar = [
    "ly.img.title.navigationBar",
    "applyButton.navigation",
    "ly.img.spacer",
    "ly.img.zoom.navigationBar",
    "ly.img.actions.navigationBar",
  ];

  if (template?.isAutoLayout || template?.isAutoLayout === null) {
    instance.ui.setCanvasMenuOrder(["ly.img.delete.canvasMenu"]);
    instance.ui.setNavigationBarOrder(navigationBar);
  } else {
    instance.ui.setNavigationBarOrder([
      "ly.img.title.navigationBar",
      "applyButton.navigation",
      "ly.img.spacer",
      "ly.img.undoRedo.navigationBar",
      "ly.img.zoom.navigationBar",
      "ly.img.actions.navigationBar",
    ]);
  }

  const entryIds = instance.ui.findAllAssetLibraryEntries();
  if (entryIds.includes("ly.img.upload")) {
    const entry = instance.ui.getAssetLibraryEntry("ly.img.upload");

    instance.ui.updateAssetLibraryEntry("ly.img.upload", {
      sourceIds: [entry.sourceIds[0], ...cleanSourceIds],
    });
  }

  instance.ui.unstable_registerCustomPanel("custom-panel", (domElement: any) => {
    // const root = createRoot(domElement);
    // root.render(React.createElement(CustomPanelApp, { cesdk }, null));
    return () => {};
  });

  if (template?.isAutoLayout || template?.isAutoLayout === null) {
    instance.feature.enable(
      "ly.img.delete",
      ({ engine, isPreviousEnable }: { engine: any; isPreviousEnable: any }) => {
        const selectedBlock = engine.block.findAllSelected()[0];
        const kind = engine.block.getKind(selectedBlock);
        const name = engine.block.getName(selectedBlock);
        if (kind === "page" || kind === "group") {
          return false;
        } else if (
          name === "title" ||
          name === "price" ||
          name === "description" ||
          name === "sectionTitle" ||
          name === "addons" ||
          name === "sectionAddons" ||
          name.includes("sectionTitleLayout")
        ) {
          return false;
        } else {
          return isPreviousEnable();
        }
      }
    );
  }
};
