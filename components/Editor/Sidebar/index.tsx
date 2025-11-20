// @ts-nocheck
import React from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { RenderPages } from "@Components/Editor/Sidebar/PageSidebar/RenderPages";
import { usePageAdd } from "@Hooks/useAddPage";
import { useDefaultLayout } from "@Hooks/useDefaultLayout";
import { useWindowSize } from "@Hooks/useWindowSize";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

const SidebarConfig = () => {
  usePageAdd();
  useDefaultLayout();
  const size = useWindowSize();
  const pages = usePageStore((state) => state.pages);
  const reorderPages = usePageStore((state) => state.reorderPages);
  const cesdk = useInitializeEditor((state) => state.cesdkInstance);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Reorder pages in the store
    const reorderedPages = Array.from(pages);
    const [removed] = reorderedPages.splice(sourceIndex, 1);
    reorderedPages.splice(destinationIndex, 0, removed);

    // Update page indices and names
    const updatedPages = reorderedPages.map((page, index) => ({
      ...page,
      page_index: index,
      name: `Page ${index + 1}`,
    }));

    // Update the store
    reorderPages(updatedPages);

    // Update the editor blocks
    if (cesdk.current) {
      const enginePages = cesdk.current.engine.scene.getPages();
      if (enginePages) {
        const sourcePage = enginePages[sourceIndex];
        const destinationPage = enginePages[destinationIndex];

        if (sourcePage && destinationPage) {
          const parent = cesdk.current.engine.block.getParent(sourcePage);
          if (parent) {
            cesdk.current.engine.block.insertChild(
              parent,
              sourcePage,
              destinationIndex
            );
          }
        }
      }
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <RenderPages />
    </DragDropContext>
  );
};

export default SidebarConfig;
