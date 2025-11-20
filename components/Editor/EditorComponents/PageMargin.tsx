import React, { useState, useEffect } from "react";
import Image from "next/image";
import LeftMarginIcon from "@Public/icons/leftMarginIcon.svg";
import TopMarginIcon from "@Public/icons/topMarginIcon.svg";
import RightMarginIcon from "@Public/icons/rightMarginIcon.svg";
import BottomMarginIcon from "@Public/icons/bottomMarginIcon.svg";
import Divider from "@Public/icons/dividerIcon.svg";
import Freezcolumn from "@Public/icons/freezColumn.svg";
import { NumberInput, Grid, Group, Text, Col } from "@mantine/core";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import SectionGapIcon from "@Public/icons/sectionGapIcon.svg";

interface MarginValues {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ColumnMarginValues {
  between: number;
}

interface MarginError {
  left?: string;
  right?: string;
  column?: string;
}

const DEFAULT_MAX_MARGIN = 6;
const FONT_FAMILY = "Satoshi-regular-400";
const TEXT_COLOR = "#252525";

export const PageMargin: React.FC = () => {
  const activePage = usePageStore((state) => state.getSelectedPage());
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);
  const [pageDimensions, setPageDimensions] = useState<{
    pageColumnWidth: number;
    pageHeightWithSpacing: number;
  }>({ pageColumnWidth: 0, pageHeightWithSpacing: 0 });
  const DEFAULT_SECTION_GAP = Math.round(pageDimensions.pageHeightWithSpacing / 2);
  const [margins, setMargins] = useState<MarginValues>({
    top: activePage.marginTop,
    bottom: activePage.marginBottom,
    left: activePage.marginLeft,
    right: activePage.marginRight,
  });
  const [columnMargins, setColumnMargins] = useState<ColumnMarginValues>({
    between: activePage.columnMargin,
  });
  const [sectionGap, setSectionGap] = useState<number>(activePage.sectionGap);
  const [errors, setErrors] = useState<MarginError>({});

  const updatePage = usePageStore((state) => state.updatePage);
  const calculatePageDimensions = usePageStore((state) => state.calculatePageDimensions);

  useEffect(() => {
    const dimensions = calculatePageDimensions(activePage);
    setPageDimensions(dimensions);
  }, [activePage, calculatePageDimensions]);

  const getPageHalfWidth = (): number => {
    const pageWidthFromImgly = useInitializeEditor
      .getState()
      .cesdkInstance.current.engine.block.getWidth(activePage.pageId);
    return pageWidthFromImgly / 2;
  };

  const validateMarginValue = (value: number | undefined): number | undefined => {
    if (value === undefined || value < 0) return undefined;
    return Math.min(value, DEFAULT_MAX_MARGIN);
  };

  const handleMarginChange = (key: keyof MarginValues, value: number | undefined) => {
    if (value === undefined || value < 0) return;

    const halfPageWidth = getPageHalfWidth();
    const maxAllowedMargin =
      key === "left"
        ? halfPageWidth - (margins.right + columnMargins.between)
        : key === "right"
        ? halfPageWidth - (margins.left + columnMargins.between)
        : halfPageWidth;

    if ((key === "left" || key === "right") && value > maxAllowedMargin) {
      setErrors((prev) => ({
        ...prev,
        [key]: `Max ${key} margin cannot exceed ${halfPageWidth} in.`,
      }));
      return;
    }

    const validValue = validateMarginValue(value);
    if (validValue === undefined) return;

    setErrors({});
    incrementActivityChangeId();

    setMargins((prev) => ({ ...prev, [key]: validValue }));
    const updatedPage = {
      ...activePage,
      [`margin${key.charAt(0).toUpperCase() + key.slice(1)}`]: validValue,
    };
    updatePage(updatedPage);
  };

  const handleColumnMarginChange = (key: keyof ColumnMarginValues, value: number | undefined) => {
    if (value === undefined || value < 0) return;

    const halfPageWidth = getPageHalfWidth();
    const maxAllowedColumnMargin = halfPageWidth - (margins.left + margins.right);

    if (value > maxAllowedColumnMargin) {
      setErrors((prev) => ({
        ...prev,
        column: `Max column margin cannot exceed ${halfPageWidth} in.`,
      }));
      return;
    }

    setErrors({});
    incrementActivityChangeId();

    setColumnMargins((prev) => ({ ...prev, [key]: value }));
    const updatedPage = {
      ...activePage,
      columnMargin: value,
    };
    updatePage(updatedPage);
  };

  const handleSectionGapchange = (value: number | undefined) => {
    if (value === undefined || value < 0) return;
    setSectionGap(value);
    const updatedPage = {
      ...activePage,
      sectionGap: value,
    };
    updatePage(updatedPage);
  };

  const commonInputStyles = {
    rightSection: { width: "55px" },
    input: {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      color: TEXT_COLOR,
    },
    label: {
      fontFamily: FONT_FAMILY,
      fontSize: "14px",
      color: "#3B3B3B",
      padding: "0px 0px 10px 0px",
    },
  };

  const rightSection = (
    <Group spacing="sm">
      <Image src={Divider} alt="Divider" />
      <Text style={{ color: "#575757", fontFamily: FONT_FAMILY, fontSize: "14px" }}>in</Text>
    </Group>
  );

  const rightSectionGap = (
    <Group spacing="sm">
      <Image src={Divider} alt="Divider" />
      <Text style={{ color: "#575757", fontFamily: FONT_FAMILY, fontSize: "14px" }}>x</Text>
    </Group>
  );

  const renderMarginInput = (
    key: keyof MarginValues,
    icon: any,
    placeholder: string,
    error?: string
  ) => (
    <Col span={6}>
      <Group spacing="xs">
        <NumberInput
          value={margins[key] === null ? undefined : margins[key]}
          max={DEFAULT_MAX_MARGIN}
          min={0}
          precision={2}
          step={0.1}
          radius={8}
          onChange={(value) => handleMarginChange(key, value)}
          error={error}
          icon={<Image src={icon} alt="icon" />}
          hideControls
          rightSection={rightSection}
          placeholder={placeholder}
          styles={commonInputStyles}
        />
      </Group>
    </Col>
  );

  return (
    <div
      style={{
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
      }}
    >
      <Text
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: "14px",
          color: "#3B3B3B",
          marginBottom: "1rem",
        }}
      >
        Page Margin
      </Text>
      <Grid>
        {renderMarginInput("left", LeftMarginIcon, "Left", errors.left)}
        {renderMarginInput("top", TopMarginIcon, "Top")}
        {renderMarginInput("right", RightMarginIcon, "Right", errors.right)}
        {renderMarginInput("bottom", BottomMarginIcon, "Bottom")}
      </Grid>
      <Grid>
        <Col span={5}>
          <NumberInput
            label="Column Margin"
            disabled={usePageStore.getState().getPageColumnCount() === 1}
            value={columnMargins.between === null ? undefined : columnMargins.between}
            error={errors.column}
            radius={8}
            precision={2}
            step={0.1}
            min={0}
            onChange={(value) => handleColumnMarginChange("between", value)}
            icon={<Image src={Freezcolumn} alt="Freezcolumn" />}
            rightSection={rightSection}
            hideControls
            placeholder="Column Margin"
            styles={commonInputStyles}
          />
        </Col>
        <Col span={5} offset={1}>
          <NumberInput
            label="Section Gap"
            value={sectionGap === null ? undefined : sectionGap}
            radius={8}
            max={DEFAULT_SECTION_GAP}
            step={1}
            min={1}
            onChange={(value) => handleSectionGapchange(value)}
            icon={<Image src={SectionGapIcon} alt="SectionGapIcon" />}
            rightSection={rightSectionGap}
            hideControls
            placeholder="Between Section Gap"
            styles={commonInputStyles}
          />
        </Col>
      </Grid>
    </div>
  );
};
