export const handleSectionDividerElement = (
  engine: any,
  element: number,
  dish: any,
  x: number,
  dishHeight: number,
  blockWidth: number,
  totalSectionWidth: number,
  sectionStartX: number
): number => {
  if (!dish.dividerImageUrl) {
    engine.destroy(element);
    return 0;
  }

  engine.setShape(element, engine.createShape("rect"));
  const imageFill = engine.createFill("image");
  engine.setString(imageFill, "fill/image/imageFileURI", dish.dividerImageUrl);
  engine.setFill(element, imageFill);
  engine.setContentFillMode(element, "Contain");

  engine.setWidth(element, totalSectionWidth);
  engine.setHeight(element, Number(dish.dividerImageHeightInches) || 1);

  engine.setPositionX(element, sectionStartX);
  engine.setName(element, "sectionDivider");

  return engine.getGlobalBoundingBoxHeight(element);
};
