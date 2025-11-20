import { useEffect, useState } from "react";
import Image from "next/image";
import { SegmentedControl, Text, NumberInput, Group } from "@mantine/core";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import Divider from "@Public/icons/dividerIcon.svg";
import FreezeRow from "@Public/icons/freezeRow.svg";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";

export const SectionColumnSelector = () => {
  const [selectedColumn, setSelectedColumn] = useState<string>("1");
  const [columnMargin, setColumnMargin] = useState<number>(0);
  const [topMargin, setTopMargin] = useState<number>(0);
  const [errors, setErrors] = useState<string>();
  const updateSectionColumnCount = useSectionsStore((state) => state.updateSectionColumnCount);
  const selectedSection = useSectionsStore((state) => state.getSelectedSection());
  const updateSectionColumnMargin = useSectionsStore((state) => state.updateSectionColumnMargin);
  const updateSectionTopMargin = useSectionsStore((state) => state.updateSectionTopMargin);
  const activePage = usePageStore((state) => state.getSelectedPage());

  const cesdkInstance = useInitializeEditor((state) => state.cesdkInstance);

  const getSectionWidth = (): number => {
    const pageWidthFromImgly = cesdkInstance.current.engine.block.getWidth(activePage.pageId);
    const selectedSection = useSectionsStore.getState().getSelectedSection();
    let sectionWidth =
      (pageWidthFromImgly -
        activePage.marginLeft -
        activePage.marginRight -
        activePage.columnMargin) /
      activePage.columns;
    return sectionWidth / (selectedSection.columns - 1);
  };

  useEffect(() => {
    setSelectedColumn(selectedSection.columns.toString());
    setColumnMargin(selectedSection.columnMargin || 0);
    setTopMargin(selectedSection.dndLayout.y === 0 ? selectedSection.topMargin || 0 : 0);
  }, [selectedSection]);

  const handleColumn = (col: string) => {
    setSelectedColumn(col);
    updateSectionColumnCount(Number(col));
  };

  const handleMarginChange = (value: number) => {
    if (value === undefined || value < 0) return;
    const sectionWidth = getSectionWidth();

    if (value > sectionWidth) {
      setErrors(`Max column margin cannot exceed ${sectionWidth} in.`);
      return;
    }
    setErrors("");
    setColumnMargin(value);
    updateSectionColumnMargin(value);
  };

  const handleTopMarginChange = (value: number) => {
    if (value === undefined || value < 0) return;

    setTopMargin(value);
    updateSectionTopMargin(value);
  };

  const rightSection = (
    <Group spacing="sm">
      <Image src={Divider} alt="Divider" />
      <Text
        style={{
          color: "#575757",
          fontFamily: "Satoshi-regular-400",
          fontSize: "14px",
        }}
      >
        in
      </Text>
    </Group>
  );

  const commonInputStyles = {
    rightSection: { width: "55px" },
    input: {
      fontFamily: "Satoshi-regular-400",
      fontSize: "14px",
      color: "#575757",
    },
  };
  return (
    <>
      <SegmentedControl
        value={selectedColumn}
        fullWidth
        onChange={(value) => handleColumn(value)}
        data={[
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
        ]}
      />
      <Text
        mb="xs"
        style={{
          background: "#ffffff",
          padding: "25px 0px 0px 4px",
          borderRadius: 10,
        }}
      >
        Section Column Margin
      </Text>
      <NumberInput
        disabled={selectedSection.columns === 1}
        radius={8}
        precision={2}
        step={0.1}
        min={0}
        max={4}
        value={selectedSection.columns === 1 ? 0 : columnMargin > 0 ? columnMargin : 0.25}
        error={errors}
        onChange={handleMarginChange}
        rightSection={rightSection}
        hideControls
        placeholder="Column Margin"
        styles={commonInputStyles}
      />
      {selectedSection.dndLayout.y === 0 && (
        <>
          <Text
            mb="xs"
            style={{
              background: "#ffffff",
              padding: "25px 0px 0px 4px",
              borderRadius: 10,
            }}
          >
            Section Top Margin
          </Text>
          <NumberInput
            radius={8}
            precision={2}
            step={0.1}
            min={0}
            value={topMargin}
            onChange={handleTopMarginChange}
            icon={<Image src={FreezeRow} alt="Freezrow" />}
            rightSection={rightSection}
            hideControls
            placeholder="Top Margin"
            styles={commonInputStyles}
          />
        </>
      )}
    </>
  );
};
