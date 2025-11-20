import { useLayoutEffect } from "react";
import {
  getCurrentSelectedPage,
  getPageIndex,
  uintId,
} from "@Components/Editor/Utils";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { Page } from "@Interfaces/";
import { v4 as uuidV4 } from "uuid";

export const useDefaultLayout = () => {
  const cesdk = useInitializeEditor.getState().cesdkInstance;
  const addPage = usePageStore.getState().addPage;
  const hasPages = usePageStore.getState().hasPages;
  const isLoadingEditor = useInitializeEditor.getState().loadingEditor;

  const setDefaultLayout = async () => {
    const pageId = getCurrentSelectedPage();
    if (!pageId) return;
    const pageIndex = getPageIndex(pageId);

    const blockUUID = cesdk.current?.engine.block.getUUID(pageId);
    const page: Page = {
      id: uintId(),
      pageId: pageId,
      blockUUID: blockUUID,
      name: "Page 1",
      columns: 6,
      sections: [],
      created_at: Date.now().toString(),
      page_index: pageIndex,
      menu_id: usePageStore.getState().menuId,
      marginTop: 1,
      marginRight: 1,
      marginBottom: 1,
      marginLeft: 1,
      dishSpacingValue: 10,
      isSaved: false,
      pageUniqueId: uuidV4(),
      sectionGap: 1,
      columnMargin: 0.4,
    };
    addPage(page);
  };
  useLayoutEffect(() => {
    if (!hasPages() && !isLoadingEditor && cesdk.current) {
      setDefaultLayout();
    }
  }, [isLoadingEditor]);
};
