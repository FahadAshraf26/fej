import { Section } from "@Interfaces/";
import { handleElementText } from "./handleElementText";
import { Dish, LayoutSettings } from "./interface";

export const handleDishElements = (
  engine: any,
  element: any,
  dish: Dish,
  layoutSettings: LayoutSettings,
  blockWidth: number,
  fontSize: number,
  x: number,
  dishHeight: number,
  titleHeight: number,
  descriptionHeight: number,
  childrenList: any[],
  section: Section | undefined,
  addonHeight: number
): {
  dishHeight: number;
  titleHeight: number;
  descriptionHeight: number;
  addonHeight: number;
} => {
  const elementName = engine.getName(element);
  engine.setBool(element, "transformLocked", false);

  let dishElementHeight = dishHeight;
  let updatedTitleHeight = titleHeight;
  let updatedDescriptionHeight = descriptionHeight;
  let updatedAddonsHeight = addonHeight;
  if (layoutSettings.isDishTitleAndPrice) {
    if (elementName === "title") {
      if (dish.title && dish.title.length > 0) {
        const priceStr = dish.price != null ? `  ${dish.price}` : "";
        const newTitle = `${dish.title}${priceStr}`;
        handleElementText(engine, element, newTitle, blockWidth, x, dishElementHeight, dish);
        if (dish.price != null && dish.price.length > 0) {
          engine.setTextColor(
            element,
            engine.getTextColors(childrenList[2])[0],
            dish.title!.length
          );
          engine.setTextFontSize(
            element,
            engine.getTextFontSizes(childrenList[2])[0],
            dish.title!.length
          );
          if (section?.temp_dish_layout && section?.dish_layout) {
            engine.setTypeface(element, engine.getTypeface(childrenList[2]), dish.title!.length);
          }
        }
        dishElementHeight += engine.getGlobalBoundingBoxHeight(element);
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "description") {
      if (dish.description && dish.description.length > 0) {
        dishElementHeight += handleElementText(
          engine,
          element,
          dish.description,
          blockWidth,
          x,
          dishElementHeight,
          dish
        );
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "addons") {
      if (dish.addOns && dish.addOns.length > 0) {
        dishElementHeight += handleElementText(
          engine,
          element,
          dish.addOns,
          blockWidth,
          x,
          dishElementHeight,
          dish
        );
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "price") {
      engine.destroy(element);
    }
  } else if (layoutSettings.isDishDescriptionAndPrice) {
    let shouldUpdateY = false;

    if (elementName === "title") {
      if (dish.title && dish.title.length > 0) {
        let newTitle = `${dish.title} ${dish.dietaryIcons}`;
        if (dish.price?.length && !dish.description?.length) {
          newTitle += ` ${dish.price}`;
        }
        dishElementHeight += handleElementText(
          engine,
          element,
          newTitle,
          blockWidth,
          x,
          dishElementHeight,
          dish
        );
        shouldUpdateY = true;
        if (dish.price != null && dish.price.length > 0 && !dish.description?.length) {
          engine.setTextColor(element, engine.getTextColors(childrenList[2])[0], dish.title.length);
          engine.setTextFontSize(
            element,
            engine.getTextFontSizes(childrenList[2])[0],
            dish.title.length
          );
          if (section?.temp_dish_layout && section?.dish_layout) {
            engine.setTypeface(element, engine.getTypeface(childrenList[2]), dish.title.length);
          }
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "description") {
      const dishDescription = dish.description ?? "";
      if (dishDescription.length) {
        const priceStr = dish.price != null ? `  ${dish.price}` : "";
        const newText = `${dishDescription}${priceStr}`;
        const titleHeight = engine.getGlobalBoundingBoxHeight(childrenList[0]);
        const yPos = dish.title ? dishElementHeight + titleHeight : dishElementHeight;
        const heightChange = handleElementText(engine, element, newText, blockWidth, x, yPos, dish);
        if (heightChange > 0) {
          dishElementHeight = yPos + heightChange;
          shouldUpdateY = true;
        }
        if (dish.price != null && dish.price.length > 0) {
          engine.setTextColor(
            element,
            engine.getTextColors(childrenList[2])[0],
            dishDescription.length
          );
          engine.setTextFontSize(
            element,
            engine.getTextFontSizes(childrenList[2])[0],
            dishDescription.length
          );
          if (section?.temp_dish_layout && section?.dish_layout) {
            engine.setTypeface(
              element,
              engine.getTypeface(childrenList[2]),
              dishDescription.length
            );
          }
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "addons") {
      if (dish.addOns && dish.addOns.length > 0) {
        const heightChange = handleElementText(
          engine,
          element,
          dish.addOns,
          blockWidth,
          x,
          dishElementHeight,
          dish
        );
        if (heightChange > 0) {
          dishElementHeight += heightChange;
          shouldUpdateY = true;
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "price") {
      engine.destroy(element);
    }
  } else if (layoutSettings.isDishTitleAndDescriptionAndPrice) {
    if (elementName === "title") {
      if (dish.title && dish.title.length > 0) {
        const descriptionStr = dish.description != null ? `  ${dish.description}` : "";
        const priceStr = dish.price != null ? ` ${dish.price}` : "";
        const newTitle = `${dish.title}${descriptionStr}${priceStr} ${dish.dietaryIcons ?? ""}`;
        handleElementText(engine, element, newTitle, blockWidth, x, dishElementHeight, dish);
        if (dish.description != null) {
          engine.setTextFontSize(
            element,
            engine.getTextFontSizes(childrenList[1])[0],
            dish.title.length
          );
          if (section?.temp_dish_layout || section?.dish_layout) {
            engine.setTypeface(element, engine.getTypeface(childrenList[1]), dish.title.length);
          }
          engine.setTextColor(element, engine.getTextColors(childrenList[1])[0], dish.title.length);
        }
        if (dish.price != null) {
          engine.setTextColor(
            element,
            engine.getTextColors(childrenList[2])[0],
            dish.title.length + (descriptionStr.length || 0)
          );
          engine.setTextFontSize(
            element,
            engine.getTextFontSizes(childrenList[2])[0],
            dish.title.length + (descriptionStr?.length || 0)
          );
          if (section?.temp_dish_layout || section?.dish_layout) {
            engine.setTypeface(
              element,
              engine.getTypeface(childrenList[2]),
              dish.title.length + (descriptionStr.length || 0)
            );
          }
        }
        dishElementHeight += engine.getGlobalBoundingBoxHeight(element);
      } else if (dish.description && dish.description.length > 0) {
        const priceStr = dish.price != null ? ` ${dish.price}` : "";
        const newText = `${dish.description}${priceStr}`;
        handleElementText(engine, element, newText, blockWidth, x, dishElementHeight, dish);

        engine.setTextFontSize(
          element,
          engine.getTextFontSizes(childrenList[1])[0],
          dish.description.length
        );
        engine.setTextColor(
          element,
          engine.getTextColors(childrenList[1])[0],
          dish.description.length
        );

        if (dish.price != null) {
          engine.setTextColor(
            element,
            engine.getTextColors(childrenList[2])[0],
            dish.price.length + dish.description.length
          );
          engine.setTextFontSize(
            element,
            engine.getTextFontSizes(childrenList[2])[0],
            dish.price.length + dish.description.length
          );
          if (section?.temp_dish_layout || section?.dish_layout) {
            engine.setTypeface(
              element,
              engine.getTypeface(childrenList[2]),
              dish.price.length + dish.description.length
            );
          }
        }
        const _height = engine.getGlobalBoundingBoxHeight(element);

        dishElementHeight += _height;
      } else if (dish.price != null && dish.price.length > 0) {
        handleElementText(engine, element, dish.price, blockWidth, x, dishElementHeight, dish);
        engine.setTextColor(element, engine.getTextColors(childrenList[2])[0], dish.price.length);
        engine.setTextFontSize(
          element,
          engine.getTextFontSizes(childrenList[2])[0],
          dish.price.length
        );
        dishElementHeight += engine.getGlobalBoundingBoxHeight(element);
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "addons") {
      if (dish.addOns && dish.addOns.length > 0) {
        dishElementHeight += handleElementText(
          engine,
          element,
          dish.addOns,
          blockWidth,
          x,
          dishElementHeight,
          dish
        );
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "description" || elementName === "price") {
      engine.destroy(element);
    }
  } else if (layoutSettings.isJustifyPriceTop || layoutSettings.isJustifyPriceCenter) {
    const space = dish.secondPrice != null && dish.secondPrice.length > 0 ? 0.2 : 0.1;
    if (elementName === "title") {
      if (dish.title && dish.title.length > 0) {
        const newTitle = `${dish.title} ${dish.dietaryIcons ?? ""}`;

        let titleWidth = blockWidth - blockWidth * space;
        console.log("titleWidth", titleWidth);
        const height = handleElementText(
          engine,
          element,
          newTitle,
          titleWidth,
          x,
          dishElementHeight,
          dish
        );
        dishElementHeight += height;
        updatedTitleHeight = height;

        engine.setEnum(element, "text/horizontalAlignment", "Left");
      } else {
        updatedTitleHeight = 0;
        engine.destroy(element);
      }
    } else if (elementName === "description") {
      if (dish.description && dish.description.length > 0) {
        const descriptionWidth = blockWidth - blockWidth * space;
        console.log("descriptionWidth", descriptionWidth);
        const height = handleElementText(
          engine,
          element,
          dish.description,
          descriptionWidth,
          x,
          dishElementHeight,
          dish
        );
        dishElementHeight += height;
        updatedDescriptionHeight = height;

        engine.setEnum(element, "text/horizontalAlignment", "Left");
      } else {
        updatedDescriptionHeight = 0;
        engine.destroy(element);
      }
    } else if (elementName === "addons") {
      if (dish.addOns && dish.addOns.length > 0) {
        const height = handleElementText(
          engine,
          element,
          dish.addOns,
          blockWidth,
          x,
          dishElementHeight,
          dish
        );
        dishElementHeight += height;
        updatedAddonsHeight = height;
      } else {
        updatedAddonsHeight = 0;
        engine.destroy(element);
      }
    } else if (elementName === "price") {
      if (
        (dish.price != null && dish.price.length > 0) ||
        (dish.secondPrice != null && dish.secondPrice.length > 0)
      ) {
        let totalHeight = updatedTitleHeight + updatedDescriptionHeight + updatedAddonsHeight;
        const hasTitle = dish.title && dish.title.length > 0;
        const hasDescription = dish.description && dish.description.length > 0;
        const hasAddOns = dish.addOns && dish.addOns.length > 0;

        const oneLineDish =
          (hasTitle && !hasDescription && !hasAddOns) ||
          (!hasTitle && hasDescription && !hasAddOns) ||
          (!hasTitle && !hasDescription && hasAddOns);

        let priceHeightY;
        const priceHeight = engine.getGlobalBoundingBoxHeight(element);

        if (totalHeight > 0) {
          if (layoutSettings.isJustifyPriceTop) {
            priceHeightY = dishElementHeight - totalHeight;
          } else if (layoutSettings.isJustifyPriceCenter && !oneLineDish) {
            const titleBottomY = dishElementHeight - totalHeight + updatedTitleHeight;

            const centerY = titleBottomY - priceHeight / 2;
            priceHeightY = centerY;
          } else {
            priceHeightY = dishElementHeight - (totalHeight + priceHeight) + updatedTitleHeight;
          }
        } else {
          if (layoutSettings.isJustifyPriceTop) {
            priceHeightY = dishElementHeight;
          } else {
            priceHeightY = dishElementHeight;
          }

          if (!layoutSettings.isJustifyPriceTop) {
            dishElementHeight += fontSize;
          }
        }

        let priceText = "";
        if (dish.price != null && dish.secondPrice != null) {
          priceText = `${dish.price}  ${dish.secondPrice}`;
        } else if (dish.price != null) {
          priceText = dish.price;
        } else if (dish.secondPrice != null) {
          priceText = dish.secondPrice;
        }

        if (priceText.length > 0) {
          handleElementText(engine, element, priceText, blockWidth, x, priceHeightY, dish);
          engine.setEnum(element, "text/horizontalAlignment", "Right");
        }
      }
    }
  } else if (layoutSettings.isDefaultLayout) {
    if (elementName === "title") {
      if (dish.title != null) {
        if (dish.title.length > 0) {
          const newTitle = `${dish.title} ${dish.dietaryIcons ?? ""}`;
          dishElementHeight += handleElementText(
            engine,
            element,
            newTitle,
            blockWidth,
            x,
            dishElementHeight,
            dish
          );
        } else {
          engine.destroy(element);
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "price") {
      if (dish.price != null) {
        if (dish.price.length > 0) {
          dishElementHeight += handleElementText(
            engine,
            element,
            dish.price,
            blockWidth,
            x,
            dishElementHeight,
            dish
          );
        } else {
          engine.destroy(element);
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "description") {
      if (dish.description != null) {
        if (dish.description.length > 0) {
          dishElementHeight += handleElementText(
            engine,
            element,
            dish.description,
            blockWidth,
            x,
            dishElementHeight,
            dish
          );
        } else {
          engine.destroy(element);
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "addons") {
      if (dish.addOns != null) {
        if (dish.addOns.length > 0) {
          dishElementHeight += handleElementText(
            engine,
            element,
            dish.addOns,
            blockWidth,
            x,
            dishElementHeight,
            dish
          );
        } else {
          engine.destroy(element);
        }
      } else {
        engine.destroy(element);
      }
    }
  } else {
    if (elementName === "title") {
      if (dish.title != null) {
        if (dish.title.length > 0) {
          const newTitle = `${dish.title} ${dish.dietaryIcons ?? ""}`;
          dishElementHeight += handleElementText(
            engine,
            element,
            newTitle,
            blockWidth,
            x,
            dishElementHeight,
            dish
          );
        } else {
          engine.destroy(element);
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "price") {
      if (dish.price != null) {
        if (dish.price.length > 0) {
          dishElementHeight += handleElementText(
            engine,
            element,
            dish.price,
            blockWidth,
            x,
            dishElementHeight,
            dish
          );
        } else {
          engine.destroy(element);
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "description") {
      if (dish.description != null) {
        if (dish.description.length > 0) {
          dishElementHeight += handleElementText(
            engine,
            element,
            dish.description,
            blockWidth,
            x,
            dishElementHeight,
            dish
          );
        } else {
          engine.destroy(element);
        }
      } else {
        engine.destroy(element);
      }
    } else if (elementName === "addons") {
      if (dish.addOns != null) {
        if (dish.addOns.length > 0) {
          dishElementHeight += handleElementText(
            engine,
            element,
            dish.addOns,
            blockWidth,
            x,
            dishElementHeight,
            dish
          );
        } else {
          engine.destroy(element);
        }
      } else {
        engine.destroy(element);
      }
    }
  }

  return {
    dishHeight: dishElementHeight,
    titleHeight: updatedTitleHeight,
    descriptionHeight: updatedDescriptionHeight,
    addonHeight: updatedAddonsHeight,
  };
};
