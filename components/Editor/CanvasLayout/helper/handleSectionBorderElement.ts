export const handleSectionBorderElement = (
  engine: any,
  element: number,
  section: any,
  sectionX: number,
  sectionY: number,
  sectionWidth: number,
  sectionHeight: number
): number => {
  if (!section.borderImageUrl) {
    engine.destroy(element);
    return 0;
  }

  engine.setShape(element, engine.createShape("rect"));
  const imageFill = engine.createFill("image");
  engine.setString(imageFill, "fill/image/imageFileURI", section.borderImageUrl);
  engine.setFill(element, imageFill);
  engine.setContentFillMode(element, "Crop");

  engine.setWidth(element, sectionWidth);
  engine.setHeight(element, sectionHeight);
  engine.setPositionX(element, sectionX);
  engine.setPositionY(element, sectionY);

  engine.setName(element, "sectionBorder");

  const parent = engine.getParent(element);
  if (parent) {
    engine.insertChild(parent, element, 0);
  }
  return sectionHeight;
};
