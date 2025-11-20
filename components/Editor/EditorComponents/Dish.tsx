import React, { useState, useEffect, memo } from "react";
import Image from "next/image";
import { Dish } from "@Interfaces/";
import { DietaryIconInput } from "@Components/Editor/EditorComponents/DietaryIconInput";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import {
  Grid,
  Col,
  Input,
  ActionIcon,
  Text,
  NumberInput,
  Textarea,
  UnstyledButton,
  Group,
  Tooltip,
  FileButton,
  Button,
} from "@mantine/core";
import dishDragIcon from "@Public/icons/dishDragIcon.svg";
import duplicateIcon from "@Public/icons/duplicateIcon.svg";
import deleteIcon from "@Public/icons/deleteIcon.svg";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import InsertPlus from "@Public/icons/InsertPlus.svg";
import { DishBorderUpload } from "./DishBorderUpload";
import { imageUpload } from "../Utils/imageUpload";

interface DishProps {
  dish: Dish;
  provided: any;
  snapshot: any;
}
type dishDetail = {
  title: string;
  description: string;
  price: string;
};
const areDishDetailsEqual = (detail1: dishDetail, detail2: dishDetail) => {
  return (
    detail1.title === detail2.title &&
    detail1.description === detail2.description &&
    detail1.price === detail2.price
  );
};

export const DishItem = memo(({ dish, provided, snapshot }: DishProps) => {
  const [uploading, setUploading] = useState(false);
  const [imageHeightInches, setImageHeightInches] = useState(dish.imageHeightInches);
  const sectionId = useSectionsStore((state) => state.selectedSection.sectionId);
  const selectedDish = useDishesStore((state) => state.selectedDish);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);
  const setSelectedDish = useDishesStore((state) => state.setSelectedDish);
  const updateDishContent = useDishesStore((state) => state.updateDishContent);

  const isSelected = selectedDish === dish.id;
  const MIN_SPACER_HEIGHT = 0;
  const MAX_SPACER_HEIGHT = 6;
  const CLICK_TOLERANCE = 5;

  const [dishDetail, setDishDetail] = useState({
    title: dish?.title || "",
    description: dish?.description || "",
    price: dish?.price || "",
    addOns: dish?.addOns || "",
    secondPrice: dish?.secondPrice || "",
    dietaryIcons: dish?.dietaryIcons || [],
  });
  const [originalDetail, setOriginalDetail] = useState(dishDetail);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const duplicateDish = useDishesStore((state) => state.duplicateDish);
  const removeDish = useDishesStore((state) => state.removeDish);
  const updateSpacerHeight = useDishesStore((state) => state.updateSpacerHeight);
  const dishAddOns = useDishesStore((state) => state.dishAddOns);
  const dishDietaryIcons = useDishesStore((state) => state.dishDietaryIcons);
  const setDishAddOns = useDishesStore((state) => state.setDishAddOns);
  const setDietaryIcon = useDishesStore((state) => state.setDietaryIconInputVisible);
  const spacerObj = typeof dish.spacer === "string" ? JSON.parse(dish.spacer) : dish.spacer;

  const layoutSettings = useDishesStore((state) => state.layoutSettings);
  const isJustifyContent = Boolean(
    dish.section &&
      (layoutSettings[dish.section]?.isJustifyPriceCenter ||
        layoutSettings[dish.section]?.isJustifyPriceTop)
  );
  const showAddonInput =
    (dishDetail.addOns !== null &&
      dishDetail.addOns !== undefined &&
      dishDetail.addOns.trim().length > 0) ||
    dishAddOns[sectionId]?.[dish.id.toString()]?.checked;
  const showDietaryIconInput =
    dishDietaryIcons[sectionId]?.[dish.id.toString()]?.checked || dish.dietaryIcons;
  const onChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    incrementActivityChangeId();
    setDishDetail((prevDetail) => ({
      ...prevDetail,
      [e.target.name]: e.target.value,
    }));
    updateDishContent(sectionId, dish.id, e.target.name, e.target.value);
  };

  const onBlurHandler = (field: keyof typeof dishDetail) => {
    if (dishDetail[field] !== originalDetail[field]) {
      updateDishContent(sectionId, dish.id, field, dishDetail[field]);
      setOriginalDetail(dishDetail);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartPos({ x: e.clientX, y: e.clientY });
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (
      Math.abs(e.clientX - startPos.x) > CLICK_TOLERANCE ||
      Math.abs(e.clientY - startPos.y) > CLICK_TOLERANCE
    ) {
      setIsDragging(true);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement) {
      const path = e.nativeEvent.composedPath();

      const hasMarginElement = path.some((element: any) => {
        return (
          element.id &&
          (element.id.includes("dish-margin-container-") || element.id.includes("dish-margin-"))
        );
      });

      if (hasMarginElement) {
        return;
      }

      const isSectionContentClick = path.some((element: any) => {
        if (element instanceof HTMLElement) {
          return (
            element.className?.includes("fj-section-content") ||
            element.className?.includes("fj-section-container-item")
          );
        }
        return false;
      });

      if (isSectionContentClick && isSelected && dish.id === selectedDish) {
        setSelectedDish(-1);
        return;
      }

      if (isSelected) {
        const isContentClick = path.some((element: any) => {
          if (element instanceof HTMLElement) {
            const borderContainer = element.closest(".dish-border-container");
            if (borderContainer) {
              return true;
            }

            const isMatch =
              element.className?.includes("fj-section-content") ||
              element.className?.includes("MultiSelect") ||
              element.className?.includes("mantine-Select") ||
              element.className?.includes("dish-content-col") ||
              element.className?.includes("dish-border-modal") ||
              element.className?.includes("dish-border-switch") ||
              element.className?.includes("fj-section-container-item");

            return isMatch;
          }
          return false;
        });

        if (isContentClick) {
          return;
        } else {
          setSelectedDish(-1);
        }
      }
    }

    if (!isDragging) {
      if (!isSelected) {
        const fields: (keyof typeof dishDetail)[] = [
          "title",
          "description",
          "price",
          "secondPrice",
          "addOns",
        ];
        fields.forEach((field) => {
          if (dishDetail[field] !== originalDetail[field]) {
            updateDishContent(sectionId, dish.id, field, dishDetail[field]);
          }
        });
        setOriginalDetail(dishDetail);
      }
      setSelectedDish(isSelected ? -1 : dish.id);
    }
    setIsDragging(false);
  };

  const onInputMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isSelected && !areDishDetailsEqual(dishDetail, originalDetail)) {
      const fields: (keyof typeof dishDetail)[] = [
        "title",
        "description",
        "price",
        "secondPrice",
        "addOns",
      ];
      fields.forEach((field) => {
        if (dishDetail[field] !== originalDetail[field]) {
          updateDishContent(sectionId, dish.id, field, dishDetail[field]);
        }
      });
      setOriginalDetail(dishDetail);
    }
  }, [isSelected]);

  useEffect(() => {
    setDishAddOns(sectionId, dish.id.toString(), false);
    setImageHeightInches(dish.imageHeightInches);
  }, [isSelected]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeDish(dish.frontend_id);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, removeDish, dish.frontend_id]);

  const shouldShowTooltip = (priceText: any) => {
    // Show tooltip if price is longer than 2 characters
    return priceText && priceText.toString().length > 2;
  };

  const getTruncatedText = (priceText: any) => {
    if (shouldShowTooltip(priceText)) {
      const text = priceText.toString();
      return `${text.substring(0, 5)}...`;
    }
    return priceText;
  };

  const DishPrice = ({
    dish,
    spacerObj,
    isJustifyContent,
  }: {
    dish: Dish;
    spacerObj: Dish["spacer"];
    isJustifyContent: boolean;
  }) => {
    if (dish.isSpacer) {
      const height = spacerObj?.height ?? 0;
      return (
        <Col span={3}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              overflow: "hidden",
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: "16px",
                fontFamily: "Satoshi-medium-500",
                color: "#3B3B3B",
                textAlign: "right",
              }}
            >
              {height.toFixed(2)} in
            </Text>
          </div>
        </Col>
      );
    }

    const hasBothPrices = dish.price != null && dish.secondPrice != null;

    const mainPrice = dish.price ?? "--";
    const secondaryPrice = dish.secondPrice ?? "--";

    return (
      <Col span={3}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            overflow: "hidden",
            width: "100%",
            gap: "4px", // Reduced gap for a tighter look
          }}
        >
          <Tooltip
            label={mainPrice}
            position="top"
            withArrow
            disabled={!shouldShowTooltip(mainPrice)}
          >
            <Text
              truncate="end"
              style={{
                fontSize: "16px",
                fontFamily: "Satoshi-medium-500",
                color: "#3B3B3B",
                textAlign: "right",
              }}
            >
              {mainPrice}
            </Text>
          </Tooltip>

          {hasBothPrices && (
            <Tooltip
              label={secondaryPrice}
              position="top"
              withArrow
              disabled={!shouldShowTooltip(secondaryPrice)}
            >
              <Text
                truncate="end"
                style={{
                  fontSize: "14px",
                  fontFamily: "Satoshi-regular-400",
                  color: "#6B6B6B",
                  textAlign: "right",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  marginTop: "-2px",
                }}
              >
                {secondaryPrice}
              </Text>
            </Tooltip>
          )}
        </div>
      </Col>
    );
  };
  const spacerHeight = Number(spacerObj?.height ?? 0);

  const handleImageUpload = async (file: File, dishId: number) => {
    await imageUpload(file, undefined, true, false, dishId);
  };

  // Add text dish rendering
  if (dish.type === "inlineText") {
    return (
      <div
        style={{
          padding: 0,
          flexDirection: "column",
          ...(snapshot?.isDragging && {
            transform: "rotate(-2deg)",
          }),
        }}
        className={`fj-section-container ${isSelected ? "fj-dish-selected" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          style={{
            ...(isSelected && {
              border: "1px solid #ced4da",
              backgroundColor: "white",
            }),
            width: "100%",
            ...(snapshot?.isDragging && {
              border: isSelected ? "none" : "2px solid #14324d",
              backgroundColor: "#fff",
              height: isSelected ? 92 : 75,
            }),
          }}
          className={`fj-section-container-item`}
        >
          {!isSelected && (
            <div
              {...provided.dragHandleProps}
              style={{
                maxHeight: "22px",
                minHeight: "22px",
                ...(snapshot?.isDragging && {
                  backgroundColor: "#576C7F",
                }),
              }}
              className="fj-section-handler"
            >
              <Image src={dishDragIcon} width={20} height={20} alt="Drag Icon" />
            </div>
          )}

          {!isSelected && (
            <div className="fj-section-content">
              <div
                style={{
                  textAlign: "left",
                  width: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <Grid align="center" gutter="xs">
                  <Col span={10} className="dish-content-col">
                    <Text
                      style={{
                        fontFamily: "Satoshi-regular-400",
                        fontSize: "16px",
                      }}
                    >
                      <Text truncate={"end"}>
                        {dish?.title !== null ? dish?.title : "Text Block"}
                      </Text>
                    </Text>
                  </Col>
                  <Col span={1}>
                    <Tooltip label="Duplicate Dish" position="top" withArrow>
                      <ActionIcon
                        variant="transparent"
                        size="xs"
                        onClick={() => duplicateDish(dish.id)}
                        onMouseUp={onInputMouseUp}
                      >
                        <Image src={duplicateIcon} alt="Duplicate" />
                      </ActionIcon>
                    </Tooltip>
                  </Col>
                  <Col span={1}>
                    <Tooltip label="Delete Dish" position="top" withArrow>
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
                </Grid>
              </div>
            </div>
          )}

          {isSelected && (
            <div
              className="fj-section-content"
              style={{
                height: isSelected ? "auto" : 0,
              }}
            >
              <Grid gutter="xs">
                <Col span={1}>
                  <div
                    {...provided.dragHandleProps}
                    style={{
                      maxHeight: "22px",
                      minHeight: "22px",
                      ...(snapshot?.isDragging && {
                        backgroundColor: "#576C7F",
                      }),
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Image src={dishDragIcon} width={20} height={20} alt="Drag Icon" />
                  </div>
                </Col>
                <Col span={11}>
                  <Textarea
                    autosize
                    name="title"
                    value={dishDetail.title}
                    placeholder="Enter text..."
                    minRows={0}
                    onChange={onChangeHandler}
                    onBlur={() => onBlurHandler("title")}
                    radius="md"
                    onClick={(e) => e.stopPropagation()}
                    onMouseUp={onInputMouseUp}
                    styles={{
                      input: {
                        fontFamily: "Satoshi-regular-400",
                        fontSize: "14px",
                        color: "#252525",
                        overflow: "hidden",
                        lineHeight: "1.2em",
                        paddingTop: "8px",
                      },
                    }}
                  />
                </Col>
              </Grid>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Add image dish rendering
  if (dish.type === "inlineImage") {
    return (
      <div
        style={{
          padding: 0,
          flexDirection: "column",
          ...(snapshot?.isDragging && { transform: "rotate(-2deg)" }),
        }}
        className={`fj-section-container ${isSelected ? "fj-dish-selected" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          style={{
            ...(isSelected && { border: "1px solid #ced4da", backgroundColor: "white" }),
            width: "100%",
            ...(snapshot?.isDragging && {
              border: isSelected ? "none" : "2px solid #14324d",
              backgroundColor: "#fff",
              height: isSelected ? 180 : 75,
            }),
          }}
          className={`fj-section-container-item`}
        >
          {!isSelected && (
            <>
              <div {...provided.dragHandleProps} className="fj-section-handler">
                <Image src={dishDragIcon} width={20} height={20} alt="Drag Icon" />
              </div>
              <div className="fj-section-content">
                <Grid align="center" gutter="xs">
                  <Col span={2}>
                    {dish.imageUrl ? (
                      <img
                        src={dish.imageUrl}
                        alt="preview"
                        style={{
                          borderRadius: 4,
                          objectFit: "cover",
                          width: "100%",
                          height: "auto",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: "#f0f0f0",
                          borderRadius: 4,
                        }}
                      />
                    )}
                  </Col>
                  <Col span={7}>
                    <Text truncate="end">{dish.title}</Text>
                  </Col>
                  <Col span={1}>
                    <Tooltip label="Duplicate" position="top" withArrow>
                      <ActionIcon
                        variant="transparent"
                        size="xs"
                        onClick={() => duplicateDish(dish.id)}
                        onMouseUp={onInputMouseUp}
                      >
                        <Image src={duplicateIcon} alt="Duplicate" />
                      </ActionIcon>
                    </Tooltip>
                  </Col>
                  <Col span={1}>
                    <Tooltip label="Delete" position="top" withArrow>
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
                </Grid>
              </div>
            </>
          )}

          {isSelected && (
            <div className="fj-section-content" style={{ height: "auto" }}>
              <Grid gutter="xs">
                <Col span={1}>
                  <div {...provided.dragHandleProps}>
                    <Image src={dishDragIcon} width={20} height={20} alt="Drag Icon" />
                  </div>
                </Col>
                <Col span={11}>
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
                      {dish.imageUrl ? (
                        <img
                          src={dish.imageUrl}
                          alt="uploaded image"
                          onMouseUp={onInputMouseUp}
                          style={{ width: "100%", height: "auto", objectFit: "contain" }}
                        />
                      ) : (
                        <Text size="sm" color="dimmed" onMouseUp={onInputMouseUp}>
                          600 x 400
                        </Text>
                      )}
                    </div>
                    <FileButton
                      onChange={(file) => handleImageUpload(file as File, dish.id)}
                      accept="image/png,image/jpeg,image/svg+xml"
                    >
                      {(props) => (
                        <Button {...props} loading={uploading} onMouseUp={onInputMouseUp}>
                          Upload Image
                        </Button>
                      )}
                    </FileButton>
                    <NumberInput
                      label="Image height"
                      rightSection={<Text size="sm">in</Text>}
                      value={dish.imageHeightInches ? Number(dish.imageHeightInches) : undefined}
                      precision={2}
                      min={0}
                      step={0.1}
                      max={10}
                      onChange={(value) => {
                        setImageHeightInches(value);
                        updateDishContent(
                          sectionId,
                          dish.id,
                          "imageHeightInches",
                          value?.toString() ?? ""
                        );
                      }}
                      onMouseUp={onInputMouseUp}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                    />
                  </div>
                </Col>
              </Grid>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 0,
        flexDirection: "column",
        ...(snapshot?.isDragging && {
          transform: "rotate(-2deg)",
        }),
      }}
      className={`fj-section-container ${isSelected ? "fj-dish-selected" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        style={{
          ...(isSelected && {
            border: "1px solid #ced4da",
            backgroundColor: "white",
          }),
          width: "100%",
          ...(snapshot?.isDragging && {
            border: isSelected ? "none" : "2px solid #14324d",
            backgroundColor: "#fff",
            height: dish.isSpacer ? (isSelected ? 92 : 75) : 116,
          }),
        }}
        className={`fj-section-container-item `}
      >
        {!isSelected && (
          <div
            {...provided.dragHandleProps}
            style={{
              maxHeight: "22px",
              minHeight: "22px",
              ...(snapshot?.isDragging && {
                backgroundColor: "#576C7F",
              }),
            }}
            className="fj-section-handler"
          >
            <Image src={dishDragIcon} width={20} height={20} alt="Drag Icon" />
          </div>
        )}

        {!isSelected && (
          <div className="fj-section-content">
            <div
              style={{
                textAlign: "left",
                width: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Grid align="center" gutter="xs">
                <Col
                  span={dish.type !== "sectionTitle" ? (dish.type === "spacer" ? 7 : 7) : 10}
                  className="dish-content-col"
                >
                  <Text
                    style={{
                      fontFamily: "Satoshi-regular-400",
                      fontSize: "16px",
                    }}
                  >
                    <Text truncate={"end"}>
                      {dish?.title !== null ? dish?.title : dish.placeholderTitle}
                    </Text>
                  </Text>
                  {dish.type !== "sectionTitle" &&
                    dish.type !== "spacer" &&
                    dish?.description !== null && (
                      <Text
                        style={{
                          fontSize: "12px",
                          fontFamily: "Satoshi-regular-400",
                          color: "#575757",
                        }}
                      >
                        <Text truncate={"end"}>{dish?.description}</Text>
                      </Text>
                    )}
                </Col>
                {dish.type !== "sectionTitle" && (
                  <DishPrice
                    dish={dish}
                    spacerObj={spacerObj}
                    isJustifyContent={isJustifyContent}
                  />
                )}
                <Col span={1}>
                  <Tooltip label="Duplicate Dish" position="top" withArrow>
                    <ActionIcon
                      variant="transparent"
                      size="xs"
                      onClick={() => duplicateDish(dish.id)}
                      onMouseUp={onInputMouseUp}
                    >
                      <Image src={duplicateIcon} alt="Duplicate" />
                    </ActionIcon>
                  </Tooltip>
                </Col>
                <Col span={1}>
                  <Tooltip label="Delete Dish" position="top" withArrow>
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
              </Grid>
            </div>
          </div>
        )}

        {!dish.isSpacer && isSelected && (
          <div
            className="fj-section-content"
            style={{
              height: isSelected ? "auto" : 0,
            }}
          >
            <Grid gutter="xs">
              <Col span={1}>
                <div
                  {...provided.dragHandleProps}
                  style={{
                    maxHeight: "22px",
                    minHeight: "22px",
                    ...(snapshot?.isDragging && {
                      backgroundColor: "#576C7F",
                    }),
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image src={dishDragIcon} width={20} height={20} alt="Drag Icon" />
                </div>
              </Col>
              <Col span={dish.type !== "sectionTitle" ? (isJustifyContent ? 7 : 8) : 11}>
                <Textarea
                  autosize
                  name="title"
                  value={dishDetail.title}
                  placeholder={dish.placeholderTitle}
                  minRows={0}
                  onChange={onChangeHandler}
                  onBlur={() => onBlurHandler("title")}
                  radius="md"
                  onClick={(e) => e.stopPropagation()}
                  onMouseUp={onInputMouseUp}
                  styles={{
                    input: {
                      fontFamily: "Satoshi-regular-400",
                      fontSize: "14px",
                      color: "#252525",
                      overflow: "hidden",
                      lineHeight: "1.2em",
                      paddingTop: "8px",
                    },
                  }}
                />
              </Col>
              {dish.type !== "sectionTitle" && (
                <>
                  <Col span={isJustifyContent ? 2 : 3}>
                    <Input
                      name="price"
                      value={dishDetail.price}
                      placeholder={
                        dish.placeholderPrice === "12" || dish.placeholderPrice === "10"
                          ? "00"
                          : dish.placeholderPrice
                      }
                      onChange={onChangeHandler}
                      onBlur={() => onBlurHandler("price")}
                      radius="md"
                      onClick={(e) => e.stopPropagation()}
                      onMouseUp={onInputMouseUp}
                      styles={{
                        input: {
                          fontFamily: "Satoshi-regular-400",
                          fontSize: "14px",
                          color: "#252525",
                          height: "39px",
                        },
                      }}
                    />
                  </Col>
                  {isJustifyContent && (
                    <Col span={2}>
                      <Input
                        name="secondPrice"
                        value={dishDetail.secondPrice}
                        placeholder="00"
                        onChange={onChangeHandler}
                        onBlur={() => onBlurHandler("secondPrice")}
                        radius="md"
                        onClick={(e) => e.stopPropagation()}
                        onMouseUp={onInputMouseUp}
                        styles={{
                          input: {
                            fontFamily: "Satoshi-regular-400",
                            fontSize: "14px",
                            color: "#252525",
                            height: "39px",
                          },
                        }}
                      />
                    </Col>
                  )}
                  <Col span={1}></Col>
                  <Col span={11}>
                    <Textarea
                      autosize
                      name="description"
                      value={dishDetail.description}
                      placeholder={dish.placeholderDescription}
                      minRows={0}
                      onChange={onChangeHandler}
                      onBlur={() => onBlurHandler("description")}
                      radius="md"
                      onClick={(e) => e.stopPropagation()}
                      onMouseUp={onInputMouseUp}
                      styles={{
                        input: {
                          fontFamily: "Satoshi-regular-400",
                          fontSize: "14px",
                          color: "#252525",
                          overflow: "hidden",
                          lineHeight: "1.2em",
                          paddingTop: "8px",
                        },
                      }}
                    />
                    {showAddonInput && (
                      <Textarea
                        autosize
                        name="addOns"
                        placeholder="Add-On"
                        value={dishDetail.addOns!}
                        radius={"md"}
                        mt="xs"
                        onChange={onChangeHandler}
                        onBlur={() => onBlurHandler("addOns")}
                        onClick={(e) => e.stopPropagation()}
                        onMouseUp={onInputMouseUp}
                        styles={{
                          input: {
                            fontFamily: "Satoshi-regular-400",
                            fontSize: "14px",
                            color: "#252525",
                            overflow: "hidden",
                            lineHeight: "1.2em",
                            paddingTop: "8px",
                          },
                        }}
                      />
                    )}
                    {showDietaryIconInput && (
                      <DietaryIconInput
                        sectionId={sectionId}
                        dishId={dish.id}
                        dietaryIcons={dish.dietaryIcons}
                      />
                    )}
                  </Col>
                  <Col span={1}></Col>
                  <Col span={11}>
                    <Group spacing="xs">
                      {!showAddonInput && (
                        <UnstyledButton
                          onClick={() => {
                            setDishAddOns(sectionId, dish.id.toString(), true);
                          }}
                          onMouseUp={onInputMouseUp}
                        >
                          <Group spacing={4}>
                            <Image src={InsertPlus} alt="InsertPlus" />
                            <Text
                              style={{
                                fontSize: "12px",
                                lineHeight: "16px",
                                fontFamily: "Satoshi-italic-400",
                                color: "#5c5f66",
                              }}
                            >
                              insert add-on
                            </Text>
                          </Group>
                        </UnstyledButton>
                      )}
                      {!showDietaryIconInput && (
                        <UnstyledButton
                          onClick={() => {
                            setDietaryIcon(sectionId, dish.id.toString(), true);
                          }}
                          onMouseUp={onInputMouseUp}
                        >
                          <Group spacing={4}>
                            <Image src={InsertPlus} alt="InsertPlus" />
                            <Text
                              style={{
                                fontSize: "12px",
                                lineHeight: "16px",
                                fontFamily: "Satoshi-italic-400",
                                color: "#5c5f66",
                              }}
                            >
                              insert dietary icon
                            </Text>
                          </Group>
                        </UnstyledButton>
                      )}
                    </Group>
                  </Col>
                </>
              )}
            </Grid>

            {/* Dish Border Upload Section */}
            {dish.type === "dish" && (
              <div
                style={{
                  marginTop: "15px",
                  background: "#ffffff",
                  padding: "15px",
                  borderRadius: "10px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Text
                  mb="xs"
                  style={{
                    fontSize: "14px",
                    fontFamily: "Satoshi-medium-500",
                    color: "#22252a",
                  }}
                >
                  Dish Border
                </Text>
                <DishBorderUpload sectionId={sectionId} dishId={dish.id} />
              </div>
            )}
          </div>
        )}
        {dish.isSpacer && isSelected && (
          <div
            className="fj-section-content"
            style={{
              height: isSelected ? "auto" : 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <NumberInput
              onClick={(e) => e.stopPropagation()}
              onChange={(value: number) => {
                incrementActivityChangeId();
                if (value <= MAX_SPACER_HEIGHT && value >= MIN_SPACER_HEIGHT) {
                  updateSpacerHeight(sectionId, dish.id, value);
                } else if (value > MAX_SPACER_HEIGHT) {
                  updateSpacerHeight(sectionId, dish.id, MAX_SPACER_HEIGHT);
                } else {
                  updateSpacerHeight(sectionId, dish.id, MIN_SPACER_HEIGHT);
                }
              }}
              onMouseUp={onInputMouseUp}
              label="Spacer Height"
              value={spacerHeight}
              precision={2}
              min={MIN_SPACER_HEIGHT}
              step={0.05}
              max={MAX_SPACER_HEIGHT}
              parser={(value) => value?.replace(/[^\d.]/g, "")}
            />
          </div>
        )}
      </div>
    </div>
  );
});

DishItem.displayName = "DishItem";
