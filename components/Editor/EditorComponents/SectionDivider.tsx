import {
  ActionIcon,
  Button,
  Col,
  FileButton,
  Grid,
  NumberInput,
  Text,
  Tooltip,
} from "@mantine/core";
import deleteIcon from "@Public/icons/deleteIcon.svg";
import Image from "next/image";
import { Dish } from "interfaces/Sidebar";
import { memo } from "react";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { imageUpload } from "../Utils/imageUpload";

interface SectionDividerProps {
  dish: Dish;
}

export const SectionDivider = memo(({ dish }: SectionDividerProps) => {
  const updateDishContent = useDishesStore((state) => state.updateDishContent);
  const sectionId = useSectionsStore((state) => state.selectedSection.sectionId);
  const removeDish = useDishesStore((state) => state.removeDish);
  const selectedDish = useDishesStore((state) => state.selectedDish);
  const setSelectedDish = useDishesStore((state) => state.setSelectedDish);
  const isSelected = selectedDish === dish.id;

  const handleImageUpload = async (file: File, dishId: number) => {
    await imageUpload(file, undefined, false, true, dishId);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const path = e.nativeEvent.composedPath();

    const clickedInsideContent = path.some(
      (element: any) =>
        element instanceof HTMLElement &&
        (element.className?.includes("fj-section-content") ||
          element.className?.includes("fj-section-container-item"))
    );

    if (clickedInsideContent) {
      setSelectedDish(isSelected ? -1 : dish.id);
    } else if (isSelected) {
      setSelectedDish(-1);
    }
  };

  const onInputMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  return (
    <div
      style={{
        padding: 0,
        flexDirection: "column",
      }}
      className={`fj-section-container ${isSelected ? "fj-dish-selected" : ""}`}
      onMouseUp={handleMouseUp}
    >
      <div
        style={{
          ...(isSelected && { border: "1px solid #ced4da", backgroundColor: "white" }),
          width: "100%",
        }}
        className={`fj-section-container-item`}
      >
        {!isSelected && (
          <>
            <div className="fj-section-content">
              <Grid align="center" gutter="xs">
                <Col span={11}>
                  <Text truncate="end">{dish.title}</Text>
                </Col>

                <Col span={1}>
                  <Tooltip label="Delete" position="top" withArrow className="fj-tooltip">
                    <ActionIcon
                      color="red"
                      variant="transparent"
                      size="xs"
                      onClick={() => removeDish(dish.frontend_id)}
                      onMouseUp={onInputMouseUp}
                    >
                      <Image src={deleteIcon} alt="Delete" />
                    </ActionIcon>
                  </Tooltip>
                </Col>

                <Col span={12}>
                  {dish.dividerImageUrl ? (
                    <img
                      src={dish.dividerImageUrl}
                      alt="preview"
                      style={{
                        width: "100%",
                        height: "12px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 120,
                        backgroundColor: "#f0f0f0",
                        borderRadius: 4,
                        marginTop: 4,
                      }}
                    />
                  )}
                </Col>
              </Grid>
            </div>
          </>
        )}

        {isSelected && (
          <div className="fj-section-content" style={{ height: "auto" }}>
            <Grid gutter="xs">
              <Col span={12}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div
                    style={{
                      width: "100%",
                      height: "120px",
                      border: "2px dashed #ced4da",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "#f8f9fa",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {dish.dividerImageUrl ? (
                      <img
                        src={dish.dividerImageUrl}
                        alt="uploaded image"
                        style={{ width: "100%", height: "auto", objectFit: "contain" }}
                      />
                    ) : (
                      <Text size="sm" color="dimmed">
                        600 x 400
                      </Text>
                    )}
                  </div>
                  <FileButton
                    onChange={(file) => handleImageUpload(file as File, dish.id)}
                    accept="image/png,image/jpeg,image/svg+xml"
                  >
                    {(props) => (
                      <Button {...props} onMouseUp={onInputMouseUp}>
                        Upload Image
                      </Button>
                    )}
                  </FileButton>
                  <NumberInput
                    label="Section divider height"
                    rightSection={<Text size="sm">in</Text>}
                    value={
                      dish.dividerImageHeightInches
                        ? Number(dish.dividerImageHeightInches)
                        : undefined
                    }
                    precision={2}
                    min={0}
                    step={0.1}
                    max={10}
                    onChange={(value) => {
                      updateDishContent(
                        sectionId,
                        dish.id,
                        "dividerImageHeightInches",
                        value?.toString() ?? ""
                      );
                    }}
                    onMouseUp={onInputMouseUp}
                  />
                </div>
              </Col>
            </Grid>
          </div>
        )}
      </div>
    </div>
  );
});

SectionDivider.displayName = "SectionDivider";
