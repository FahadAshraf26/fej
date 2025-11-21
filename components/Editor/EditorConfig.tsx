import { useEffect, useState, useLayoutEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { useClipboard } from "@mantine/hooks";
import dynamic from "next/dynamic";
import CreativeEditorSDK from "@cesdk/cesdk-js";
import { eConfiguration } from "@Components/Editor/Configuration/";
import { InitializeEditor } from "@Components/Editor/Configuration/InitializeEditor";
import { design } from "@Components/Editor/Utils/data";
import { PreviewLinkModal } from "@Components/Editor/Utils/PreviewLinkModal";
import { ITemplateDetails, IUserDetails, IFontError } from "@Interfaces/";
import { useCustomUIElementsEffect } from "@Hooks/useCustomUIElementsEffect";
import { useAuth } from "@Hooks/useAuth";
import { fetchFonts, fetchResturants } from "@Hooks/useUser";
import { useDialog } from "@Hooks/useDialog";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { handleSetPagesState } from "./Utils";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { handleSections } from "@Components/Editor/CanvasLayout/handleSection";
import { useTitleUIElementEffect } from "@Hooks/useTitleUIElementEffect";
import { supabase } from "@database/client.connection";
import { updateMenuSectionData } from "./menuDataOperations";
import { getImagePanelData } from "@Helpers/ImagePanelData";
import { useDockOrder } from "@Hooks/useDockOrder";
import { useRestrictToLeaveBeforeChanges } from "@Hooks/useRestrictToLeaveBeforeChanges";
import { Loader, LoadingOverlay } from "@mantine/core";
import { UploadFontModal } from "@Components/Editor/Utils/UploadFont/UploadFontModal";
import { useTabsActive } from "@Hooks/useTabsActive";
import { canvasLoader } from "./CanvasLayout/canvasLoader";
import { MenuUpdateModal } from "./EditorComponents/MenuUpdateModal";
import { debounce } from "lodash";
import { changesQueued } from "./CanvasLayout/changesQueued";
import { uploadFile } from "@Helpers/UploadFile";
import { toast } from "react-toastify";
import { v4 as uuidV4 } from "uuid";
import classes from "./EditorConfig.module.css";
import HistorySidebar from "./HistorySidebar";
import { uploadRevisionFile } from "@Helpers/HandleVersionHistory";
import { event } from "nextjs-google-analytics";
import { enforceSinglePanelOpen } from "@Utils/panelVisibility";
import { handleImageSize } from "@Utils/ImageSize";
import { getArchiveFileName, getSceneStorageKey } from "@Components/Editor/Utils/sceneStorage";
import {
  persistLayerOrder as persistLayerOrderLogic,
  restoreUserLayerPositions,
  autoLayoutComponents,
} from "./CanvasLayout/layerOperations";

const SidebarConfig = dynamic(() => import("@Components/Editor/Sidebar/index"), { ssr: false });
const AuthDialog = dynamic(() => import("@Components/AuthDialog"), {
  ssr: false,
});
const StyleAllLayoutModal = dynamic(
  () => import("./Sidebar/PageSidebar/StyleTab/StyleAllLayoutModal"),
  { ssr: false }
);

const ALLOWED_RESOURCE_SCHEMES = [
  "https",
  "http",
  "data",
  "blob",
  "buffer",
  "bundle",
  "file",
  "cesdk",
];

const EditorConfig = ({
  menuContent,
  template,
  preview,
  user,
  loader,
  setloader,
}: {
  menuContent?: ITemplateDetails | null;
  template: ITemplateDetails | null;
  preview?: boolean;
  user: IUserDetails;
  loader: boolean;
  setloader: (value: boolean) => void;
}) => {
  useAuth();
  const cesdkContainer = useRef(null);
  const debouncedPersistLayerOrder = useRef(
    debounce((engine: any) => persistLayerOrderLogic(engine), 300)
  ).current;
  const previousPanelsRef = useRef<string[]>([]);
  const cesdkInstance = useInitializeEditor((state) => state.cesdkInstance);
  const [input, setinput] = useState<any>(1);
  const router = useRouter();
  const [fontsError, setFontsError] = useState<IFontError | undefined>();
  const [isAuthDialogOpen, _, closeAuthDialog] = useDialog(false);
  const [loading, setloading] = useState(false);
  const [titleFontSize, setTitleFontSize] = useState<any>("");
  const [font, setFont] = useState();
  const clipboardUrl = useClipboard({ timeout: 500 });
  const clipboardEmbed = useClipboard({ timeout: 500 });
  const setPages = usePageStore((state) => state.setPages);
  const setOSections = useSectionsStore((state) => state.setOSections);
  const setODishes = useDishesStore((state) => state.setODishes);
  const setActivePageId = usePageStore((state) => state.setActivePageId);
  const setTemplateVersions = useInitializeEditor((state) => state.setTemplateVersions);
  const setDishLayoutBlockId = useSectionsStore((state) => state.setDishLayoutBlockId);
  const setSectionTitleLayoutBlockId = useSectionsStore(
    (state) => state.setSectionTitleLayoutBlockId
  );
  const setInlineTextLayoutBlockId = useInitializeEditor(
    (state) => state.setInlineTextLayoutBlockId
  );
  const setIsPreviewLink = useInitializeEditor((state) => state.setIsPreviewLink);
  const isPreviewLink = useInitializeEditor((state) => state.isPreviewLink);
  const setFonts = useInitializeEditor((state) => state.setFonts);
  const setloadinEditor = useInitializeEditor((state) => state.setLoadingEditor);
  const templateModal = useInitializeEditor((state) => state.templateModal);
  const setTemplateModal = useInitializeEditor((state) => state.setTemplateModal);
  const setContent = useInitializeEditor((state) => state.setContent);
  const setMenuName = usePageStore((state) => state.setMenuName);
  const resetPages = usePageStore((state) => state.resetPages);
  const resetSections = useSectionsStore((state) => state.resetSections);
  const resetDishes = useDishesStore((state) => state.resetDishes);
  const setRestaurantsOptions = useInitializeEditor((state) => state.setRestaurantOptions);
  const setMenuId = usePageStore((state) => state.setMenuId);
  const updateAutoComponent = usePageStore((state) => state.setAutoLayoutComponent);
  const setUserData = useInitializeEditor((state) => state.setUserData);
  const resetInitialzeEditor = useInitializeEditor((state) => state.resetInitialzeEditor);
  const isApplyMenu = useInitializeEditor((state) => state.isApplyMenu);
  const isSaving = useInitializeEditor((state) => state.isSaving);
  const isCanvasLoader = useInitializeEditor((state) => state.canvasLoader);
  const activityChangeId = useInitializeEditor((state) => state.activityChangeId);
  const changedPageIds = usePageStore((state) => state.changedPageIds);
  const setIsMenuUpdatedModalOpen = useInitializeEditor((state) => state.setIsMenuUpdatedModalOpen);
  const { setNaci } = usePageStore.getState();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUploadFontModal, setIsUploadFontModal] = useState<boolean>(false);
  const [fontListTrigger, setFontListTrigger] = useState(0);

  const setEmbedCode = useInitializeEditor.getState().setEmbedCode;
  const setPreviewLink = useInitializeEditor.getState().setPreviewLink;
  const blockTypes = ["//ly.img.ubq/text", "//ly.img.ubq/fill/image", "//ly.img.ubq/graphic"];
  const blockTypeScene = ["//ly.img.ubq/scene"];
  const blockTypeGroup = ["//ly.img.ubq/group"];
  const blockTypePage = "//ly.img.ubq/page";
  const baseInspectorBarOrder = [
    "ly.img.spacer",
    "ly.img.text.typeFace.inspectorBar",
    "ly.img.text.fontSize.inspectorBar",
    "ly.img.shape.options.inspectorBar",
    "ly.img.cutout.type.inspectorBar",
    "ly.img.cutout.offset.inspectorBar",
    "ly.img.cutout.smoothing.inspectorBar",
    "ly.img.group.create.inspectorBar",
    "ly.img.audio.replace.inspectorBar",
    "ly.img.separator",
    "ly.img.text.bold.inspectorBar",
    "ly.img.text.italic.inspectorBar",
    "ly.img.text.alignHorizontal.inspectorBar",
    "ly.img.combine.inspectorBar",
    "ly.img.separator",
    "ly.img.fill.inspectorBar",
    "ly.img.trim.inspectorBar",
    "ly.img.volume.inspectorBar",
    "ly.img.crop.inspectorBar",
    "ly.img.separator",
    "ly.img.stroke.inspectorBar",
    "ly.img.separator",
    "ly.img.position.inspectorBar",
    "ly.img.separator",
    "ly.img.options.inspectorBar",
  ];

  const positionsRef = useRef({
    current: { x: 0, y: 0 },
    previous: { x: 0, y: 0 },
  });

  const setup = async () => {
    const startTime = performance.now();

    try {
      const templateFonts = await fetchFonts(user);
      const configData = await getImagePanelData(user);
      setFonts(templateFonts);

      if (cesdkContainer.current) {
        const config = await eConfiguration(menuContent, template, saveTemplate, router, user);
        const instance = await CreativeEditorSDK.create(cesdkContainer.current, config as any);
        const engine = instance.engine;

        await InitializeEditor({
          template,
          instance,
          configData,
          user,
        });
        const [dishBlockId, titleBlockId, inlineTextBlockId] = await Promise.all([
          engine.block.loadFromString(design.value),
          engine.block.loadFromString(design.title),
          engine.block.loadFromString(design.inlineText),
        ]);
        useSectionsStore.getState().setSectionTitleLayoutBlockId(titleBlockId);
        useSectionsStore.getState().setDishLayoutBlockId(dishBlockId);
        useInitializeEditor.getState().setInlineTextLayoutBlockId(inlineTextBlockId);
        setinput(input + 1);
        setloadinEditor(false);
        useInitializeEditor.getState().setCanvasLoader(true);
        useInitializeEditor.getState().setIsSaving(true);
        if (template) {
          if (template.isAutoLayout) {
            updateAutoComponent(true);
          }
          await getPages();
          engine.editor.undo();

          await restoreUserLayerPositions(engine);

          const versions = await supabase
            .from("templates_versions")
            .select("*")
            .eq("templateId", template.id);
          setTemplateVersions(versions.data);
          await getPages();

          const loadTime = performance.now() - startTime;
          event("menu_performance", {
            category: "Performance",
            label: "Menu Load Time",
            value: Math.round(loadTime),
            template_id: template.id,
            template_name: template.name,
          });
        }
        useInitializeEditor.getState().fetchDietaryIconOptions(template?.restaurant_id);

        let unsubscribe = engine.event.subscribe(
          [],
          (events: Array<{ block: number; type: string }>) => {
            for (let i = 0; i < events.length; i++) {
              const event = events[i];
              const eventType = event.type.toLowerCase();
              if (eventType === "destroyed") {
                setNaci(true);
              }
              // #START# The code below handles Sidebar panel opening and closing - By Tahir
              const openPanels = instance.ui.findAllPanels({ open: true });
              const previousPanels = previousPanelsRef.current;

              const newlyOpenedPanel = openPanels.find((panel) => !previousPanels.includes(panel));

              if (newlyOpenedPanel) {
                enforceSinglePanelOpen(newlyOpenedPanel, instance.ui);
              }

              previousPanelsRef.current = openPanels;
              // #END#
              // #START# Fix drag-and-drop image crop issue (contain inside container without resizing block)
              handleImageSize(event, instance);
              // #END#

              if (!instance.engine.block.isValid(event.block)) continue;
              const eventBlockType = instance.engine.block.getType(event.block);
              const isEditorInitialized = useInitializeEditor.getState().isInitializeEditor;
              const shouldProcessShapeEvent =
                (eventType === "created" &&
                  (blockTypeScene.includes(eventBlockType) ||
                    blockTypes.includes(eventBlockType))) ||
                (eventBlockType?.startsWith("//ly.img.ubq/shape") && !isEditorInitialized);

              const block = event.block;
              if (!engine.block.isValid(block)) continue;

              const blockName = engine.block.getName(block);
              const blockType = engine.block.getType(block);
              const isUserPlacedComponent = !autoLayoutComponents.includes(blockName);

              if (eventType.toLowerCase() === "created" && isUserPlacedComponent) {
                engine.block.setMetadata(block, "isUserPlaced", "true");

                if (blockTypes.includes(blockType) || blockType?.startsWith("//ly.img.ubq/shape")) {
                  try {
                    engine.block.bringToFront(block);
                  } catch (error) {
                    console.warn("Could not bring block to front:", error);
                  }
                }

                persistLayerOrderLogic(engine);

                setNaci(true);
                updateAutoComponent(false);
                useInitializeEditor.getState().incrementActivityChangeId();
              }

              if (eventType.toLowerCase() === "updated") {
                const name = engine.block.getName(block);
                const isUserPlaced = engine.block.hasMetadata(block, "isUserPlaced");

                const specialBlocks = [
                  "title",
                  "description",
                  "price",
                  "sectionTitle",
                  "addons",
                  "sectionAddons",
                  "section",
                  "sectionDish",
                  "loaderShape",
                  "ApplyloaderText",
                  "loaderChangesGraphic",
                  "loaderGraphic",
                  "loaderText",
                ];

                if (!specialBlocks.includes(name)) {
                  const finalOrder = [...baseInspectorBarOrder];
                  const insertIndex =
                    finalOrder.findIndex((item) => item === "ly.img.group.create.inspectorBar") + 1;
                  finalOrder.splice(insertIndex, 0, "ly.img.group.ungroup.inspectorBar");
                  instance.ui.setInspectorBarOrder(finalOrder);
                }

                if (isUserPlaced || (!specialBlocks.includes(name) && isUserPlacedComponent)) {
                  try {
                    const newXPosition = engine.block.getPositionX(block);
                    const newYPosition = engine.block.getPositionY(block);

                    const currentPos = positionsRef.current.current;
                    const hasPositionChanged =
                      Math.abs(currentPos.x - newXPosition) > 0.1 ||
                      Math.abs(currentPos.y - newYPosition) > 0.1;

                    if (hasPositionChanged) {
                      positionsRef.current = {
                        previous: { ...positionsRef.current.current },
                        current: { x: newXPosition, y: newYPosition },
                      };
                    }
                    if (!useInitializeEditor.getState().isSaving) {
                      debouncedPersistLayerOrder(engine);
                      setNaci(true);
                      updateAutoComponent(false);
                      useInitializeEditor.getState().incrementActivityChangeId();
                    }
                  } catch (error) {
                    console.warn("Error handling position update:", error);
                  }
                }
              }

              if (eventType.toLowerCase() === "destroyed") {
                setNaci(true);
              }
            }
          }
        );

        const unsubscribeOnClicked = instance.engine.block.onClicked((block: any) => {
          const name = instance.engine.block.getName(block);
          const type = instance.engine.block.getType(block);
          const blockTypePage = "//ly.img.ubq/page";
          if (type === blockTypePage) {
            usePageStore.getState().setActivePageId(block);
            if (
              !useInitializeEditor.getState().isContentOpen &&
              !useInitializeEditor.getState().isStyleOpen &&
              template?.isAutoLayout
            ) {
              useInitializeEditor.getState().setIsContentOpen();
            }
          }
          const specialBlocks = [
            "title",
            "description",
            "price",
            "sectionTitle",
            "addons",
            "sectionAddons",
            "sectionDish",
            "loaderShape",
            "ApplyloaderText",
            "loaderChangesGraphic",
            "loaderGraphic",
            "loaderText",
          ];
          if (specialBlocks.some((value) => value === name)) {
            instance.engine.block.setSelected(block, false);
            instance.engine.block.exitGroup(block);
          } else if (["section"].some((value) => value === name)) {
            const sectionMetaData = instance.engine.block.getMetadata(block, "sectionId");
            const sectionPageMetaData = instance.engine.block.getMetadata(block, "pageId");
            if (sectionMetaData) {
              const sections = useSectionsStore.getState().oSections;
              const sectionToSelect = sections[sectionPageMetaData].find(
                (section) => section.sectionId === sectionMetaData
              );
              const isSelected = instance.engine.block.isSelected(block);
              if (sectionToSelect && isSelected) {
                usePageStore.getState().setActivePageId(Number(sectionPageMetaData));
                useSectionsStore.getState().setSelectedSection({
                  pageId: sectionToSelect.pageId,
                  sectionId: sectionToSelect.sectionId,
                });
                if (
                  !useInitializeEditor.getState().isContentOpen &&
                  !useInitializeEditor.getState().isStyleOpen &&
                  template?.isAutoLayout
                ) {
                  useInitializeEditor.getState().setIsContentOpen();
                }
              }
            }
          }
        });

        return () => {
          unsubscribe();
          unsubscribeOnClicked();
          if (cesdkInstance.current) {
            cesdkInstance.current.dispose();
          }
        };
      }
    } catch (error) {
      console.error("Error during menu setup:", error);
      event("menu_performance_error", {
        category: "Error",
        label: "Menu Load Failed",
        template_id: template?.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  useEffect(() => {
    setloadinEditor(true);
    setup();
    setUserData(user);
    if (template) {
      setMenuName(template!.name);
      setMenuId(template!.id);
      fetchResturants(user).then((restaurants: any) => {
        setRestaurantsOptions(restaurants);
      });
    }
    return () => {
      resetPages();
      resetSections();
      resetDishes();
      resetInitialzeEditor();
    };
  }, []);

  const getPages = useCallback(async () => {
    try {
      if (!template?.pages?.length) return;
      const pages = template?.pages || [];
      const { sectionsObj, dishesObj, pages: updatedPages } = await handleSetPagesState(pages);

      setOSections(sectionsObj);
      setODishes(dishesObj);
      setPages(updatedPages);
      setActivePageId(pages[0]?.pageId || 0);
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      if (useInitializeEditor.getState().isInitializeEditor === true) {
        useInitializeEditor.getState().setCanvasLoader(false);
        useInitializeEditor.getState().setIsSaving(false);
        useInitializeEditor.getState().setIsInitializeEditor(false);
        usePageStore.getState().resetChangedPageIds();
      }
    }
  }, [template]);

  const saveTemplate = useCallback(
    (value: string) => {
      setTemplateModal(true);
      setContent(value);
    },
    [templateModal, useInitializeEditor.getState().content]
  );

  const saveAutoSaveTemplate = useCallback(
    (value: string) => {
      setContent(value);
    },
    [useInitializeEditor.getState().content]
  );
  useDockOrder();
  useTabsActive();
  useCustomUIElementsEffect(input, setFontsError, setIsUploadFontModal, fontListTrigger);
  useTitleUIElementEffect(input, template);
  useRestrictToLeaveBeforeChanges();

  const onClosePreviewLink = useCallback(() => {
    setIsPreviewLink(false);
    setEmbedCode("");
    setPreviewLink("");
  }, [useInitializeEditor.getState().previewLink]);

  const saveData = useCallback(async () => {
    const startTime = performance.now();

    try {
      if (useInitializeEditor.getState().isNonAutoSaving && !template?.isAutoLayout) {
        toast.warning("Saving is in progress. Please try again after saving is complete.", {
          hideProgressBar: true,
          autoClose: 3000,
        });
        return;
      }

      if (!template?.isAutoLayout) {
        useInitializeEditor.getState().setIsNonAutoSaving(true);
        toast.info("Menu is saving", {
          hideProgressBar: true,
          autoClose: 1000,
        });
      }

      const engine = cesdkInstance.current?.engine;
      if (!engine) {
        throw new Error("Editor not ready for saving");
      }

      const rawScene = await engine.scene.saveToString(ALLOWED_RESOURCE_SCHEMES);
      const sceneStorageKey = getSceneStorageKey(template?.content, template?.isPSDImport);

      if (!sceneStorageKey) {
        throw new Error("Missing template storage key");
      }

      if (template?.isPSDImport) {
        try {
          const { savePSDArchive } = await import("./Utils/savePSDArchive");
          const result = await savePSDArchive(engine, template, undefined, sceneStorageKey);

          if (result.error) {
            console.error("Error saving PSD archive:", result.error);
          }
        } catch (archiveError) {
          console.error("Error creating archive for PSD template:", archiveError);
        }
      }

      saveAutoSaveTemplate(rawScene);
      const file = new Blob([rawScene], { type: "text/plain" });

      const { data: updateDietaryIconDatat, error: updateDietaryIconError } = await supabase
        .from("restaurants")
        .update({ dietaryIcons: useInitializeEditor.getState().dietaryIcons })
        .eq("id", template?.restaurant_id)
        .select();

      if (updateDietaryIconError) {
        throw new Error(`Error updating dietary Icons: ${updateDietaryIconError.message}`);
      }

      if (template?.isGlobal && user?.role === "flapjack") {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const { data: existingVersions, error: versionError } = await supabase
          .from("templates_versions")
          .select("*")
          .eq("templateId", template.id)
          .order("created_at", { ascending: false });

        if (versionError && versionError.code !== "PGRST116") {
          throw new Error(`Error checking template version: ${versionError.message}`);
        }

        const todayVersion = existingVersions?.find((version) => {
          const versionDate = new Date(version.created_at);
          return versionDate >= todayStart;
        });

        const versionFileName = todayVersion ? todayVersion.file : uuidV4();
        const newfileName = await uploadRevisionFile("template_versions", versionFileName, file);

        const versionData = {
          templateId: template.id,
          file: newfileName,
          updated_by: user.customer_name,
          created_at: new Date().toISOString(),
          menuName: template?.name,
          version: !!todayVersion
            ? Number(todayVersion.version)
            : existingVersions?.[0]?.version
            ? Number(existingVersions[0].version) + 1
            : 1,
        };

        if (todayVersion) {
          const { error: updateError } = await supabase
            .from("templates_versions")
            .update(versionData)
            .eq("id", todayVersion.id);
          if (updateError) {
            throw new Error(`Error updating template version: ${updateError.message}`);
          }
        } else {
          const { error: insertError } = await supabase
            .from("templates_versions")
            .insert(versionData);
          if (insertError) {
            throw new Error(`Error creating template version: ${insertError.message}`);
          }
        }
      }

      await uploadFile("templates", sceneStorageKey, file);

      await updateMenuSectionData(template!.id, template!.isAutoLayout);

      useInitializeEditor.getState().setIsNonAutoSaving(false);
      usePageStore.getState().setNaci(false);

      const saveTime = performance.now() - startTime;
      event("save_performance", {
        category: "Performance",
        label: "Save Time",
        value: Math.round(saveTime),
        template_id: template?.id,
        template_name: template?.name,
        is_auto_layout: template?.isAutoLayout,
      });

      if (!template?.isAutoLayout) {
        toast.success("Menu saved successfully!", {
          hideProgressBar: true,
          autoClose: 2000,
        });
      }
    } catch (error: any) {
      console.error("Error during saving:", error);
      event("save_performance_error", {
        category: "Error",
        label: "Save Failed",
        template_id: template?.id,
        error: error.message,
      });
      toast.error(`Error during saving: ${error.message}`);
      useInitializeEditor.getState().setIsNonAutoSaving(false);
    } finally {
      const versions = await supabase
        .from("templates_versions")
        .select("*")
        .eq("templateId", template?.id);
      setTemplateVersions(versions.data);
      useInitializeEditor.getState().setIsSaving(false);
      useInitializeEditor.getState().resetActivityId();
    }
  }, [isSaving, isCanvasLoader]);

  const debouncedSetModal = useCallback(
    debounce((value: boolean) => {
      if (template?.isAutoLayout) {
        setIsMenuUpdatedModalOpen(value);
      }
    }, 3000),
    [setIsMenuUpdatedModalOpen]
  );

  useEffect(() => {
    if (
      useInitializeEditor.getState().isInitializeEditor ||
      useInitializeEditor.getState().user.showMenuChange === true
    ) {
      return;
    }
    debouncedSetModal(true);
    return () => {
      debouncedSetModal.cancel();
    };
  }, [activityChangeId]);

  useLayoutEffect(() => {
    if (!isApplyMenu) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 50;

    function checkAndRender() {
      const pageStore = usePageStore.getState();
      const initStore = useInitializeEditor.getState();

      const pagesReady = pageStore.pages.length > 0;

      const hasChanges = pageStore.changedPageIds.size > 0 || !pageStore.naci;

      const editorReady = !initStore.isInitializeEditor && initStore.cesdkInstance.current;

      if (pagesReady && pageStore.naci && editorReady && !hasChanges) {
        initStore.setIsSaving(true);
        setNaci(false);
        saveData();
        debouncedSetModal.cancel();
        return;
      }

      if (pagesReady && hasChanges && editorReady) {
        const startRenderTime = performance.now();

        if (template?.isAutoLayout) {
          initStore.setCanvasLoader(true);
        }
        setNaci(false);

        if (!template?.isAutoLayout) {
          const renderTime = performance.now() - startRenderTime;
          event("menu_render_performance", {
            category: "Performance",
            label: "Menu Render Time",
            value: Math.round(renderTime),
            template_id: template?.id,
            template_name: template?.name,
            is_auto_layout: false,
          });
          initStore.setIsSaving(false);

          saveData();
          debouncedSetModal.cancel();
          return;
        }

        canvasLoader().then(() => {
          if (template?.isAutoLayout) {
            handleSections(() => {
              setTimeout(async () => {
                try {
                  await restoreUserLayerPositions(initStore.cesdkInstance.current?.engine);
                } catch (error) {
                  console.warn("Could not restore user layer positions after render:", error);
                }
              }, 100);

              const renderTime = performance.now() - startRenderTime;
              event("menu_render_performance", {
                category: "Performance",
                label: "Menu Render Time",
                value: Math.round(renderTime),
                template_id: template?.id,
                template_name: template?.name,
                is_auto_layout: true,
              });
              initStore.setCanvasLoader(false);
              canvasLoader().then(() => {
                initStore.setIsSaving(false);
                // Call saveData after rendering is complete
                saveData();
              });
            });
          }
        });

        debouncedSetModal.cancel();
      } else if (retryCount < MAX_RETRIES) {
        retryCount++;
        timeoutId = setTimeout(checkAndRender, 100);
      } else {
        console.error("Timeout waiting for store to be ready");
        initStore.setCanvasLoader(false);
        initStore.setIsSaving(false);
        setNaci(false);
      }
    }

    checkAndRender();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isApplyMenu]);

  useLayoutEffect(() => {
    changesQueued();
  }, [changedPageIds]);

  return (
    <div onClick={() => setinput(input + 1)}>
      <AuthDialog opened={isAuthDialogOpen} onClose={closeAuthDialog} />
      <MenuUpdateModal />
      {isPreviewLink && (
        <PreviewLinkModal
          onClose={onClosePreviewLink}
          clipboardUrl={clipboardUrl}
          clipboardEmbed={clipboardEmbed}
        />
      )}
      <StyleAllLayoutModal />
      <LoadingOverlay
        visible={useInitializeEditor.getState().isInitializeEditor}
        color="orange"
        loader={<Loader color="orange" size={"lg"} variant="dots" />}
        overlayBlur={20}
      />
      <div className={classes.wrapper}>
        <div
          className={`${classes.cesdkWrapper} ${
            preview ? "cesdkWrapperStylePreview" : "cesdkWrapperStyleWithoutPreview"
          }`}
        >
          <div ref={cesdkContainer} id="cesdkContainer" className="cesdkStyle"></div>
        </div>
        {template?.isGlobal && user?.role === "flapjack" && (
          <HistorySidebar
            onLoadVersion={(version, id) => {
              window.open(`history/${template?.id}?v=${version}`, "_blank");
            }}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}
      </div>
      {UploadFontModal(
        setFontsError,
        template,
        setloading,
        fontsError,
        loading,
        isUploadFontModal,
        setTitleFontSize,
        setFont,
        titleFontSize,
        font,
        setIsUploadFontModal,
        user,
        setFontListTrigger
      )}
      <SidebarConfig />
    </div>
  );
};

export default EditorConfig;
