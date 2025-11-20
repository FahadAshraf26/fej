// @ts-nocheck
import React, { memo, useCallback, useEffect, useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import { AccordionButton, AccordionPanel } from "@Components/Editor/EditorComponents/Accordion";
import { RenderSections } from "@Components/Editor/Sidebar/PageSidebar/LayoutTab/RenderSections";
import { Page, Section } from "@Interfaces/";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { getPageByUUID, getPageIndex, uintId } from "@Components/Editor/Utils";
import { SectionRender } from "@Components/Editor/Sidebar/PageSidebar/SectionRender";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { v4 as uuidv4 } from "uuid";
import dishDragIcon from "@Public/icons/dishDragIcon.svg";

export const SidebarPage = memo(({ page, index }: { page: Page; index: number }) => {
  const [isHovered, setIsHovered] = useState(false);
  const cesdk = useInitializeEditor((state) => state.cesdkInstance);
  const isContentOpen = useInitializeEditor((state) => state.isContentOpen);
  const isLayoutOpen = useInitializeEditor((state) => state.isLayoutOpen);
  const isStyleOpen = useInitializeEditor((state) => state.isStyleOpen);
  const deletePage = usePageStore((state) => state.deletePage);
  const selectedPage = usePageStore((state) => state.getSelectedPage());
  useSectionsStore((state) => state.getSectionsForSelectedPage());
  const setSelectedSection = useSectionsStore((state) => state.setSelectedSection);
  const setActivePageId = usePageStore((state) => state.setActivePageId);
  const setActivePageUUID = usePageStore((state) => state.setActivePageUUID);
  const addPage = usePageStore((state) => state.addPage);

  const togglePages = useCallback((id: number, blockUUID: string) => {
    if (id === usePageStore.getState().activePageId) {
      setActivePageId(-1);
      setActivePageUUID("-1");
      setSelectedSection({ pageId: -1, sectionId: "-1" });
    } else {
      setActivePageId(id);
      setActivePageUUID(blockUUID);
      const block = getPageByUUID(blockUUID, cesdk);
      if (block !== undefined) {
        const isValid = cesdk.current?.engine.block.isValid(block);
        if (isValid) {
          cesdk.current?.engine.block.select(block);
          cesdk.current?.engine.scene.zoomToBlock(block);
        }
      }
      setSelectedSection({ pageId: -1, sectionId: "-1" });
    }
  }, []);

  useEffect(() => {
    if (cesdk.current?.ui.isPanelOpen("//ly.img.panel/assetLibrary")) {
      if (isContentOpen === true) {
        cesdk.current?.ui.closePanel("//ly.img.panel/assetLibrary");
      }
      if (isLayoutOpen === true) {
        cesdk.current?.ui.closePanel("//ly.img.panel/assetLibrary");
      }
      if (isStyleOpen === true) {
        cesdk.current?.ui.closePanel("//ly.img.panel/assetLibrary");
      }
    }
  }, [isContentOpen, isLayoutOpen, isStyleOpen]);

  const onDeletePage = useCallback(() => {
    if (selectedPage) {
      const currentPageBlock = getPageByUUID(
        selectedPage.blockUUID,
        useInitializeEditor.getState().cesdkInstance
      );
      if (!currentPageBlock) return;
      cesdk.current?.engine.block.destroy(currentPageBlock);
      deletePage(page.pageId, page.menu_id);
    }
  }, [selectedPage]);

  const onDuplicatePage = useCallback(() => {
    if (selectedPage) {
      const pageSections = useSectionsStore.getState().getSectionsForSelectedPage();
      const currentPageBlock = getPageByUUID(
        selectedPage.blockUUID,
        useInitializeEditor.getState().cesdkInstance
      );
      if (!currentPageBlock) return;
      const duplicatedBlock = cesdk.current?.engine.block.duplicate(currentPageBlock);
      const newPageId = duplicatedBlock;
      const blockUUID = cesdk.current?.engine.block.getUUID(duplicatedBlock);
      const pageIndex = getPageIndex(newPageId);
      const duplicatedPage: Page = {
        ...selectedPage,
        pageId: newPageId,
        blockUUID,
        id: uintId(),
        page_index: pageIndex,
        name: `Page ${pageIndex + 1}`,
        isSaved: false,
        pageUniqueId: uuidv4(),
        pageUUID: blockUUID,
      };
      addPage(duplicatedPage);
      setActivePageId(newPageId);
      const newSections = pageSections.map((section: Section) => {
        const newSectionId = uuidv4();
        const newId = uintId();
        const currentSectionSettings =
          useSectionsStore.getState().titleHorizontalAlignSettings[section.sectionId];
        useSectionsStore
          .getState()
          .setTitleHorizontalSettings(newSectionId, currentSectionSettings);
        const duplicatedSection = {
          ...section,
          id: newId,
          dndId: newId,
          sectionId: newSectionId,
          sectionUniqueId: newSectionId,
          pageId: newPageId,
          name: section.name,
          dndLayout: {
            ...section.dndLayout,
            i: newSectionId,
          },
        };
        const currentDishSettings =
          useDishesStore.getState().horizontalAlignSettings[section.sectionId];
        useDishesStore.getState().setHorizontalSettings(newSectionId, currentDishSettings);
        const dishesToDuplicate = useDishesStore.getState().oDishes[section.sectionId] || [];
        useDishesStore.getState().setODishes({
          [newSectionId]: dishesToDuplicate.map((dish) => ({
            ...dish,
            id: uintId(),
            frontend_id: uuidv4(),
            section: newSectionId,
          })),
        });

        return duplicatedSection;
      });

      useSectionsStore.getState().setOSections({
        [newPageId]: newSections,
      });
      usePageStore.getState().updateChangedPageIds(newPageId);
    }
  }, [selectedPage]);

  return (
    <Draggable draggableId={page?.pageId?.toString()} index={index} key={page?.pageId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
            background: "inherit",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              // padding: "4px 0",
            }}
          >
            <div
              {...provided.dragHandleProps}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{
                cursor: "grab",
                width: 24,
                height: 24,
                minWidth: 24,
                minHeight: 24,
                borderRadius: 4,
                background: isHovered ? "#E5E7EB" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s, opacity 0.2s",
                opacity: isHovered ? 1 : 0.6,
              }}
            >
              <img
                src={dishDragIcon.src}
                alt="Drag"
                style={{ width: 20, height: 20, display: "block" }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <AccordionButton
                label={`Page ${index + 1}`}
                isActive={usePageStore.getState().activePageId === page.pageId}
                onClick={() => togglePages(page.pageId, page.blockUUID)}
                updateLabel={(value) => value}
                fontSize={"18px"}
                fontFamily="Satoshi-medium-500"
                lineHeight="24px"
                letterSpacing="4%"
                color="#3B3B3B"
                onDelete={onDeletePage}
                onDuplicate={onDuplicatePage}
                isSection={false}
                // styles={{
                //   control: {
                //     padding: "20px 20px 20px 33px",
                //   }
                // }}
              />
            </div>
          </div>

          {isContentOpen && (
            <div
              style={{
                display: usePageStore.getState().activePageId === page.pageId ? "block" : "none",
                transition: "all 0.3s",
              }}
            >
              <SectionRender page={page} />
            </div>
          )}

          {isLayoutOpen && (
            <div
              style={{
                display: usePageStore.getState().activePageId === page.pageId ? "block" : "none",
              }}
            >
              <AccordionPanel isActive={usePageStore.getState().activePageId === page.pageId}>
                <RenderSections pageId={page.pageId} columns={page.columns} />
              </AccordionPanel>
            </div>
          )}

          {isStyleOpen && (
            <div
              style={{
                display: usePageStore.getState().activePageId === page.pageId ? "block" : "none",
                transition: "all 0.3s",
              }}
            >
              <SectionRender page={page} />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
});

SidebarPage.displayName = "SidebarPage";
