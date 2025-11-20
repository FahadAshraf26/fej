import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { useEffect } from "react";

export const useRestrictToLeaveBeforeChanges = () => {
  useEffect(() => {
    const handleBeforeUpload = (event: BeforeUnloadEvent) => {
      const isSaving = useInitializeEditor.getState().isSaving;
      const isCanvasLoader = useInitializeEditor.getState().canvasLoader;
      const activityChangeId = useInitializeEditor.getState().activityChangeId;
      if (isSaving || activityChangeId > 0 || isCanvasLoader) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUpload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUpload);
    };
  }, []);
};
