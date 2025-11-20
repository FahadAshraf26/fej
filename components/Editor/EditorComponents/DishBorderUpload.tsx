import React, { useState } from "react";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { Button, Text, Switch } from "@mantine/core";
import { toast } from "react-toastify";
import { DishMargin } from "./DishMargin";
import { DishBorderSelectionModal } from "./DishBorderSelectionModal";
import { useRouter } from "next/router";

interface DishBorderUploadProps {
  sectionId: string;
  dishId: number;
}

export const DishBorderUpload: React.FC<DishBorderUploadProps> = ({ sectionId, dishId }) => {
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const router = useRouter();
  const templateId = router.query.id ? Number(router.query.id) : 1;

  const updateDishContent = useDishesStore((state) => state.updateDishContent);
  const dishes = useDishesStore((state) => state.oDishes);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);

  const currentDish = dishes[sectionId]?.find((d) => d.id === dishId);
  const hasBorderImage = currentDish?.borderImageUrl;

  const handleBorderFromLibrary = (border: any) => {
    if (border) {
      updateDishContent(sectionId, dishId, "borderImageUrl", border.image_url);
      toast.success("Dish border applied from library!");
    } else {
      updateDishContent(sectionId, dishId, "borderImageUrl", null);
      updateDishContent(sectionId, dishId, "dishMarginLeft", null);
      updateDishContent(sectionId, dishId, "dishMarginRight", null);
      updateDishContent(sectionId, dishId, "dishMarginTop", null);
      updateDishContent(sectionId, dishId, "dishMarginBottom", null);
      toast.success("Dish border removed!");
    }
    incrementActivityChangeId();
  };

  const handleSwitchClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();

    if (hasBorderImage) {
      handleBorderFromLibrary(null);
    } else {
      setIsSelectionModalOpen(true);
    }
  };

  const openBorderSelection = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    setIsSelectionModalOpen(true);
  };

  const handleContainerClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
  };

  const handleImageClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    setIsSelectionModalOpen(true);
  };

  return (
    <div style={{ marginTop: "10px" }} className="dish-content-col dish-border-container">
      {/* Header with Switch */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
        onClick={handleContainerClick}
        onMouseUp={handleContainerClick}
        onMouseDown={handleContainerClick}
        className="dish-content-col dish-border-header"
      >
        <div
          onClick={handleSwitchClick}
          onMouseUp={handleSwitchClick}
          onMouseDown={handleSwitchClick}
          className="dish-content-col dish-border-switch"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px",
            borderRadius: "4px",
          }}
        >
          <Switch
            checked={!!hasBorderImage}
            onChange={() => {}}
            onClick={handleSwitchClick}
            onMouseDown={handleSwitchClick}
            onMouseUp={handleSwitchClick}
            size="sm"
            color="orange"
            readOnly
            styles={{
              root: { pointerEvents: "none" },
              track: { pointerEvents: "none" },
              thumb: { pointerEvents: "none" },
            }}
          />
        </div>
      </div>

      {hasBorderImage && (
        <Text
          size="sm"
          mb="xs"
          style={{
            color: "#22C55E",
            fontFamily: "Satoshi-regular-400",
            fontSize: "12px",
          }}
        >
          ✓ Border applied
        </Text>
      )}

      {hasBorderImage && (
        <div className="dish-content-col dish-border-content">
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={handleImageClick}
            onMouseUp={handleImageClick}
            onMouseDown={handleImageClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3B82F6";
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E5E7EB";
              e.currentTarget.style.boxShadow = "none";
            }}
            className="dish-content-col"
            title="Click to change border"
          >
            <img
              src={currentDish?.borderImageUrl || ""}
              alt="Dish Border Preview"
              style={{
                width: "100%",
                maxHeight: "100px",
                objectFit: "contain",
                borderRadius: "4px",
                pointerEvents: "none",
              }}
            />
          </div>

          <div className="dish-content-col">
            <DishMargin sectionId={sectionId} dishId={dishId} />
          </div>
        </div>
      )}

      <DishBorderSelectionModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        onSelectBorder={handleBorderFromLibrary}
        templateId={templateId}
      />
    </div>
  );
};
