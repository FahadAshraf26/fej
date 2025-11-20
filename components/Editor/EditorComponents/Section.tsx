import React from "react";
import { SectionProps } from "@Interfaces/";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { Text } from "@mantine/core";

export const SectionItem = ({ section, pageId, columns }: SectionProps) => {
  const selectedSection = useSectionsStore((state) => state.selectedSection);
  const isSelected = selectedSection.sectionId === section.sectionId;
  const sectionRef = React.useRef<
    HTMLDivElement & {
      offsetWidth: number;
    }
  >(null);
  React.useEffect(() => {
    if (sectionRef.current) {
      const element = sectionRef.current.offsetWidth;
    }
  });
  let layoutType = "grid";
  return (
    <div
      ref={sectionRef}
      style={{
        minHeight: layoutType === "grid" ? "100px" : "50px",
      }}
      onClick={(e) => e.stopPropagation()}
      className={`fj-section-container ${
        isSelected ? "fj-section-selected" : ""
      }`}
    >
      {columns < 4 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            ...(layoutType === "grid" && { height: 100 }),
            justifyContent: "center",
          }}
          className="fj-section-content"
        >
          <Text
            lineClamp={4}
            align="left"
            style={{
              width: "100%",
              fontFamily: "Satoshi-medium-500",
              fontSize: "14px",
              padding: "5px 0px 0px 10px",
              color: "#22252A",
              userSelect: "none",
              WebkitUserSelect: "none",
              msUserSelect: "none",
            }}
          >
            {section.name !== null && section.name.length
              ? section.name
              : section.placeholderName}
          </Text>
        </div>
      )}
    </div>
  );
};
