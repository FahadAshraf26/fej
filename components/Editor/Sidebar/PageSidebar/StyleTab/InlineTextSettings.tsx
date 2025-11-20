import React, { FC, useEffect } from "react";
import { Stack, Text, Select, Flex, SegmentedControl } from "@mantine/core";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { StyleCard } from "@Components/Editor/EditorComponents/StyleCard";
import { NewLayoutButton } from "@Components/Editor/EditorComponents/NewLayoutButton";
import { Dish } from "@Interfaces/*";
import { AlignmentSettings } from "./AlignmentSettings";

export const InlineTextLayoutSetting: FC = () => {
  // --- KEY CHANGE: Get the selected ID and its setter DIRECTLY from the global store ---
  const { selectedDishIdForLayout, setSelectedDishIdForLayout } = useInitializeEditor((state) => ({
    selectedDishIdForLayout: state.selectedDishIdForLayout,
    setSelectedDishIdForLayout: state.setSelectedDishIdForLayout,
  }));

  const selectedSectionId = useSectionsStore((state) => state.selectedSection.sectionId);
  const { oDishes, updateDishContent, setDishInlineTextLayout } = useDishesStore();
  const componentLayout = useSectionsStore((state) => state.componentLayout);

  // Derive data from subscribed state
  const sectionDishes: Dish[] = oDishes[selectedSectionId] || [];
  const textDishes: Dish[] = sectionDishes.filter((dish) => dish.type === "inlineText");

  const displayBlocks = textDishes.map((dish) => ({
    value: dish.id.toString(),
    label: dish.title || "Inline Text Component",
  }));

  // --- KEY CHANGE: This useEffect now sets the global state directly ---
  // Its only job is to ensure a default is selected if nothing else is.
  useEffect(() => {
    const selectionIsValid = textDishes.some((d) => d.id === selectedDishIdForLayout);

    // If there are text dishes available but no valid selection is in the global state...
    if (textDishes.length > 0 && !selectionIsValid) {
      // ...set the first available dish as the selection in the global store.
      setSelectedDishIdForLayout(textDishes[0].id);
    }
  }, [textDishes, selectedDishIdForLayout, setSelectedDishIdForLayout]);

  const handleLayoutChange = (layout: { id: number; elementPath: string } | null) => {
    if (!selectedDishIdForLayout || !selectedSectionId) return;

    setDishInlineTextLayout(selectedSectionId, selectedDishIdForLayout, {
      layoutId: layout?.id || null,
      elementPath: layout?.elementPath || null,
    });
  };

  const handleAlignmentChange = (key: "isLeft" | "isCenter" | "isRight") => {
    if (selectedDishIdForLayout) {
      const value = key.replace("is", "") as "Left" | "Center" | "Right";
      updateDishContent(selectedSectionId, selectedDishIdForLayout, "textAlign", value);
    }
  };

  const currentDish = textDishes.find((d) => d.id === selectedDishIdForLayout);
  const currentLayoutId = currentDish?.temp_inlineText_layout || null;
  const currentAlignmentValue = currentDish?.textAlign || "Left";

  const alignSettings = {
    isLeft: currentAlignmentValue === "Left",
    isCenter: currentAlignmentValue === "Center",
    isRight: currentAlignmentValue === "Right",
  };

  const inlineTextLayouts = componentLayout.filter((layout) => layout.layoutType === "InlineText");

  return (
    <Stack spacing="md" mt="xs">
      {textDishes.length > 0 ? (
        <>
          <Text size="sm" weight={500}>
            Select Text Component:
          </Text>
          <Select
            // The value is now read directly from the global store
            value={selectedDishIdForLayout ? selectedDishIdForLayout.toString() : null}
            // The onChange now sets the global store directly
            onChange={(value) => setSelectedDishIdForLayout(value ? Number(value) : null)}
            data={displayBlocks}
            placeholder="Select a text component"
          />

          <AlignmentSettings
            alignSettings={alignSettings}
            handleAlignmentChange={handleAlignmentChange}
            isAlignmentDisabled={false}
          />

          {inlineTextLayouts.length === 0 ? (
            <NewLayoutButton isSideBar={true} isInlineText={true} />
          ) : (
            <Flex wrap="wrap" gap="xs">
              {inlineTextLayouts.map((layout) => {
                const isSelected = currentLayoutId === layout.id;
                return (
                  <StyleCard
                    key={layout.id}
                    componentLayout={layout}
                    handleRadioChange={() => handleLayoutChange(isSelected ? null : layout)}
                    currentLayoutSelection={{
                      checked: isSelected,
                      layoutId: currentLayoutId,
                      elementPath: null,
                    }}
                    isDish={false}
                    isInlineText={true}
                  />
                );
              })}
            </Flex>
          )}
        </>
      ) : (
        <Text size="sm" color="dimmed" mt="xs">
          No text components in this section. Add one from the Content tab.
        </Text>
      )}
    </Stack>
  );
};
