export const handleDishBorderElement = (
  engine: any,
  element: number,
  dish: any,
  borderX: number,
  borderY: number,
  borderWidth: number,
  borderHeight: number
): number => {
  if (!dish.dishBorderImageUrl) {
    engine.destroy(element);
    return 0;
  }

  engine.setShape(element, engine.createShape("rect"));
  const imageFill = engine.createFill("image");
  engine.setString(imageFill, "fill/image/imageFileURI", dish.dishBorderImageUrl);
  engine.setFill(element, imageFill);
  engine.setContentFillMode(element, "Crop");

  engine.setWidth(element, borderWidth);
  engine.setHeight(element, borderHeight);
  engine.setPositionX(element, borderX);
  engine.setPositionY(element, borderY);

  engine.setName(element, "dishBorder");

  const parent = engine.getParent(element);
  if (parent) {
    engine.insertChild(parent, element, 0);
  }
  return borderHeight;
};
