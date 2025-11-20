import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { getImageDimensions } from ".";
import { uploadFile } from "@Helpers/UploadFile";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";

export const getMaxOrderPosition = (columnIndex: number) => {
  const dishesByColumns = useDishesStore.getState().getDishesByColumn();
  const dishes = dishesByColumns[columnIndex];
  if (!dishes || dishes.length === 0) return 0;
  return Math.max(...dishes.map((dish) => dish.order_position)) + 1;
};

const handleAddInlineImageDish = (columnIndex: number) => {
  const newOrderPosition = getMaxOrderPosition(columnIndex);
  let itemId = useDishesStore.getState().addInlineImageDish(columnIndex + 1, newOrderPosition);
  useDishesStore.getState().setSelectedDish(itemId);
  useInitializeEditor.getState().incrementActivityChangeId();
  return itemId;
};

const handleAddSectionDivider = (columnIndex: number) => {
  const newOrderPosition = getMaxOrderPosition(columnIndex);

  let itemId = useDishesStore.getState().addSectionDivider(columnIndex + 1, newOrderPosition);
  useDishesStore.getState().setSelectedDish(itemId);
  useInitializeEditor.getState().incrementActivityChangeId();
  return itemId;
};

export const imageUpload = async (
  file: File,
  columnIndex?: number,
  isInlineImage = false,
  isSectionDividerImage = false,
  dishId?: number
) => {
  const sectionId = useSectionsStore.getState().selectedSection.sectionId;
  const updateDishContent = useDishesStore.getState().updateDishContent;
  if (!file) return;
  try {
    let filePath = "";
    if (isInlineImage) {
      filePath = `${Date.now()}-inlineImage`;
    } else if (isSectionDividerImage) {
      filePath = `${Date.now()}-sectionDividerImage`;
    }
    const { width, height } = await getImageDimensions(file);
    await uploadFile("inline-images", filePath, file);
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inline-images/${filePath}`;
    if (isSectionDividerImage) {
      let id: number;
      if (dishId !== undefined) {
        id = dishId;
      } else if (columnIndex !== undefined) {
        id = handleAddSectionDivider(columnIndex);
      } else {
        return;
      }
      updateDishContent(sectionId, id, "dividerImageUrl", publicUrl);
      updateDishContent(sectionId, id, "dividerImageHeight", height);
      updateDishContent(sectionId, id, "dividerImageWidth", width);
    } else if (isInlineImage) {
      let id: number;
      if (dishId !== undefined) {
        id = dishId;
      } else if (columnIndex !== undefined) {
        id = handleAddInlineImageDish(columnIndex);
      } else {
        return;
      }
      updateDishContent(sectionId, id, "imageUrl", publicUrl);
      updateDishContent(sectionId, id, "imageWidth", width);
      updateDishContent(sectionId, id, "imageHeight", height);
    }
  } catch (error) {
    console.error(error);
  }
};
