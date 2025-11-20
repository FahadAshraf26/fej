import {
  getCurrentSelectedPage,
  getPageIndex,
  uintId,
} from "@Components/Editor/Utils";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { Page } from "@Interfaces/";
import { v4 as uuidV4 } from "uuid";
import { useEffect } from "react";

const addPageBtn = '[data-cy="canvasControlsAddPage"]';
const CanvasPageActionClass = '[data-cy="canvas-actions"]';

export const usePageAdd = () => {
  const cesdk = useInitializeEditor((state) => state.cesdkInstance);
  const menuId = usePageStore((state) => state.menuId);
  const addPage = usePageStore((state) => state.addPage);
  const pages = usePageStore((state) => state.pages);
  const calculatePageDimensions = usePageStore(
    (state) => state.calculatePageDimensions
  );
  const updateChangedPageIds = usePageStore(
    (state) => state.updateChangedPageIds
  );

  useEffect(() => {
    const elementWithShadowRoot = document.querySelector(
      "#cesdkContainer #root-shadow"
    );
    const shadowRoots = elementWithShadowRoot?.shadowRoot;
    if (!shadowRoots) return;

    const handleAddPage = () => {
      setTimeout(() => {
        const pageId = getCurrentSelectedPage();
        const blockUUID = cesdk?.current?.engine.block.getUUID(pageId);
        const pageIndex = getPageIndex(pageId);

        const newPage: Page = {
          id: uintId(),
          pageId: pageId,
          blockUUID: blockUUID,
          name: `Page ${pageIndex + 1}`,
          columns: 6,
          sections: [],
          created_at: Date.now().toString(),
          page_index: pageIndex,
          menu_id: menuId,
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
        addPage(newPage);
      }, 0);
    };

    const handleDelete = () => {
      pages.forEach((page) => {
        calculatePageDimensions(page);
        updateChangedPageIds(page.pageId);
      });
    };

    const button = shadowRoots.querySelector(addPageBtn);
    button?.addEventListener("click", handleAddPage);

    const deleteButton = shadowRoots.querySelector(CanvasPageActionClass);
    const totalChildrenLength = deleteButton?.children.length ?? 0;
    const deletePageButton = deleteButton?.children[totalChildrenLength - 1];
    deletePageButton?.addEventListener("click", handleDelete);

    const handleKeydown = (event: KeyboardEvent) => {
      if (
        event?.key?.toLowerCase() === "delete" ||
        event?.key?.toLowerCase() === "backspace"
      ) {
        handleDelete();
      }
    };
    document.addEventListener("keydown", handleKeydown);

    return () => {
      button?.removeEventListener("click", handleAddPage);
      deletePageButton?.removeEventListener("click", handleDelete);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [cesdk, menuId, pages]);
};
