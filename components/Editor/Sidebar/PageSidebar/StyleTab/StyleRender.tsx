import React, { FC } from "react";
import Image from "next/image";
import { Stack, Text, Group, Flex } from "@mantine/core";
import LayoutLink from "@Public/icons/layoutLink.svg";
import { StyleCard } from "@Components/Editor/EditorComponents/StyleCard";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { NewLayoutButton } from "@Components/Editor/EditorComponents/NewLayoutButton";
import { DishLayoutSetting } from "./DishLayoutSetting";
import { SectionTitleLayoutSetting } from "./SectionTitleLayoutSetting";
import { InlineTextLayoutSetting } from "./InlineTextSettings";
import { TitleLayoutSetting } from "./TitleLayoutSetting";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { Dish } from "interfaces/Sidebar";
import { BorderLibraryManager } from "../../../EditorComponents/BorderLibraryManager";
import { DishBorderLibraryManager } from "../../../EditorComponents/DishBorderLibraryManager";
import { useRouter } from "next/router";

type StyleRenderProps = {
  isSection: boolean;
  isDish: boolean;
  isInlineText: boolean;
};

export const StyleRender: FC<StyleRenderProps> = ({ isSection, isDish, isInlineText }) => {
  const router = useRouter();

  // Safely parse template ID from router query
  const getTemplateId = (): number => {
    const id = router.query.id;
    if (typeof id === "string") {
      const parsedId = parseInt(id, 10);
      return isNaN(parsedId) ? 1 : parsedId;
    }
    return 1;
  };

  const templateId = getTemplateId();
  const { setLayoutModal } = useInitializeEditor();
  const { componentLayout, getLayoutSelection, setLayoutSelection, selectedSection } =
    useSectionsStore();
  const { oDishes } = useDishesStore();

  // Safety check for selectedSection
  if (!selectedSection || !selectedSection.sectionId) {
    return (
      <Stack>
        <Text
          style={{
            fontFamily: "Satoshi-regular-400",
            fontSize: "14px",
            color: "#6B7280",
            textAlign: "center",
            padding: "20px",
          }}
        >
          Please select a section to view style options.
        </Text>
      </Stack>
    );
  }

  const sectionDishes: Dish[] = oDishes[selectedSection.sectionId] || [];
  const hasTextComponents = sectionDishes.some((dish) => dish.type === "inlineText");
  const isAllLayoutsDisabled = isInlineText && !hasTextComponents;

  const headingText = isInlineText
    ? "Inline Text Style"
    : isSection
    ? "Section Heading Style"
    : "Dish Style";

  const layoutModalHandler = () => {
    if (!isAllLayoutsDisabled) {
      setLayoutModal(isDish, isSection, isInlineText);
    }
  };

  const handleRadioChange = async (layoutType: string, layoutId: number, elementPath: string) => {
    if (!selectedSection.sectionId || selectedSection.sectionId === "-1") return;

    try {
      const isLayoutTypeDish = layoutType === "Dish";
      const currentSelection = getLayoutSelection(
        selectedSection.pageId.toString(),
        selectedSection.sectionId,
        isLayoutTypeDish
      );

      if (currentSelection && currentSelection.layoutId === layoutId) {
        await setLayoutSelection(
          selectedSection.pageId.toString(),
          selectedSection.sectionId,
          isLayoutTypeDish,
          {
            checked: false,
            layoutId: null,
            elementPath: null,
          }
        );
      } else {
        await setLayoutSelection(
          selectedSection.pageId.toString(),
          selectedSection.sectionId,
          isLayoutTypeDish,
          {
            checked: true,
            layoutId,
            elementPath,
          }
        );
      }
    } catch (error) {
      console.error("Error handling radio change:", error);
    }
  };

  const filteredLayouts =
    componentLayout?.filter(
      (layout) =>
        (isSection && layout.layoutType === "Section") || (isDish && layout.layoutType === "Dish")
    ) || [];

  const currentLayoutSelection = getLayoutSelection(
    selectedSection.pageId?.toString(),
    selectedSection.sectionId,
    isDish
  );

  return (
    <Stack>
      <Group position="apart">
        <Text
          style={{
            fontFamily: "Satoshi-medium-500",
            fontSize: "14px",
            color: "#3B3B3B",
          }}
        >
          {headingText}
        </Text>
        <Group
          spacing="xs"
          onClick={layoutModalHandler}
          style={{
            cursor: isAllLayoutsDisabled ? "not-allowed" : "pointer",
            opacity: isAllLayoutsDisabled ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: "Satoshi-regular-400",
              fontSize: "14px",
              color: "#3B3B3B",
            }}
          >
            All Layouts
          </Text>
          <Image src={LayoutLink} alt="All Layouts" />
        </Group>
      </Group>

      {isInlineText ? (
        <InlineTextLayoutSetting />
      ) : (
        <>
          {filteredLayouts.length === 0 ? (
            <NewLayoutButton
              isSideBar={true}
              isDish={isDish}
              isSection={isSection}
              isInlineText={false}
            />
          ) : (
            <Flex wrap="wrap" gap="xs">
              {filteredLayouts.map((layout) => (
                <StyleCard
                  key={layout.id}
                  componentLayout={layout}
                  handleRadioChange={handleRadioChange}
                  currentLayoutSelection={
                    currentLayoutSelection || { checked: false, layoutId: null, elementPath: null }
                  }
                  isDish={isDish}
                  isInlineText={false}
                />
              ))}
            </Flex>
          )}
        </>
      )}

      {isSection && (
        <>
          <SectionTitleLayoutSetting />
          <TitleLayoutSetting />
          <BorderLibraryManager templateId={templateId} />
        </>
      )}

      {isDish && (
        <>
          <DishLayoutSetting />
          <DishBorderLibraryManager templateId={templateId} />
        </>
      )}
    </Stack>
  );
};
