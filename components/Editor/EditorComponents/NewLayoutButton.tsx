import React, { FC } from "react";
import Image from "next/image";
import { Button } from "@mantine/core";
import PlusIcon from "@Public/icons/Plus.svg";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

export const NewLayoutButton: FC<{
  isSideBar?: boolean;
  isDish?: boolean;
  isSection?: boolean;
  isInlineText?: boolean;
}> = ({ isSideBar, isDish = false, isSection = false, isInlineText = false }) => {
  const setShowEngineModal = useInitializeEditor((state) => state.setShowEngineModal);
  const restLayoutId = useInitializeEditor((state) => state.restLayoutId);
  const fetchDefaultLayout = useInitializeEditor((state) => state.fetchDefaultLayoutTemplate);

  const handleClick = () => {
    restLayoutId();

    // Explicitly fetch the correct default layout based on the button's context
    if (isDish) {
      fetchDefaultLayout(2393);
    } else if (isSection) {
      fetchDefaultLayout(2390);
    } else if (isInlineText) {
      fetchDefaultLayout(3776);
    }

    if (isSideBar) {
      useInitializeEditor.getState().setLayoutModal(isDish, isSection, isInlineText);
    } else {
      setShowEngineModal(true, useInitializeEditor.getState().template[0].content);
    }
  };

  return (
    <Button
      leftIcon={<Image src={PlusIcon} alt="PlusIcon" />}
      variant="default"
      radius={8}
      style={{
        borderColor: "#B9B9B9",
        height: "44px",
      }}
      styles={{
        inner: {
          fontFamily: "Satoshi-regular-400",
          fontSize: "14px",
          color: "#3B3B3B",
          lineHeight: "18px",
        },
      }}
      onClick={handleClick}
    >
      New Layout
    </Button>
  );
};
