import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

interface BlockHeight {
  [key: string]: number;
}

interface Block {
  sectionID: string;
  dishBlockHeight: number;
  type: "sectionTitle" | "sectionSpacer" | "spacer" | "dish";
  newDish: string;
  isSectionTitle?: boolean;
  originalDishX?: number;
  originalDishWidth?: number;
  dishMarginTop?: number;
  dishMarginBottom?: number;
  dishMarginLeft?: number;
  dishMarginRight?: number;
  dishBorderImageUrl?: string;
}

interface PlacementResult {
  currentY: number;
  sectionTitleHeights: BlockHeight;
}

export const placeDishesInCanvas = (
  startY: number,
  dishBlocks: Block[],
  defaultGap: number,
  columns: number,
  initialSectionHeights: BlockHeight
): PlacementResult => {
  let currentY = startY;
  const sectionTitleHeights: BlockHeight = { ...initialSectionHeights };
  const engine = useInitializeEditor.getState().cesdkInstance.current?.engine.block;
  if (!engine) {
    console.error("Engine not initialized");
    return { currentY, sectionTitleHeights };
  }
  dishBlocks.forEach((block, index) => {
    const {
      sectionID,
      dishBlockHeight,
      type,
      newDish,
      dishMarginTop,
      dishMarginBottom,
      dishBorderImageUrl,
    } = block;
    const gap = type === "sectionSpacer" ? 0 : defaultGap;
    if (type === "sectionTitle") {
      sectionTitleHeights[sectionID] = dishBlockHeight;
    }
    const sectionHeight = sectionTitleHeights[sectionID] ?? 0;
    if (columns > 0 && type !== "sectionTitle" && index === 0) {
      currentY += sectionHeight + gap;
    }

    let adjustedY = currentY;

    if (dishBorderImageUrl && type === "dish") {
      const topMargin = dishMarginTop || 0;
      const bottomMargin = dishMarginBottom || 0;

      if (topMargin > 0) {
        adjustedY += topMargin;
      }
    }

    engine.setPositionY(newDish, adjustedY);

    engine.setBool(newDish, "transformLocked", false);

    const actualRenderedHeight = engine.getGlobalBoundingBoxHeight(newDish);

    let totalDishSpace = actualRenderedHeight;

    if (dishBorderImageUrl && type === "dish") {
      const topMargin = dishMarginTop || 0;
      const bottomMargin = dishMarginBottom || 0;

      totalDishSpace +=
        Math.max(0, topMargin) +
        Math.max(0, bottomMargin) +
        Math.abs(Math.min(0, topMargin)) +
        Math.abs(Math.min(0, bottomMargin));
    }

    let effectiveBottom = currentY + totalDishSpace + defaultGap;

    currentY = effectiveBottom;

    engine.setBool(newDish, "transformLocked", true);
  });

  return { currentY, sectionTitleHeights };
};
