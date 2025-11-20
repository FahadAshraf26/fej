import React, { useState, useEffect } from "react";
import Image from "next/image";
import { NumberInput, Text, Group, Grid, Col } from "@mantine/core";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import LeftMarginIcon from "@Public/icons/leftMarginIcon.svg";
import TopMarginIcon from "@Public/icons/topMarginIcon.svg";
import RightMarginIcon from "@Public/icons/rightMarginIcon.svg";
import BottomMarginIcon from "@Public/icons/bottomMarginIcon.svg";
import Divider from "@Public/icons/dividerIcon.svg";

interface SectionMarginProps {
  sectionId: string;
  pageId: number;
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

const DEFAULT_MAX_MARGIN = 2;
const FONT_FAMILY = "Satoshi-regular-400";
const TEXT_COLOR = "#252525";

export const SectionMargin: React.FC<SectionMarginProps> = ({ sectionId, pageId }) => {
  const updateSectionContent = useSectionsStore((state) => state.updateSectionContent);
  const sections = useSectionsStore((state) => state.oSections);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);
  const activePage = usePageStore((state) => state.getSelectedPage());
  const calculatePageDimensions = usePageStore((state) => state.calculatePageDimensions);

  const currentSection = sections[pageId]?.find((s) => s.sectionId === sectionId);

  const [margins, setMargins] = useState<MarginValues>({
    left: currentSection?.sectionMarginLeft ?? 0.08,
    right: currentSection?.sectionMarginRight ?? 0.08,
    top: currentSection?.sectionMarginTop ?? 0.08,
    bottom: currentSection?.sectionMarginBottom ?? 0.08,
  });

  const [errors, setErrors] = useState<MarginError>({});

  useEffect(() => {
    if (currentSection) {
      setMargins({
        left: currentSection.sectionMarginLeft ?? 0.08,
        right: currentSection.sectionMarginRight ?? 0.08,
        top: currentSection.sectionMarginTop ?? 0.08,
        bottom: currentSection.sectionMarginBottom ?? 0.08,
      });
    }
  }, [currentSection]);

  const getSectionWidth = (): number => {
    if (!currentSection || !activePage) return 0;

    const { pageColumnWidth } = calculatePageDimensions(activePage);
    const sectionWidth =
      pageColumnWidth * currentSection.dndLayout.w +
      (currentSection.dndLayout.w - 1) * activePage.columnMargin;
    return sectionWidth;
  };

  const getHalfSectionWidth = (): number => {
    return getSectionWidth() / 2;
  };

  const validateMarginValue = (value: number | undefined): number | undefined => {
    if (value === undefined) return undefined;
    return Math.max(Math.min(value, DEFAULT_MAX_MARGIN), -DEFAULT_MAX_MARGIN);
  };

  const handleMarginChange = (key: keyof MarginValues, value: number | undefined) => {
    if (value === undefined) return;

    const halfSectionWidth = getHalfSectionWidth();

    if (value >= 0) {
      const maxAllowedMargin =
        key === "left"
          ? halfSectionWidth - margins.right
          : key === "right"
          ? halfSectionWidth - margins.left
          : halfSectionWidth;

      if ((key === "left" || key === "right") && value > maxAllowedMargin) {
        setErrors((prev) => ({
          ...prev,
          [key]: `Max ${key} margin cannot exceed ${maxAllowedMargin.toFixed(2)} in.`,
        }));
        return;
      }

      if ((key === "top" || key === "bottom") && value > halfSectionWidth) {
        setErrors((prev) => ({
          ...prev,
          [key]: `Max ${key} margin cannot exceed ${halfSectionWidth.toFixed(2)} in.`,
        }));
        return;
      }
    }

    if (value < 0) {
      const minAllowedMargin = -DEFAULT_MAX_MARGIN;
      if (value < minAllowedMargin) {
        setErrors((prev) => ({
          ...prev,
          [key]: `Min ${key} margin cannot be less than ${minAllowedMargin.toFixed(2)} in.`,
        }));
        return;
      }
    }

    const validValue = validateMarginValue(value);
    if (validValue === undefined) return;

    setErrors({});
    incrementActivityChangeId();

    setMargins((prev) => ({ ...prev, [key]: validValue }));

    updateSectionContent(
      pageId,
      sectionId,
      `sectionMargin${key.charAt(0).toUpperCase() + key.slice(1)}`,
      validValue
    );
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

  const renderMarginInput = (
    key: keyof MarginValues,
    icon: any,
    placeholder: string,
    error?: string
  ) => {
    const halfSectionWidth = getHalfSectionWidth();
    const maxValue =
      key === "left" || key === "right"
        ? Math.min(DEFAULT_MAX_MARGIN, halfSectionWidth)
        : Math.min(DEFAULT_MAX_MARGIN, halfSectionWidth);

    return (
      <Col span={6}>
        <Group spacing="xs">
          <NumberInput
            value={margins[key] === null ? undefined : margins[key]}
            max={maxValue}
            min={-DEFAULT_MAX_MARGIN}
            precision={2}
            step={0.05}
            radius={8}
            onChange={(value) => handleMarginChange(key, value)}
            error={error}
            icon={<Image src={icon} alt={`${key} margin icon`} />}
            hideControls
            rightSection={rightSection}
            placeholder={placeholder}
            styles={commonInputStyles}
          />
        </Group>
      </Col>
    );
  };

  return (
    <div
      style={{
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        padding: "15px",
        marginTop: "10px",
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
        Section Content Margins
      </Text>
      {process.env.NODE_ENV === "development" && (
        <Text
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: "12px",
            color: "#666",
            marginBottom: "0.5rem",
          }}
        >
          Section width: {getSectionWidth().toFixed(2)}in | Max margin:{" "}
          {getHalfSectionWidth().toFixed(2)}in
        </Text>
      )}
      <Grid>
        {renderMarginInput("left", LeftMarginIcon, "Left", errors.left)}
        {renderMarginInput("top", TopMarginIcon, "Top", errors.top)}
        {renderMarginInput("right", RightMarginIcon, "Right", errors.right)}
        {renderMarginInput("bottom", BottomMarginIcon, "Bottom", errors.bottom)}
      </Grid>
    </div>
  );
};
