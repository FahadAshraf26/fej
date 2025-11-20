import { usePageStore } from "@Stores/MenuStore/Pages.store";

export const autoLayoutComponents = [
  "title",
  "description",
  "price",
  "sectionTitle",
  "addons",
  "sectionAddons",
  "section",
  "sectionDish",
  "loaderShape",
  "ApplyloaderText",
  "loaderChangesGraphic",
  "loaderGraphic",
  "loaderText",
  "inlineImage",
  "inlineText",
  "sectionBorder",
  "dishBorder",
];

export const persistLayerOrder = (engine: any) => {
  try {
    const pageId = usePageStore.getState().activePageId;
    if (!pageId || !engine.block.isValid(pageId)) return;

    const children = engine.block.getChildren(pageId);
    if (!children || children.length === 0) return;

    const userPlacedBlocks = children.filter((childId: any) => {
      try {
        return engine.block.isValid(childId) && engine.block.hasMetadata(childId, "isUserPlaced");
      } catch {
        return false;
      }
    });

    userPlacedBlocks.forEach((blockId: number, index: number) => {
      const actualIndex = children.indexOf(blockId);
      engine.block.setMetadata(blockId, "userLayerOrder", actualIndex.toString());
    });
  } catch (error) {
    console.warn(`Could not persist layer order`, error);
  }
};

export const bringForward = (engine: any, blockId: any) => {
  const pageId = engine.block.getParent(blockId);
  if (!pageId || !engine.block.isValid(pageId)) return;
  const children = engine.block.getChildren(pageId);
  const currentIndex = children.indexOf(blockId);
  if (currentIndex < children.length - 1) {
    engine.block.move(blockId, 1);
    persistLayerOrder(engine);
  }
};

export const sendBackward = (engine: any, blockId: any) => {
  const pageId = engine.block.getParent(blockId);
  if (!pageId || !engine.block.isValid(pageId)) return;
  const children = engine.block.getChildren(pageId);
  const currentIndex = children.indexOf(blockId);
  if (currentIndex > 0) {
    engine.block.move(blockId, -1);
    persistLayerOrder(engine);
  }
};

export const bringToFront = (engine: any, blockId: any) => {
  engine.block.bringToFront(blockId);
  persistLayerOrder(engine);
};

export const sendToBack = (engine: any, blockId: any) => {
  engine.block.sendToBack(blockId);
  persistLayerOrder(engine);
};

export const restoreUserLayerPositions = async (engine: any) => {
  try {
    if (!engine || !engine.block) {
      console.warn("Engine not available for layer restoration");
      return;
    }

    const currentPageId = engine.scene.getCurrentPage();
    if (!currentPageId || !engine.block.isValid(currentPageId)) return;

    const allBlocksOnPage = engine.block.getChildren(currentPageId);

    const userPlacedBlocks = allBlocksOnPage.filter((blockId: any) => {
      try {
        return engine.block.hasMetadata(blockId, "isUserPlaced") && engine.block.isValid(blockId);
      } catch {
        return false;
      }
    });

    if (userPlacedBlocks.length === 0) return;

    const blocksToProcess = userPlacedBlocks
      .map((blockId: any) => {
        try {
          const order = engine.block.getMetadata(blockId, "userLayerOrder");
          return {
            blockId,
            order: order ? parseInt(order, 10) : -1,
          };
        } catch {
          return { blockId, order: -1 };
        }
      })
      .filter((b: { order: number }) => b.order !== -1);

    if (blocksToProcess.length === 0) return;

    const sortedBlocks = blocksToProcess.sort(
      (a: { order: number }, b: { order: number }) => a.order - b.order
    );

    for (const { blockId, order } of sortedBlocks) {
      try {
        const currentChildren = engine.block.getChildren(currentPageId);
        const currentIndex = currentChildren.indexOf(blockId);
        const targetIndex = order;

        if (currentIndex !== targetIndex && targetIndex < currentChildren.length) {
          const moveBy = targetIndex - currentIndex;
          engine.block.move(blockId, moveBy);
        }
      } catch (error) {
        console.warn(`Could not move block ${blockId} to position ${order}:`, error);
      }
    }
  } catch (error) {
    console.error("Error restoring user layer positions:", error);
  }
};
