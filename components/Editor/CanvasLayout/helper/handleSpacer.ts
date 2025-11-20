import { Dish } from "./interface";

export const handleSpacer = (
  engine: any,
  newDish: any,
  dish: Dish,
  blockWidth: number,
  x: number,
  dishHeight: number
): { dishElementHeight: number; spacerHeight: number } => {
  const spacerObj =
    typeof dish.spacer === "string" ? JSON.parse(dish.spacer) : dish.spacer;
  const spacerHeight = Number(spacerObj?.height ?? 0);
  let dishElementHeight = dishHeight;

  const childrenList = engine.getChildren(newDish);
  childrenList.forEach((element: any) => {
    const name = engine.getName(element);
    engine.setTransformLocked(element, false);
    if (spacerHeight > 0 && name === "sectionTitle" && dish.type === "spacer") {
      engine.replaceText(element, "");
      engine.setWidth(element, blockWidth);
      engine.setHeight(element, spacerHeight);
      engine.setPositionX(element, x);
      engine.setPositionY(element, dishHeight);
      dishElementHeight = spacerHeight;
    } else if (spacerHeight > 0 && dish.type === "sectionSpacer") {
      engine.replaceText(element, "");
      engine.setWidth(element, blockWidth);
      engine.setHeight(element, spacerHeight);
      engine.setPositionX(element, x);
      dishElementHeight = spacerHeight;
    } else {
      engine.destroy(element);
    }
  });

  return {
    dishElementHeight,
    spacerHeight: dish.type === "sectionSpacer" ? 0 : spacerHeight,
  };
};
