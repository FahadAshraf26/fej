// @ts-nocheck
import React, { FC, memo, useCallback, useState } from "react";
import Image from "next/image";
import { DragDropContext, Droppable, OnDragEndResponder } from "react-beautiful-dnd";
import { RenderDishes } from "@Components/Editor/Sidebar/PageSidebar/ContentTab/RenderDishes";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { Text, Button, Grid, Col, Menu, FileButton } from "@mantine/core";
import addDishIcon from "@Public/icons/addDish.svg";
import spacerIcon from "@Public/icons/SpacerIcon.svg";
import triangleDownIcon from "@Public/icons/TriangleDown.svg";
import textIcon from "@Public/icons/textIcon.svg";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import imageIcon from "@Public/icons/imageIcon.svg";
import dishDragIcon from "@Public/icons/dishDragIcon.svg";
import { getMaxOrderPosition, imageUpload } from "../../../Utils/imageUpload";

export const DishRender: FC<{ columns: number }> = memo(({ columns }) => {
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [isSectionDividerMenuOpen, setIsSectionDividerMenuOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [dish, setDish] = useState("");
  const { addDish, addTextDish, updateSectionDishes, setSelectedDish } = useDishesStore();
  const dishesByColumns = useDishesStore((state) => state.getDishesByColumn());
  const sectionDivider = useDishesStore((state) => state.sectionDivider);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);

  const onDragEnd: OnDragEndResponder = useCallback(
    (result) => {
      incrementActivityChangeId();
      if (!result.destination) {
        return;
      }

      // Determine the source and destination column indexes dynamically
      const sourceColumnIndex = parseInt(result.source.droppableId.replace("column", "")) - 1;
      const destinationColumnIndex =
        parseInt(result.destination.droppableId.replace("column", "")) - 1;

      const updatedData: any = [...dishesByColumns];

      // Moving within the same column
      if (sourceColumnIndex === destinationColumnIndex) {
        const [movedItem] = updatedData[sourceColumnIndex].splice(result.source.index, 1);
        updatedData[destinationColumnIndex].splice(result.destination.index, 0, movedItem);
      } else {
        // Moving between columns
        const [movedItem] = updatedData[sourceColumnIndex].splice(result.source.index, 1);
        movedItem.column = destinationColumnIndex + 1; // Update the column for the moved item
        updatedData[destinationColumnIndex].splice(result.destination.index, 0, movedItem);
      }

      let updatedDishes: any = updatedData.map((columnDishes: any[], columnIndex: number) => {
        return columnDishes.map((dish, dishIndex) => ({
          ...dish,
          order_position: dishIndex,
          column: columnIndex + 1,
        }));
      });

      updateSectionDishes(updatedDishes.flat());
    },
    [dishesByColumns]
  );

  const handleAddDish = (columnIndex: number, isSpacer = false) => {
    const newOrderPosition = getMaxOrderPosition(columnIndex);
    let itemId = addDish(isSpacer, columnIndex + 1, newOrderPosition);
    setSelectedDish(itemId);
    useInitializeEditor.getState().incrementActivityChangeId();
  };

  const handleAddTextDish = (columnIndex: number) => {
    const newOrderPosition = getMaxOrderPosition(columnIndex);
    let itemId = addTextDish(columnIndex + 1, newOrderPosition);
    setSelectedDish(itemId);
    useInitializeEditor.getState().incrementActivityChangeId();
  };

  const openImageMenu = (index: number, dishName: string) => {
    setIsImageMenuOpen(false);
    setIsSectionDividerMenuOpen(false);
    if (dishName == "section-divider") {
      setIsSectionDividerMenuOpen(true);
    } else {
      setIsImageMenuOpen(true);
    }
    setDish(dishName);
    setMenuIndex(index);
  };

  const handleImageUpload = async (file: File, index: number) => {
    await imageUpload(file, index, dish === "inline-images", dish === "section-divider");
    setIsImageMenuOpen(false);
    setIsSectionDividerMenuOpen(false);
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        {dishesByColumns.map((dishes, index) => {
          return (
            <div
              style={{
                background: "#ffffff",
                padding: "15px 15px",
                borderRadius: 10,
                marginTop: "10px",
              }}
              key={index}
            >
              <Droppable key={index} droppableId={`column${index + 1}`} direction="vertical">
                {(provided, snapshot) => (
                  <div key={index} ref={provided.innerRef} {...provided.droppableProps}>
                    <Grid>
                      <Col span={12}>
                        <Text
                          style={{
                            fontSize: "14px",
                            fontFamily: "Satoshi-medium-500",
                            lineHeight: "18px",
                          }}
                        >{`Column ${index + 1}`}</Text>
                      </Col>
                      <Col span={12}>
                        <RenderDishes dishes={dishes} />
                      </Col>
                    </Grid>
                    {provided.placeholder as React.ReactNode}
                  </div>
                )}
              </Droppable>

              {(isImageMenuOpen || isSectionDividerMenuOpen) && index === menuIndex && (
                <div
                  style={{
                    padding: 0,
                    flexDirection: "column",
                  }}
                  className={`fj-section-container`}
                >
                  <div
                    style={{
                      width: "100%",
                    }}
                    className="fj-section-container-item"
                  >
                    <div className="fj-section-content" style={{ height: "auto" }}>
                      <Grid gutter="xs">
                        {dish !== "section-divider" ? (
                          <Col span={1}>
                            <div>
                              <Image src={dishDragIcon} width={20} height={20} alt="Drag Icon" />
                            </div>
                          </Col>
                        ) : null}
                        <Col span={dish !== "section-divider" ? 11 : 12}>
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
                              <Text size="sm" color="dimmed">
                                600 x 400
                              </Text>
                            </div>
                            <FileButton
                              onChange={(file) => handleImageUpload(file as File, index)}
                              accept="image/png,image/jpeg,image/svg+xml"
                            >
                              {(props) => <Button {...props}>Upload Image</Button>}
                            </FileButton>
                          </div>
                        </Col>
                      </Grid>
                    </div>
                  </div>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  background: "#C4461F",
                  borderRadius: 8,
                  overflow: "hidden",
                  marginTop: 12,
                }}
              >
                <Button
                  size="xl"
                  compact
                  leftIcon={<Image src={addDishIcon} alt="addDishIcon" />}
                  style={{
                    background: "transparent",
                    color: "#fff",
                    width: "100%",
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    borderTopLeftRadius: 8,
                    borderBottomLeftRadius: 8,
                    boxShadow: "none",
                  }}
                  radius={0}
                  onClick={() => handleAddDish(index)}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontFamily: "Satoshi-regular-400",
                      fontSize: "14px",
                      lineHeight: "18px",
                    }}
                  >
                    Add Dish
                  </Text>
                </Button>
                <div
                  style={{
                    width: 1,
                    height: 40,
                    background: "rgba(59, 59, 59, 0.4)",
                    alignSelf: "center",
                  }}
                />
                <Menu position="bottom-end" withArrow withinPortal>
                  <Menu.Target>
                    <Button
                      size="xl"
                      compact
                      style={{
                        background: "transparent",
                        color: "#fff",
                        width: 48,
                        minWidth: 48,
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderTopRightRadius: 8,
                        borderBottomRightRadius: 8,
                        boxShadow: "none",
                      }}
                      radius={0}
                    >
                      <Image src={triangleDownIcon} alt="dropdown" />
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      icon={<Image src={spacerIcon} alt="Spacer" width={20} height={20} />}
                      onClick={() => handleAddDish(index, true)}
                    >
                      Add Spacer
                    </Menu.Item>
                    <Menu.Item
                      icon={<Image src={textIcon} alt="Text" width={20} height={20} />}
                      onClick={() => handleAddTextDish(index)}
                    >
                      Add Text
                    </Menu.Item>
                    <Menu.Item
                      icon={<Image src={imageIcon} alt="Image" width={20} height={20} />}
                      onClick={() => openImageMenu(index, "inline-images")}
                    >
                      Add Image
                    </Menu.Item>
                    <Menu.Item
                      icon={
                        sectionDivider ? (
                          <Image
                            src={imageIcon}
                            alt="Section Divider"
                            width={20}
                            height={20}
                            style={{ opacity: 0.4 }}
                          />
                        ) : (
                          <Image src={imageIcon} alt="Section Divider" width={20} height={20} />
                        )
                      }
                      onClick={() => {
                        if (!sectionDivider) {
                          openImageMenu(index, "section-divider");
                        }
                      }}
                      disabled={sectionDivider}
                    >
                      {sectionDivider ? "Section Divider (Already Added)" : "Add Section Divider"}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>
            </div>
          );
        })}
      </DragDropContext>
    </>
  );
});
DishRender.displayName = "DishRender";
