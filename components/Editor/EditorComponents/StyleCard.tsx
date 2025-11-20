import React, { FC, useState } from "react";
import Icon from "next/image";
import { Card, Radio, Flex, Group, ActionIcon, Image } from "@mantine/core";
import EditIcon from "@Public/icons/editIcon.svg";
import DuplicateIcon from "@Public/icons/duplicateIcon.svg";
import DeleteIcon from "@Public/icons/deleteIcon.svg";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { supabase } from "@database/client.connection";
import { toast } from "react-toastify";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { v4 as uuidv4 } from "uuid";
import { design } from "../Utils/data";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";

interface ComponentLayout {
  id: number;
  elementPath: string;
  image: string;
  restaurantId: number;
  sectionId: string;
  layoutType: string;
  scenePath: string;
}

interface LayoutSelection {
  checked: boolean;
  layoutId: number | null;
  elementPath: string | null;
}

interface StyleCardProps {
  componentLayout: ComponentLayout;
  isAllLayout?: boolean;
  currentLayoutSelection: LayoutSelection;
  isDish: boolean;
  isInlineText: boolean;
  handleRadioChange: (layoutType: string, layoutId: number, elementPath: string) => void;
}

export const StyleCard: FC<StyleCardProps> = ({
  componentLayout,
  isAllLayout = false,
  handleRadioChange,
  currentLayoutSelection,
  isDish,
  isInlineText,
}) => {
  const setShowEngineModal = useInitializeEditor((state) => state.setShowEngineModal);
  const fetchComponentLayout = useSectionsStore((state) => state.fetchComponentLayout);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);
  const [isDuplicateLoading, setIsDuplicateLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);

  const isChecked = currentLayoutSelection?.layoutId === componentLayout.id;
  const cesdkInstance = useInitializeEditor((state) => state.cesdkInstance);

  const handleDuplicate = async () => {
    try {
      setIsDuplicateLoading(true);
      const newElementFileId = uuidv4();
      const newSceneFileId = uuidv4();

      const { data: elementData, error: elementError } = await supabase.storage
        .from("style_layouts")
        .download(componentLayout.elementPath);

      if (elementError) {
        throw new Error(`Failed to download element file: ${elementError.message}`);
      }

      const { data: sceneData, error: sceneError } = await supabase.storage
        .from("style_layouts")
        .download(componentLayout.scenePath);

      if (sceneError) {
        throw new Error(`Failed to download scene file: ${sceneError.message}`);
      }

      const [elementUpload, sceneUpload] = await Promise.all([
        supabase.storage.from("style_layouts").upload(newElementFileId, elementData),
        supabase.storage.from("style_layouts").upload(newSceneFileId, sceneData),
      ]);

      const componentLayoutResponse = await supabase
        .from("ComponentLayout")
        .insert({
          elementPath: elementUpload.data?.path,
          image: componentLayout.image,
          sectionId: componentLayout.sectionId,
          restaurantId: componentLayout.restaurantId,
          layoutType: componentLayout.layoutType,
          scenePath: sceneUpload.data?.path,
          menuId: usePageStore.getState().menuId,
        })
        .select("*")
        .single();

      if (!componentLayoutResponse?.data?.id) {
        toast.error("Error saving layout.");
        return;
      }

      fetchComponentLayout(usePageStore.getState().menuId);
      toast.success("Layout duplicated successfully");
    } catch (error) {
      console.error("Error duplicating layout:", error);
      toast.error("Failed to duplicate layout");
    } finally {
      setIsDuplicateLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleteLoading(true);
      const { oSections } = useSectionsStore.getState();
      const { oDishes, updateDishContent } = useDishesStore.getState();
      const { menuId } = usePageStore.getState();

      // Reset layout on all items that use it
      if (componentLayout.layoutType === "InlineText") {
        Object.entries(oDishes).forEach(([sectionId, dishes]) => {
          dishes.forEach((dish) => {
            if (dish.temp_inlineText_layout === componentLayout.id) {
              updateDishContent(sectionId, dish.id, "temp_inlineText_layout", 0);
            }
          });
        });
      } else {
        const layoutIdentifier =
          componentLayout.layoutType === "Dish" ? "temp_dish_layout" : "temp_title_layout";
        Object.values(oSections)
          .flat()
          .forEach((section) => {
            if (section[layoutIdentifier] === componentLayout.id) {
              useSectionsStore
                .getState()
                .setLayoutSelection(
                  section.pageId.toString(),
                  section.sectionId,
                  componentLayout.layoutType === "Dish",
                  { checked: false, layoutId: null, elementPath: null }
                );
            }
          });
      }

      // Delete layout files and database entry
      const deletePromises = [
        componentLayout.elementPath &&
          supabase.storage.from("style_layouts").remove([componentLayout.elementPath]),
        componentLayout.scenePath &&
          supabase.storage.from("style_layouts").remove([componentLayout.scenePath]),
        componentLayout.image &&
          supabase.storage.from("elementsThumbnail").remove([componentLayout.image]),
        supabase.from("ComponentLayout").delete().eq("id", componentLayout.id),
      ];

      await Promise.all(deletePromises);

      toast.success("Layout deleted successfully");
      fetchComponentLayout(menuId);
      incrementActivityChangeId();
    } catch (error) {
      console.error("Error during deletion:", error);
      toast.error(error instanceof Error ? error.message : "Error deleting layout");
    } finally {
      setIsDeleteLoading(false);
    }
  };

  return (
    <Card radius={8} className={`layout-card ${isChecked && "layout-card-active"}`}>
      <Flex align="center" justify="left" style={{ flexGrow: 1, height: "100%" }}>
        {componentLayout.image !== "undefined" && (
          <Image
            width={400}
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/elementsThumbnail/${componentLayout.image}`}
            alt="thumbnail"
          />
        )}
      </Flex>
      <Flex
        align="center"
        justify="space-between"
        style={{
          position: "absolute",
          bottom: "5px",
          left: "12px",
          right: "12px",
        }}
      >
        <Radio
          checked={isChecked}
          onClick={() =>
            handleRadioChange(
              componentLayout.layoutType,
              componentLayout.id,
              componentLayout.elementPath
            )
          }
          onChange={() => {}}
          styles={(theme) => ({
            radio: {
              borderColor: "#575757",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              border: isChecked ? "1px #575757 solid !important" : "2px #575757 solid !important",
              background: isChecked ? "white !important" : "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
            },
            icon: {
              width: "16px !important",
              height: "16px !important",
              border: "none !important",
              top: "16%",
              left: "17%",
              color: "#575757",
              maskSize: "1px",
            },
          })}
        />
        {isAllLayout && (
          <Group style={{ gap: "10px" }}>
            <Icon
              src={EditIcon}
              aria-disabled={isDuplicateLoading || isDeleteLoading}
              onClick={() =>
                !isDuplicateLoading &&
                !isDeleteLoading &&
                setShowEngineModal(false, "", componentLayout.scenePath, componentLayout.id)
              }
              style={{
                cursor: "pointer",
              }}
            />
            <ActionIcon
              loading={isDuplicateLoading}
              disabled={isDeleteLoading}
              onClick={handleDuplicate}
              style={{
                cursor: "pointer",
              }}
            >
              <Icon src={DuplicateIcon} />
            </ActionIcon>
            <ActionIcon
              loading={isDeleteLoading}
              disabled={isDuplicateLoading}
              onClick={handleDelete}
              style={{
                cursor: "pointer",
              }}
            >
              <Icon src={DeleteIcon} />
            </ActionIcon>
          </Group>
        )}
      </Flex>
    </Card>
  );
};
