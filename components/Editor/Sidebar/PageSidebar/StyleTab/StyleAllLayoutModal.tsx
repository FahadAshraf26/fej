import React, { FC, useEffect, useState } from "react";
import { Group, Modal, Button, Flex } from "@mantine/core";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { StyleCard } from "@Components/Editor/EditorComponents/StyleCard";
import { NewLayoutButton } from "@Components/Editor/EditorComponents/NewLayoutButton";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { CESDKModal } from "@Components/Editor/CESDKModal/CESDKModal";
import { toast } from "react-toastify";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";

const StyleAllLayoutModal: FC = () => {
  const {
    isAllLayoutModal,
    user,
    setLayoutModal,
    fetchDefaultLayoutTemplate,
    isDish,
    isSection,
    isInlineText,
    showEngineModal,
    incrementActivityChangeId,
    setIsAllLayoutModal,
    selectedDishIdForLayout,
  } = useInitializeEditor();

  const { selectedSection, componentLayout, fetchComponentLayout } = useSectionsStore();

  const { setDishInlineTextLayout } = useDishesStore();
  const [selectedLayout, setSelectedLayout] = useState<{
    layoutType: string;
    layoutId: number;
    elementPath: string;
  } | null>(null);

  useEffect(() => {
    if (isDish) {
      fetchDefaultLayoutTemplate(2393);
    }
    if (isSection) {
      fetchDefaultLayoutTemplate(2390);
    }
    if (isInlineText) {
      fetchDefaultLayoutTemplate(3776);
    }
  }, [isDish, isSection, isInlineText, fetchDefaultLayoutTemplate]);

  const handleRadioChange = (layoutType: string, layoutId: number, elementPath: string) => {
    setSelectedLayout({ layoutType, layoutId, elementPath });
  };

  const onApply = async () => {
    incrementActivityChangeId();

    if (!selectedLayout) {
      toast.error("Please select a layout.");
      return;
    }

    // Handle the inline text case specifically
    if (isInlineText) {
      if (!selectedDishIdForLayout) {
        toast.warn("Please select a text component in the sidebar first.");
        return;
      }

      await setDishInlineTextLayout(selectedSection.sectionId, selectedDishIdForLayout, {
        layoutId: selectedLayout.layoutId,
        elementPath: selectedLayout.elementPath,
      });

      toast.success("Inline text applied successfully.");
    } else {
      // Handle Section and Dish layouts
      if (!selectedSection || selectedSection.sectionId === "-1" || !selectedSection.pageId) {
        return;
      }
      const pageIdString = selectedSection.pageId.toString();
      const isLayoutTypeDish = selectedLayout.layoutType === "Dish";
      await useSectionsStore
        .getState()
        .setLayoutSelection(pageIdString, selectedSection.sectionId, isLayoutTypeDish, {
          checked: true,
          layoutId: selectedLayout.layoutId,
          elementPath: selectedLayout.elementPath,
        });
    }

    setIsAllLayoutModal();
  };

  useEffect(() => {
    if (selectedSection && selectedSection.sectionId !== "-1") {
      fetchComponentLayout(usePageStore.getState().menuId);
    }
  }, [selectedSection?.sectionId, fetchComponentLayout]);

  const filteredLayout = componentLayout?.filter(
    (layout) =>
      (isSection && layout.layoutType === "Section") ||
      (isDish && layout.layoutType === "Dish") ||
      (isInlineText && layout.layoutType === "InlineText")
  );

  return (
    <>
      <Modal
        title="All Layouts"
        opened={isAllLayoutModal}
        onClose={() => setLayoutModal(false, false, false)}
        radius={12}
        styles={{
          title: {
            fontFamily: "Satoshi-medium-500",
            fontSize: "16px",
            color: "#3B3B3B",
          },
          body: {
            paddingTop: "15px",
            display: "flex",
            flexDirection: "column",
            height: "70vh",
          },
          modal: {
            width: "70vw",
          },
        }}
      >
        <Flex wrap="wrap" gap="lg" style={{ flexGrow: 1, overflowY: "auto" }}>
          {filteredLayout.map((layout) => (
            <StyleCard
              key={layout.id}
              componentLayout={layout}
              isAllLayout={true}
              handleRadioChange={handleRadioChange}
              currentLayoutSelection={{
                checked: selectedLayout?.layoutId === layout.id,
                layoutId: selectedLayout?.layoutId || null,
                elementPath: null,
              }}
              isDish={isDish}
              isInlineText={isInlineText}
            />
          ))}
        </Flex>

        <Group spacing="xs" position="apart" style={{ marginTop: "auto", paddingTop: "1rem" }}>
          <NewLayoutButton isDish={isDish} isSection={isSection} isInlineText={isInlineText} />
          <Group spacing="xs">
            <Button
              radius={8}
              style={{
                height: "44px",
              }}
              styles={{
                root: {
                  background: "#F5F5F5",
                },
                inner: {
                  fontFamily: "Satoshi-regular-400",
                  fontSize: "14px",
                  color: "#3B3B3B",
                  lineHeight: "18px",
                },
              }}
              onClick={() => setLayoutModal(false, false, false)}
            >
              Cancel
            </Button>
            <Button
              radius={8}
              style={{
                height: "44px",
              }}
              styles={{
                root: {
                  background: "#3B3B3B",
                },
                inner: {
                  fontFamily: "Satoshi-regular-400",
                  fontSize: "14px",
                  color: "#F5F5F5",
                  lineHeight: "18px",
                },
              }}
              onClick={onApply}
            >
              Apply
            </Button>
          </Group>
        </Group>
      </Modal>
      {showEngineModal && <CESDKModal user={user} />}
    </>
  );
};

export default StyleAllLayoutModal;
