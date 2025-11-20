import CreativeEditorSDK, { MimeType } from "@cesdk/cesdk-js";
import { useEffect, useRef, FC, useState, Dispatch, SetStateAction } from "react";
import classes from "./CESDKModal.module.css";
import { ElementEditorButton } from "../Sidebar/PageSidebar/StyleTab/ElementEditorButton";
import { supabase } from "@database/client.connection";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { IUserDetails } from "interfaces/IUserDetails";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { getFonts } from "@Components/Editor/Utils";
import { useCustomModalFont } from "./useCustomModalFont";
import { UploadEditorModalFontModal } from "../Utils/UploadFont/UploadEditorModalFontModal";
import { IFontError } from "interfaces/IFontError";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { Loader, LoadingOverlay } from "@mantine/core";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";

const useOnClickOutside = ({
  ref,
  callback,
  setIsLoaded,
  isSaving,
}: {
  ref: React.RefObject<HTMLDivElement>;
  callback: () => void;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  isSaving: boolean;
}) => {
  const handleClick = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node) && e.isTrusted && !isSaving) {
      setIsLoaded(false);
      callback();
    }
  };
  useEffect(() => {
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [ref, callback, isSaving]);
};

export const CESDKModal: FC<{ user: IUserDetails }> = ({ user }) => {
  const selectedSection = useSectionsStore((state) => state.selectedSection);
  const {
    isDefault,
    editElement,
    isDish,
    isInlineText,
    layoutId,
    sceneUrl,
    selectedDishIdForLayout,
    setSelectedDishIdForLayout,
    setShowEngineModal,
  } = useInitializeEditor((state) => ({
    isDefault: state.isDefault,
    editElement: state.editElement,
    isDish: state.isDish,
    isInlineText: state.isInlineText,
    layoutId: state.layoutId,
    sceneUrl: state.sceneUrl,
    selectedDishIdForLayout: state.selectedDishIdForLayout,
    setSelectedDishIdForLayout: state.setSelectedDishIdForLayout,
    setShowEngineModal: state.setShowEngineModal,
  }));
  const updateDishContent = useDishesStore((state) => state.updateDishContent);
  const fetchComponentLayout = useSectionsStore((state) => state.fetchComponentLayout);
  const { updateSectionLayoutSelected } = useSectionsStore.getState();

  const [isUploadFontModal, setIsUploadFontModal] = useState<boolean>(false);
  const [input, setinput] = useState<number>(1);
  const [fontsError, setFontsError] = useState<IFontError | undefined>();
  const [loading, setloading] = useState(false);
  const [titleFontSize, setTitleFontSize] = useState<any>("");
  const [font, setFont] = useState();
  const [isLoaded, setIsLoaded] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fontListTrigger, setFontListTrigger] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<CreativeEditorSDK | null>(null);

  useEffect(() => {
    if (containerRef.current && !instanceRef.current) {
      setIsLoaded(true);
      CreativeEditorSDK.create(containerRef.current, {
        license: process.env.REACT_APP_LICENSE,
        theme: "light",
        role: "Creator",
        ui: {
          elements: {
            navigation: {
              action: {
                save: true,
              },
            },
          },
          pageFormats: {
            "americal-letter": {
              default: true,
              width: 8.5,
              height: 11,
              unit: "Inch",
            },
            Legal: {
              width: 8.5,
              height: 14,
              unit: "Inch",
            },
            Tabloid: {
              width: 11,
              height: 17,
              unit: "Inch",
            },
            "Half Letter": {
              width: 5.5,
              height: 8.5,
              unit: "Inch",
            },
            "Quarter Letter": {
              width: 4.25,
              height: 5.5,
              unit: "Inch",
            },
          },
          typefaceLibraries: ["my-custom-modal-typefaces", "ly.img.typeface"],
        },
        callbacks: {
          onSave: async (sceneString: string) => {
            try {
              setIsSaving(true);
              const pages = instanceRef.current?.engine.scene.getPages();
              const firstPage = pages?.[0];

              if (!firstPage) {
                toast.error("Could not find a page in the design to save.");
                setIsSaving(false);
                return;
              }

              const topLevelChildren =
                instanceRef.current?.engine.block.getChildren(firstPage) || [];
              let blocksToExport: number[] = [];

              if (isInlineText) {
                blocksToExport = topLevelChildren;
              } else {
                const groups = topLevelChildren.filter(
                  (id) => instanceRef.current?.engine.block.getType(id) === "//ly.img.ubq/group"
                );
                if (groups.length > 0) {
                  const groupChildren =
                    instanceRef.current?.engine.block.getChildren(groups[groups.length - 1]) || [];
                  blocksToExport = groupChildren;
                } else if (topLevelChildren.length > 0) {
                  blocksToExport = topLevelChildren;
                }
              }

              if (blocksToExport.length === 0) {
                toast.error("No content found on the page to save as a layout.");
                setIsSaving(false);
                return;
              }

              const { data: sectionExists } = await supabase
                .from("sections")
                .select("sectionId")
                .eq("sectionId", selectedSection.sectionId)
                .single();

              const finalSectionId = sectionExists ? selectedSection.sectionId : null;

              const options = { pngCompressionLevel: 0 };
              const generatedString = await instanceRef.current?.engine.block.saveToString(
                blocksToExport
              );
              // Use the first block for the thumbnail preview
              const blob = await instanceRef.current?.engine.block.export(
                blocksToExport[0],
                MimeType.Png,
                options
              );

              let elementPath, scenePath, imagePath;

              const elementFileId = uuidv4();
              const sceneFileId = uuidv4();
              const thumbnailFileId = uuidv4();

              const [elementUpload, sceneUpload, thumbnailUpload] = await Promise.all([
                supabase.storage
                  .from("style_layouts")
                  .upload(elementFileId, new Blob([generatedString!], { type: "text/plain" })),
                supabase.storage
                  .from("style_layouts")
                  .upload(sceneFileId, new Blob([sceneString], { type: "text/plain" })),
                supabase.storage.from("elementsThumbnail").upload(thumbnailFileId, blob!),
              ]);

              if (
                !elementUpload.data?.path ||
                !sceneUpload.data?.path ||
                !thumbnailUpload.data?.path
              ) {
                throw new Error("Failed to upload files");
              }

              elementPath = elementUpload.data.path;
              scenePath = sceneUpload.data.path;
              imagePath = thumbnailUpload.data.path;

              const layoutData = {
                elementPath,
                scenePath,
                image: imagePath,
                sectionId: finalSectionId,
                restaurantId: Number(user.restaurant_id),
                layoutType: isDish ? "Dish" : isInlineText ? "InlineText" : "Section",
                menuId: usePageStore.getState().menuId,
              };

              let savedLayoutId;

              if (layoutId !== 0) {
                const { data: existingLayout, error: fetchError } = await supabase
                  .from("ComponentLayout")
                  .select("elementPath, scenePath, image")
                  .eq("id", layoutId)
                  .single();

                if (fetchError) {
                  throw new Error(`Failed to fetch existing layout: ${fetchError.message}`);
                }

                const deletePromises = [
                  existingLayout.elementPath &&
                    supabase.storage.from("style_layouts").remove([existingLayout.elementPath]),
                  existingLayout.scenePath &&
                    supabase.storage.from("style_layouts").remove([existingLayout.scenePath]),
                  existingLayout.image &&
                    supabase.storage.from("elementsThumbnail").remove([existingLayout.image]),
                ];

                await Promise.allSettled(deletePromises);

                const { data, error } = await supabase
                  .from("ComponentLayout")
                  .update(layoutData)
                  .eq("id", layoutId)
                  .select()
                  .single();

                if (error || !data) throw new Error("Error updating layout");
                savedLayoutId = data.id;
              } else {
                const { data, error } = await supabase
                  .from("ComponentLayout")
                  .insert(layoutData)
                  .select()
                  .single();
                if (error || !data) throw new Error("Error saving new layout");
                savedLayoutId = data.id;
              }

              if (isInlineText && selectedDishIdForLayout && savedLayoutId) {
                updateDishContent(
                  selectedSection.sectionId,
                  selectedDishIdForLayout,
                  "temp_inlineText_layout",
                  savedLayoutId
                );
                toast.success("Inline text style applied successfully!");
                setSelectedDishIdForLayout(null);
              } else if (!isInlineText) {
                await updateSectionLayoutSelected(
                  selectedSection.pageId.toString(),
                  selectedSection.sectionId,
                  isDish,
                  savedLayoutId,
                  elementPath,
                  true
                );
                toast.success("Layout saved successfully");
              }
            } catch (error: any) {
              toast.error(error.message);
            } finally {
              setIsSaving(false);
              setShowEngineModal();
              fetchComponentLayout(usePageStore.getState().menuId);
            }
          },
        },
      }).then(async (instance) => {
        instance.addDefaultAssetSources();
        instance.addDemoAssetSources({ sceneMode: "Design" });
        await instance.createDesignScene();
        instance.ui.setCanvasBarOrder([], "bottom");
        ElementEditorButton(instance, []);
        const templateFonts = useInitializeEditor.getState().fonts;
        instance.engine.asset.addLocalSource("my-custom-modal-typefaces");
        getFonts(templateFonts).map((font: any) => {
          instance.engine.asset.addAssetToSource("my-custom-modal-typefaces", font);
        });
        setinput(input + 1);
        if (isDefault) {
          await instance.engine.scene.loadFromURL(sceneUrl);
        } else {
          await instance.engine.scene.loadFromURL(editElement);
        }
        instanceRef.current = instance;
        setIsLoaded(false);
      });
      return () => {
        if (instanceRef.current) {
          instanceRef.current.dispose();
          instanceRef.current = null;
        }
      };
    }
  }, [containerRef]);

  useOnClickOutside({
    ref: containerRef,
    callback: () => setShowEngineModal(),
    setIsLoaded,
    isSaving,
  });

  useCustomModalFont({ setIsUploadFontModal, input, fontListTrigger });

  return (
    <div className={classes.overlay} onClick={() => setinput(input + 1)}>
      <LoadingOverlay
        visible={isLoaded}
        color="orange"
        loader={<Loader color="orange" size={"lg"} variant="dots" />}
        overlayBlur={30}
      />
      <div className={classes.modal}>
        {isUploadFontModal &&
          UploadEditorModalFontModal(
            setFontsError,
            null,
            setloading,
            fontsError,
            loading,
            isUploadFontModal,
            setTitleFontSize,
            setFont,
            titleFontSize,
            font,
            setIsUploadFontModal,
            setFontListTrigger,
            instanceRef
          )}
        <div ref={containerRef} className={classes.cesdkContainer}></div>
      </div>
    </div>
  );
};
