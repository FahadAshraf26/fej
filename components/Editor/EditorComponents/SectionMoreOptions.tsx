import React, { FC } from "react";
import { Switch } from "@mantine/core";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";

export const SectionMoreOptions: FC<{ isPadding: boolean }> = ({
  isPadding,
}) => {
  const sectionSettingsOptions = useSectionsStore((state) => state.moreOptions);
  const selectedSection = useSectionsStore((state) => state.selectedSection);
  const isSectionSetting = sectionSettingsOptions[
    selectedSection.sectionId
  ] || { checked: false };
  const setSectionSettingOptions = useSectionsStore(
    (state) => state.setMoreOptions
  );
  return (
    <Switch
      label="More options"
      size="xs"
      checked={isSectionSetting.checked}
      onChange={(event) =>
        setSectionSettingOptions(
          selectedSection.sectionId,
          event.currentTarget.checked
        )
      }
      style={{ paddingTop: "10px" }}
      styles={() => ({
        root: {
          padding: "2px",
        },
        body: {
          padding: isPadding ? "2px 0px 0px 30px" : "2px",
        },
        track: {
          width: "20px",
          height: "16px",
          backgroundColor: "#ded8d8 !important",
          borderRadius: "10px",
          border: "none",
          position: "relative",
          transition: "background-color 0.2s ease",
          overflow: "visible",
        },
        thumb: {
          paddingTop: "15px",
          width: "18px",
          height: "18px",
          backgroundColor: "#3B3B3B",
          borderRadius: "50%",
          position: "absolute",
          top: "-1px",
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
          transition: "left 0.2s ease",
        },
        input: {
          cursor: "pointer",
        },
        label: {
          cursor: "pointer",
          fontFamily: "Satoshi-regular-400",
          fontSize: "12px",
          color: "#3B3B3B",
          letterSpacing: "6%",
          whiteSpace: "nowrap",
        },
      })}
    />
  );
};
