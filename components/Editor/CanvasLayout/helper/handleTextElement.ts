import { Dish } from "./interface";

export const handleTextElement = (
  engine: any,
  element: any,
  dish: Dish,
  blockWidth: number,
  fontSize: number,
  x: number,
  currentChildY: number
): number => {
  // Apply positive horizontal margins to content positioning (following section border pattern)
  let adjustedX = x;
  let adjustedWidth = blockWidth;

  if (
    dish.borderImageUrl &&
    dish.dishMarginLeft !== undefined &&
    dish.dishMarginRight !== undefined
  ) {
    const positiveLeftMargin = Math.max(0, dish.dishMarginLeft || 0);
    const positiveRightMargin = Math.max(0, dish.dishMarginRight || 0);

    // Move content inward for positive margins
    if (positiveLeftMargin > 0) {
      adjustedX += positiveLeftMargin;
    }

    // Reduce content width for positive margins (content area gets smaller)
    if (positiveLeftMargin > 0 || positiveRightMargin > 0) {
      adjustedWidth -= positiveLeftMargin + positiveRightMargin;
      adjustedWidth = Math.max(0.1, adjustedWidth); // Ensure minimum width
    }
  }

  let dishHeight = currentChildY;
  const kind = engine.getKind(element);
  if (kind === "text") {
    const textCase = engine.getTextCases(element);
    engine.setTextCase(element, textCase[0]);
  }
  engine.replaceText(element, dish.title);
  engine.setWidth(element, adjustedWidth);
  engine.setHeightMode(element, "Auto");
  engine.setTextFontSize(element, engine.getTextFontSizes(element), dish.title!.length);
  if (dish.inlineText_layout) {
    // engine.setTextColor(element, engine.getTextColors(element), dish.title!.length);
    engine.setTypeface(element, engine.getTypeface(element), dish.title!.length);
  }

  engine.setPositionX(element, adjustedX);
  if (dish.textAlign) {
    engine.setEnum(element, "text/horizontalAlignment", dish.textAlign);
  } else {
    engine.setPositionX(element, adjustedX);
  }
  engine.setName(element, "inlineText");
  const height = engine.getGlobalBoundingBoxHeight(element);
  dishHeight += height;
  return dishHeight;
};
