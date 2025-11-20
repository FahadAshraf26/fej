import React from "react";
import GridLayout from "@Components/Editor/Sidebar/PageSidebar/LayoutTab/SectionGridLayout";
import { RenderSectionProps, Section } from "interfaces/Sidebar";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import FJButton from "@Components/Editor/EditorComponents/Button";
import SectionImage from "@Public/icons/SectionFilled.svg";
import { PageSettings } from "./PageSettings";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

export const RenderSections: React.FC<RenderSectionProps> = ({
  pageId,
  columns,
}) => {
  const sections = useSectionsStore((state) =>
    state.getSectionsForSelectedPage()
  );
  const incrementActivityChangeId = useInitializeEditor(
    (state) => state.incrementActivityChangeId
  );
  const dndLayout = sections?.map((section: Section) => ({
    ...section?.dndLayout,
    i: section?.sectionId || "12",
    isResizable:
      useSectionsStore.getState().selectedSection.sectionId ===
        section.sectionId &&
      useSectionsStore.getState().selectedSection.pageId === section.pageId
        ? true
        : false,
  }));

  return (
    <>
      <div
        style={{
          zIndex: 10,
          background: "#fff",
          borderRadius: "15px",
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: "10px",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: -1,
              overflow: "hidden",
              padding: "10px 10px 30px 10px",
            }}
          >
            {Array(columns)
              .fill(null)
              .map((_, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#f0f0f5",
                  }}
                />
              ))}
          </div>

          <GridLayout
            dndLayout={dndLayout}
            sections={sections}
            pageId={pageId}
            columns={columns}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingBottom: "15px",
          }}
        >
          <FJButton
            title="Add Section"
            icon={SectionImage.src}
            onClick={() => {
              useSectionsStore.getState().addSection(),
                incrementActivityChangeId();
            }}
          />
        </div>
      </div>
      <PageSettings />
    </>
  );
};
