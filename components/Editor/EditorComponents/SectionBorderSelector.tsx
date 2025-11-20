import React, { useState } from "react";
import { Button, Text, Switch, Group } from "@mantine/core";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { toast } from "react-toastify";
import { BorderSelectionModal } from "./BorderSelectionModal";
import { BorderLibraryItem } from "../../../interfaces/BorderLibrary";

interface SectionBorderSelectorProps {
  sectionId: string;
  pageId: number;
  templateId: number;
}

export const SectionBorderSelector: React.FC<SectionBorderSelectorProps> = ({
  sectionId,
  pageId,
  templateId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const updateSectionContent = useSectionsStore((state) => state.updateSectionContent);
  const sections = useSectionsStore((state) => state.oSections);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);

  const currentSection = sections[pageId]?.find((s) => s.sectionId === sectionId);
  const hasBorderImage = !!currentSection?.borderImageUrl;
  const currentBorderId = currentSection?.borderLibraryId;

  const handleToggleBorder = (enabled: boolean) => {
    if (enabled) {
      setIsModalOpen(true);
    } else {
      handleRemoveBorder();
    }
  };

  const handleSelectBorder = (border: BorderLibraryItem | null) => {
    if (border) {
      updateSectionContent(pageId, sectionId, "borderImageUrl", border.image_url);
      updateSectionContent(pageId, sectionId, "borderLibraryId", border.id);

      if (!currentSection?.sectionMarginTop) {
        updateSectionContent(pageId, sectionId, "sectionMarginTop", 0);
      }
      if (!currentSection?.sectionMarginBottom) {
        updateSectionContent(pageId, sectionId, "sectionMarginBottom", 0);
      }
      if (!currentSection?.sectionMarginLeft) {
        updateSectionContent(pageId, sectionId, "sectionMarginLeft", 0);
      }
      if (!currentSection?.sectionMarginRight) {
        updateSectionContent(pageId, sectionId, "sectionMarginRight", 0);
      }

      toast.success("Border applied successfully!");
    } else {
      handleRemoveBorder();
    }

    incrementActivityChangeId();
  };

  const handleRemoveBorder = () => {
    updateSectionContent(pageId, sectionId, "borderImageUrl", null);
    updateSectionContent(pageId, sectionId, "borderLibraryId", null);

    updateSectionContent(pageId, sectionId, "sectionMarginLeft", null);
    updateSectionContent(pageId, sectionId, "sectionMarginRight", null);
    updateSectionContent(pageId, sectionId, "sectionMarginTop", null);
    updateSectionContent(pageId, sectionId, "sectionMarginBottom", null);

    incrementActivityChangeId();
    toast.success("Border removed!");
  };

  const handleChangeBorder = () => {
    setIsModalOpen(true);
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <Group position="apart" mb="sm">
        <Switch
          checked={hasBorderImage}
          onChange={(event) => handleToggleBorder(event.currentTarget.checked)}
          size="sm"
        />
      </Group>

      {hasBorderImage && (
        <div>
          {currentSection?.borderImageUrl ? (
            <div>
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

              <div
                style={{ marginBottom: "10px", cursor: "pointer" }}
                onClick={() => setIsModalOpen(true)}
              >
                <img
                  src={currentSection.borderImageUrl}
                  alt="Section Border Preview"
                  style={{
                    width: "100%",
                    maxHeight: "100px",
                    objectFit: "contain",
                    borderRadius: "8px",
                    border: "2px solid #E5E7EB",
                  }}
                />
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              compact
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              style={{
                width: "100%",
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "Satoshi-regular-400",
                  fontSize: "14px",
                  lineHeight: "18px",
                }}
              >
                Select Border
              </Text>
            </Button>
          )}
        </div>
      )}

      <BorderSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectBorder={handleSelectBorder}
        currentBorderId={currentBorderId || undefined}
        templateId={templateId}
      />
    </div>
  );
};
