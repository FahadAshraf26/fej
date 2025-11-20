// @ts-nocheck
import React, { useMemo, FC, memo } from "react";
import { Droppable } from "react-beautiful-dnd";
import { SidebarPage } from "@Components/Editor/Sidebar/PageSidebar/SidebarPage";
import { Page } from "@Interfaces/";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

export const RenderPages: FC = memo(() => {
  const pages = usePageStore((state) => state.pages);
  const reorderPages = usePageStore((state) => state.reorderPages);
  const cesdk = useInitializeEditor((state) => state.cesdkInstance);

  usePageStore((state) => state.activePageUUID);
  const isContentOpen = useInitializeEditor((state) => state.isContentOpen);
  const isLayoutOpen = useInitializeEditor((state) => state.isLayoutOpen);
  const isStyleOpen = useInitializeEditor((state) => state.isStyleOpen);

  const memoizedPages = useMemo(() => {
    return pages.map((page: Page, index) => {
      return <SidebarPage key={page.pageId} page={page} index={index} />;
    });
  }, [pages]);

  return (
    <Droppable droppableId="pages">
      {(provided: any) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`${
            (isContentOpen || isLayoutOpen || isStyleOpen) &&
            "drawerContainerOpen"
          } drawerContainer`}
        >
          {memoizedPages}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
});

RenderPages.displayName = "RenderPages";
