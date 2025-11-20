export const handleImageElement = (
  engine: any,
  element: number,
  dish: any,
  x: number,
  dishHeight: number
): number => {
  let imageElementHeight = dishHeight;

  if (!dish.imageUrl) {
    engine.destroy(element);
    return imageElementHeight;
  }

  let adjustedX = x;

  if (dish.borderImageUrl && dish.dishMarginLeft !== undefined) {
    const positiveLeftMargin = Math.max(0, dish.dishMarginLeft || 0);

    if (positiveLeftMargin > 0) {
      adjustedX += positiveLeftMargin;
    }
  }

  const width = (dish.imageWidth / dish.imageHeight) * dish.imageHeightInches;
  engine.setShape(element, engine.createShape("rect"));
  const imageFill = engine.createFill("image");
  engine.setString(imageFill, "fill/image/imageFileURI", dish.imageUrl);
  engine.setFill(element, imageFill);
  engine.setContentFillMode(element, "Cover");
  engine.setWidth(element, width);
  engine.setHeight(element, Number(dish.imageHeightInches) || 1);
  engine.setPositionX(element, adjustedX);
  engine.setName(element, "inlineImage");
  imageElementHeight += engine.getGlobalBoundingBoxHeight(element);

  return imageElementHeight;
};
