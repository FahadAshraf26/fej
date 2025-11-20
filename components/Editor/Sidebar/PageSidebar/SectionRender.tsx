import React, { FC, useCallback, useState, useEffect } from "react";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { Page } from "@Interfaces/*";
import { AccordionButton } from "@Components/Editor/EditorComponents/Accordion";
import {
  Text,
  Box,
  Center,
  Textarea,
  UnstyledButton,
  Group,
  Grid,
  Col,
  TextInput,
  Flex,
} from "@mantine/core";
import { IconCurrencyDollar } from "@tabler/icons";
import Image from "next/image";
import { DishRender } from "@Components/Editor/Sidebar/PageSidebar/ContentTab/DishRender";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { StyleRender } from "./StyleTab/StyleRender";
import { SectionColumnSelector } from "@Components/Editor/EditorComponents/SectionColumnSelector";
import CircleX from "@Public/icons/circleX.svg";
import InsertPlus from "@Public/icons/InsertPlus.svg";
import Cancel from "@Public/icons/cancel.svg";
import { SectionMoreOptions } from "@Components/Editor/EditorComponents/SectionMoreOptions";
import { isOnlyWhitespace } from "@Components/Editor/Utils";
import { SectionBorderSelector } from "@Components/Editor/EditorComponents/SectionBorderSelector";
import { SectionMargin } from "@Components/Editor/EditorComponents/SectionMargin";
import { useRouter } from "next/router";

export const SectionRender: FC<{
  page: Page;
}> = ({ page }) => {
  const router = useRouter();
  const templateId = router.query.id ? Number(router.query.id) : 1;
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);
  const updateSectionTitleDish = useDishesStore((state) => state.updateSectionTitleDish);
  const updateSectiontitleAddon = useDishesStore((state) => state.updateSectiontitleAddon);
  const setSelectedSection = useSectionsStore((state) => state.setSelectedSection);

  const selectedSection = useSectionsStore((state) => state.selectedSection);
  const updateSectionPrice = useDishesStore((state) => state.updateSectionPrice);
  const isContentOpen = useInitializeEditor((state) => state.isContentOpen);
  const sectionSettingsOptions = useSectionsStore((state) => state.moreOptions);
  const isSectionSetting = sectionSettingsOptions[selectedSection.sectionId] || { checked: false };
  const setSectionSettingOptions = useSectionsStore((state) => state.setMoreOptions);

  const [name, setName] = useState<string>("");
  const [addOn, setAddOn] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [showAddOn, setShowAddOn] = useState(false);
  const [showPrice, setShowPrice] = useState(false);

  useEffect(() => {
    if (selectedSection && selectedSection.sectionId) {
      const section = useDishesStore
        .getState()
        .getAllSectionTitles()
        .find((sec) => sec.sectionId === selectedSection.sectionId);

      if (section) {
        setName(section.name || "");
        setAddOn(section.addOns || "");
        setPrice(section.price || "");
        setShowAddOn(!!section.addOns);
        setShowPrice(!!section.price);
      }
    }
  }, [selectedSection]);

  const toggleSections = useCallback(
    (sectionId: string) => {
      if (selectedSection.sectionId) {
        setSectionSettingOptions(selectedSection.sectionId, false);
        const previousSection = useSectionsStore
          .getState()
          .oSections[selectedSection.pageId]?.find(
            (section) => section.sectionId === selectedSection.sectionId
          );
        if (previousSection && previousSection.sectionGroupBlockId) {
          const previousSectionMetadata = useInitializeEditor
            .getState()
            .cesdkInstance.current?.engine.block.getMetadata(
              previousSection.sectionGroupBlockId,
              "sectionId"
            );

          if (previousSectionMetadata && previousSection.sectionGroupBlockId) {
            useInitializeEditor
              .getState()
              .cesdkInstance.current?.engine.block.setSelected(
                previousSection.sectionGroupBlockId,
                false
              );
          }
        }
      }

      if (sectionId === selectedSection.sectionId) {
        setSelectedSection({ pageId: 0, sectionId: "" });
      } else {
        const section = useSectionsStore
          .getState()
          .oSections[page.pageId].find((section) => section.sectionId === sectionId);
        if (section && section.sectionGroupBlockId) {
          const isPageSelected = useInitializeEditor
            .getState()
            .cesdkInstance.current?.engine.block.isSelected(page.pageId);
          if (isPageSelected) {
            useInitializeEditor
              .getState()
              .cesdkInstance.current?.engine.block.setSelected(page.pageId, false);
          }
          const sectionMetadata = useInitializeEditor
            .getState()
            .cesdkInstance.current?.engine.block.getMetadata(
              section.sectionGroupBlockId,
              "sectionId"
            );
          if (sectionMetadata && section.sectionGroupBlockId) {
            useInitializeEditor
              .getState()
              .cesdkInstance.current?.engine.block.setSelected(section.sectionPageGroupId, true);
          }
        }
        setSelectedSection({ pageId: page.pageId, sectionId });
      }
    },
    [selectedSection, page.pageId, setSelectedSection]
  );

  const handleBlur = useCallback(
    (section: any) => {
      if (!section.pageId || !section.sectionId) return;
      if (name.length) {
        updateSectionTitleDish(name);
      } else {
        updateSectionTitleDish(null);
      }
    },
    [name, updateSectionTitleDish]
  );

  const handleAddOnBlur = useCallback(
    (section: any) => {
      if (!section.pageId || !section.sectionId) return;
      if (addOn.length) {
        updateSectiontitleAddon(addOn);
      } else {
        updateSectiontitleAddon(null);
      }
    },
    [addOn, updateSectiontitleAddon]
  );

  const onChangeHandler = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setName(e.target.value);
      incrementActivityChangeId();
    },
    [incrementActivityChangeId]
  );

  const handleAddOnChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setAddOn(e.currentTarget.value);
      incrementActivityChangeId();
    },
    [incrementActivityChangeId]
  );

  const handlePriceBlur = useCallback(
    (section: any) => {
      if (!section.pageId || !section.sectionId) return;
      if (price.length) {
        updateSectionPrice(price);
      } else {
        updateSectionPrice(null);
      }
    },
    [price, updateSectionPrice]
  );

  const handlePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, section: any) => {
      setPrice(e.target.value);
      incrementActivityChangeId();
    },
    [incrementActivityChangeId, updateSectionPrice]
  );

  return (
    <>
      {useDishesStore.getState().getAllSectionTitles().length ? (
        useDishesStore
          .getState()
          .getAllSectionTitles()
          .map((section) => (
            <div style={{ paddingLeft: "10px" }} key={section.sectionId}>
              <AccordionButton
                label={
                  section.name != null && !isOnlyWhitespace(section.name) && section.name.length
                    ? section.name
                    : section.placeholderName
                }
                isActive={selectedSection.sectionId === section.sectionId}
                isSection={true}
                onClick={() => toggleSections(section.sectionId)}
                onDuplicate={() => {
                  useSectionsStore.getState().duplicateSection(page.pageId, section.sectionId);
                }}
                onDelete={() => {
                  useSectionsStore.getState().removeSection(page.pageId, section.sectionId);
                }}
                fontSize={"16px"}
                fontFamily="Satoshi-medium-500"
                lineHeight="20px"
                letterSpacing="6%"
                color="#3B3B3B"
              >
                {section.sectionId === selectedSection.sectionId && (
                  <div>
                    {isContentOpen ? (
                      <>
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "15px 15px",
                            borderRadius: 10,
                          }}
                        >
                          <Text
                            mb="xs"
                            style={{
                              background: "#ffffff",
                              padding: "0px 0px 0px 4px",
                              borderRadius: 10,
                            }}
                          >
                            Section Title
                          </Text>
                          <Textarea
                            autosize
                            placeholder={section.placeholderName}
                            value={name}
                            onChange={onChangeHandler}
                            onBlur={() => handleBlur(section)}
                            radius={"md"}
                            styles={{
                              input: {
                                overflow: "hidden",
                                lineHeight: "1.2em",
                              },
                            }}
                          />
                          {showAddOn && (
                            <Textarea
                              autosize
                              placeholder="Add-on"
                              value={addOn}
                              radius={"md"}
                              onChange={handleAddOnChange}
                              onBlur={() => handleAddOnBlur(section)}
                              styles={{
                                input: {
                                  overflow: "hidden",
                                  lineHeight: "1.2em",
                                  marginTop: "10px",
                                },
                              }}
                              rightSection={
                                <Image
                                  src={Cancel}
                                  alt="Cancel"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setShowAddOn(false);
                                    setAddOn("");
                                    updateSectiontitleAddon(null);
                                  }}
                                />
                              }
                            />
                          )}
                          {showPrice && (
                            <TextInput
                              style={{
                                width: "100%",
                                marginTop: 12,
                                marginBottom: 8,
                              }}
                              placeholder="Price"
                              value={price}
                              radius="md"
                              onChange={(e) => handlePriceChange(e, section)}
                              onBlur={() => handlePriceBlur(section)}
                              styles={{
                                input: {
                                  overflow: "hidden",
                                  lineHeight: "1.2em",
                                },
                              }}
                              icon={<IconCurrencyDollar size={18} stroke={1.5} color="#adb5bd" />}
                              rightSection={
                                <Image
                                  src={Cancel}
                                  alt="Cancel"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setShowPrice(false);
                                    setPrice("");
                                    updateSectionPrice(null);
                                  }}
                                />
                              }
                            />
                          )}
                          <Flex
                            align="center"
                            justify="space-between"
                            mt="md"
                            mb={showAddOn || showPrice ? 8 : 0}
                          >
                            <Group spacing="xs">
                              {!showAddOn && (
                                <UnstyledButton onClick={() => setShowAddOn(true)}>
                                  <Group spacing={4}>
                                    <Image src={InsertPlus} alt="InsertPlus" />
                                    <Text
                                      style={{
                                        fontSize: "12px",
                                        fontFamily: "Satoshi-italic-400",
                                        color: "#5c5f66",
                                      }}
                                    >
                                      insert add-on
                                    </Text>
                                  </Group>
                                </UnstyledButton>
                              )}
                              {!showPrice && (
                                <UnstyledButton onClick={() => setShowPrice(true)}>
                                  <Group spacing={4}>
                                    <IconCurrencyDollar size={16} stroke={1.5} color="#5c5f66" />
                                    <Text
                                      style={{
                                        fontSize: "12px",
                                        fontFamily: "Satoshi-italic-400",
                                        color: "#5c5f66",
                                      }}
                                    >
                                      insert price
                                    </Text>
                                  </Group>
                                </UnstyledButton>
                              )}
                            </Group>
                            <SectionMoreOptions isPadding={false} />
                          </Flex>
                          {isSectionSetting.checked && (
                            <>
                              <Text
                                mb="xs"
                                style={{
                                  background: "#ffffff",
                                  padding: "25px 0px 0px 4px",
                                  borderRadius: 10,
                                }}
                              >
                                Section Columns
                              </Text>
                              <SectionColumnSelector />
                              <Text
                                mb="xs"
                                style={{
                                  background: "#ffffff",
                                  padding: "25px 0px 0px 4px",
                                  borderRadius: 10,
                                }}
                              >
                                Section Border
                              </Text>
                              <SectionBorderSelector
                                sectionId={section.sectionId}
                                pageId={page.pageId}
                                templateId={templateId}
                              />

                              {useSectionsStore
                                .getState()
                                .oSections[page.pageId]?.find(
                                  (s) => s.sectionId === section.sectionId
                                )?.borderImageUrl && (
                                <SectionMargin sectionId={section.sectionId} pageId={page.pageId} />
                              )}
                            </>
                          )}
                        </div>
                        <DishRender columns={section.columns} />
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "15px 15px",
                            borderRadius: 10,
                          }}
                        >
                          <StyleRender isDish={false} isSection={true} isInlineText={false} />
                        </div>
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "15px 15px",
                            borderRadius: 10,
                            marginTop: "10px",
                          }}
                        >
                          <StyleRender isDish={true} isSection={false} isInlineText={false} />
                        </div>
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "15px 15px",
                            borderRadius: 10,
                            marginTop: "10px",
                          }}
                        >
                          <StyleRender isDish={false} isSection={false} isInlineText={true} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </AccordionButton>
            </div>
          ))
      ) : (
        <div style={{ padding: "15px 20px" }}>
          <Box
            style={{
              height: "120px",
              width: "100%",
              padding: "16px",
              border: "2px dashed #E0E0E0",
              paddingTop: "30px",
            }}
          >
            <Center>
              <Image src={CircleX} alt="CircleX" />
              <Text
                style={{
                  fontFamily: "Satoshi-regular-400",
                  fontSize: "16px",
                  color: "#737373",
                }}
              >
                No Sections added to this page
              </Text>
            </Center>
            <Center>
              <Text
                style={{
                  fontFamily: "Satoshi-regular-400",
                  fontSize: "12px",
                  color: "#737373",
                }}
              >
                Go to the{" "}
                <span
                  style={{
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => {
                    useInitializeEditor.getState().setIsLayoutOpen();
                  }}
                >
                  layout tab
                </span>{" "}
                to add a section
              </Text>
            </Center>
          </Box>
        </div>
      )}
    </>
  );
};
