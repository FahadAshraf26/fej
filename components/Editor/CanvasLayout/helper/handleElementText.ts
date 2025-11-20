export const handleElementText = (
  engine: any,
  element: any,
  content: string,
  blockWidth: number,
  x: number,
  currentChildY: number,
  dish: any
): number => {
  let adjustedX = x;
  let adjustedWidth = blockWidth;

  if (
    dish.borderImageUrl &&
    dish.dishMarginLeft !== undefined &&
    dish.dishMarginRight !== undefined
  ) {
    const positiveLeftMargin = Math.max(0, dish.dishMarginLeft || 0);
    const positiveRightMargin = Math.max(0, dish.dishMarginRight || 0);

    if (positiveLeftMargin > 0) {
      adjustedX += positiveLeftMargin;
    }

    if (positiveLeftMargin > 0 || positiveRightMargin > 0) {
      adjustedWidth -= positiveLeftMargin + positiveRightMargin;
      adjustedWidth = Math.max(0.1, adjustedWidth);
    }
  }

  const elementKind = engine.getKind(element);
  if (elementKind === "text") {
    const textCase = engine.getTextCases(element);
    engine.setTextCase(element, textCase[0]);
  }

  engine.replaceText(element, content);
  engine.setWidth(element, adjustedWidth);
  engine.setHeightMode(element, "Auto");

  engine.setPositionY(element, currentChildY);
  engine.setPositionX(element, adjustedX);

  const height = engine.getGlobalBoundingBoxHeight(element);
  engine.setBool(element, "transformLocked", true);

  return height;
};
