import React, { useState, useEffect } from "react";
import Image from "next/image";
import { NumberInput, Text, Group, Grid, Col } from "@mantine/core";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import LeftMarginIcon from "@Public/icons/leftMarginIcon.svg";
import TopMarginIcon from "@Public/icons/topMarginIcon.svg";
import RightMarginIcon from "@Public/icons/rightMarginIcon.svg";
import BottomMarginIcon from "@Public/icons/bottomMarginIcon.svg";
import Divider from "@Public/icons/dividerIcon.svg";

interface DishMarginProps {
  sectionId: string;
  dishId: number;
}

interface MarginValues {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface MarginError {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
}

const DEFAULT_MAX_MARGIN = 1;
const FONT_FAMILY = "Satoshi-regular-400";
const TEXT_COLOR = "#252525";

export const DishMargin: React.FC<DishMarginProps> = ({ sectionId, dishId }) => {
  const updateDishContent = useDishesStore((state) => state.updateDishContent);
  const dishes = useDishesStore((state) => state.oDishes);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);

  const currentDish = dishes[sectionId]?.find((d) => d.id === dishId);

  const horizontalMaxMargin = 1;
  const verticalMaxMargin = 2;

  const marginContainerId = `dish-margin-container-${sectionId}-${dishId}`;
  const leftInputId = `dish-margin-left-${sectionId}-${dishId}`;
  const rightInputId = `dish-margin-right-${sectionId}-${dishId}`;
  const topInputId = `dish-margin-top-${sectionId}-${dishId}`;
  const bottomInputId = `dish-margin-bottom-${sectionId}-${dishId}`;

  const [margins, setMargins] = useState<MarginValues>({
    left: currentDish?.dishMarginLeft || 0,
    right: currentDish?.dishMarginRight || 0,
    top: currentDish?.dishMarginTop || 0,
    bottom: currentDish?.dishMarginBottom || 0,
  });

  const [errors, setErrors] = useState<MarginError>({});

  useEffect(() => {
    if (currentDish) {
      setMargins({
        left: currentDish.dishMarginLeft || 0,
        right: currentDish.dishMarginRight || 0,
        top: currentDish.dishMarginTop || 0,
        bottom: currentDish.dishMarginBottom || 0,
      });
    }
  }, [currentDish]);

  const validateMarginValue = (value: number | undefined): number | undefined => {
    if (value === undefined) return undefined;
    return Math.max(-verticalMaxMargin, Math.min(value, verticalMaxMargin));
  };

  const handleMarginChange = (key: keyof MarginValues, value: number | undefined) => {
    if (value === undefined) return;

    const isHorizontal = key === "left" || key === "right";
    const maxMargin = isHorizontal ? horizontalMaxMargin : verticalMaxMargin;

    if (value > maxMargin || value < -maxMargin) {
      setErrors((prev) => ({
        ...prev,
        [key]: `${key} margin must be between -${maxMargin} and ${maxMargin} in.`,
      }));
      return;
    }

    const validValue = validateMarginValue(value);
    if (validValue === undefined) return;

    setErrors({});
    incrementActivityChangeId();

    setMargins((prev) => ({ ...prev, [key]: validValue }));

    updateDishContent(
      sectionId,
      dishId,
      `dishMargin${key.charAt(0).toUpperCase() + key.slice(1)}`,
      validValue
    );
  };

  const handleContainerClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
  };

  const onInputMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const commonInputStyles = {
    rightSection: { width: "55px" },
    input: {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      color: TEXT_COLOR,
      backgroundColor: "#ffffff",
      border: "1px solid #E5E7EB",
    },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: "12px",
      color: "#6B7280",
      fontWeight: 500,
      marginBottom: "4px",
    },
  };

  const rightSection = (
    <Group spacing="xs">
      <Image src={Divider} alt="Divider" width={12} height={12} />
      <Text style={{ color: "#6B7280", fontFamily: FONT_FAMILY, fontSize: "12px" }}>in</Text>
    </Group>
  );

  const renderMarginInput = (
    key: keyof MarginValues,
    icon: any,
    label: string,
    error?: string,
    inputId?: string
  ) => {
    const isHorizontal = key === "left" || key === "right";
    const maxValue = isHorizontal ? horizontalMaxMargin : verticalMaxMargin;

    return (
      <Col span={6}>
        <div style={{ marginBottom: "12px" }}>
          <NumberInput
            id={inputId}
            label={`${label} Margin`}
            value={margins[key] === null ? undefined : margins[key]}
            error={error}
            radius={6}
            precision={2}
            step={0.01}
            max={maxValue}
            onChange={(value) => handleMarginChange(key, value)}
            onClick={(e) => e.stopPropagation()}
            onMouseUp={onInputMouseUp}
            icon={<Image src={icon} alt={label} width={16} height={16} />}
            rightSection={rightSection}
            hideControls
            placeholder="0.00"
            styles={commonInputStyles}
            className="dish-content-col"
            size="sm"
          />
        </div>
      </Col>
    );
  };

  return (
    <div
      id={marginContainerId}
      style={{
        backgroundColor: "#F9FAFB",
        padding: "16px",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
      }}
      className="dish-content-col dish-margin-container"
    >
      <Text
        style={{
          fontFamily: "Satoshi-medium-500",
          fontSize: "14px",
          color: "#374151",
          marginBottom: "12px",
        }}
        onClick={handleContainerClick}
        onMouseUp={handleContainerClick}
        onMouseDown={handleContainerClick}
      >
        Dish Border Margins
      </Text>

      <Grid className="dish-content-col" gutter="xs">
        {renderMarginInput("left", LeftMarginIcon, "Left", errors.left, leftInputId)}
        {renderMarginInput("top", TopMarginIcon, "Top", errors.top, topInputId)}
        {renderMarginInput("right", RightMarginIcon, "Right", errors.right, rightInputId)}
        {renderMarginInput("bottom", BottomMarginIcon, "Bottom", errors.bottom, bottomInputId)}
      </Grid>
    </div>
  );
};
