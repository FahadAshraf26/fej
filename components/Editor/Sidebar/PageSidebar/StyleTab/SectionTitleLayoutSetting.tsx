import { FC } from "react";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { AlignmentSettings } from "./AlignmentSettings";

interface TitlehorizontalSettings {
  isLeft: boolean;
  isCenter: boolean;
  isRight: boolean;
}

export const SectionTitleLayoutSetting: FC = () => {
  const selectedSection = useSectionsStore((state) => state.selectedSection);
  const sectionId = selectedSection?.sectionId || "";

  const titleHorizontalAlignSettings = useSectionsStore(
    (state) => state.titleHorizontalAlignSettings[sectionId] || {}
  );

  const { incrementActivityChangeId } = useInitializeEditor();
  const { setTitleHorizontalSettings } = useSectionsStore();

  const handleAlignmentChange = (key: keyof TitlehorizontalSettings) => {
    const newSettings: TitlehorizontalSettings = {
      isLeft: false,
      isCenter: false,
      isRight: false,
      [key]: !titleHorizontalAlignSettings[key],
    };

    setTitleHorizontalSettings(sectionId, newSettings);
    incrementActivityChangeId();
  };

  return (
    <AlignmentSettings
      alignSettings={titleHorizontalAlignSettings}
      handleAlignmentChange={(e) => handleAlignmentChange(e)}
      isAlignmentDisabled={false}
    />
  );
};
