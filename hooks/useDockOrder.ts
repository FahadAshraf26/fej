import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { useEffect } from "react";

export const useDockOrder = () => {
  useEffect(() => {
    useInitializeEditor.getState().cesdkInstance.current?.ui.setDockOrder(
      useInitializeEditor
        .getState()
        .cesdkInstance.current?.ui.getDockOrder()
        .map((entry: any) => {
          if (entry.key === "content") {
            return {
              ...entry,
              isSelected: useInitializeEditor.getState().isContentOpen,
            };
          } else if (entry.key === "layout") {
            return {
              ...entry,
              isSelected: useInitializeEditor.getState().isLayoutOpen,
            };
          } else if (entry.key === "style") {
            return {
              ...entry,
              isSelected: useInitializeEditor.getState().isStyleOpen,
            };
          } else if (entry.key === "Images") {
            return {
              ...entry,
              isSelected: true,
            };
          } else return entry;
        })
    );
  }, [
    useInitializeEditor.getState().isContentOpen,
    useInitializeEditor.getState().isLayoutOpen,
    useInitializeEditor.getState().isStyleOpen,
  ]);
};
