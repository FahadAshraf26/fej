import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { Dish } from "./interface";
import { Section } from "@Interfaces/*";

export const handleSectionTitle = (
  engine: any,
  newDish: any,
  dish: Dish,
  fontSize: number,
  x: number,
  dishHeight: number,
  sectionWidth: number,
  section: Section,
  titleLayoutSettings: any
): number => {
  let dishElementHeight = dishHeight;
  const childrenList = engine.getChildren(newDish);
  const horizontalSettings =
    useSectionsStore.getState().titleHorizontalAlignSettings[dish.section] ||
    {};
  let titleHeight = 0;
  for (const sectionElement of childrenList) {
    engine.setBool(sectionElement, "transformLocked", false);
    const getName = engine.getName(sectionElement);
    if (getName === "sectionTitle") {
      const titleWithPrice =
        dish.price && !titleLayoutSettings.isSectionTitleTopOnPrice
          ? `${dish.title} ${dish.price}`
          : dish.title;

      if (dish.title != null && dish.isEdit === true && dish.type != "spacer") {
        const newDishKind = engine.getKind(sectionElement);
        if (newDishKind === "text") {
          const textCase = engine.getTextCases(sectionElement);
          engine.setTextCase(sectionElement, textCase[0]);
        }
        engine.replaceText(sectionElement, titleWithPrice);
        engine.setWidth(sectionElement, sectionWidth);
        engine.setHeightMode(sectionElement, "Auto");
        if (dish.titleLayout === null || dish.titleLayout === undefined) {
          engine.setFloat(sectionElement, "text/fontSize", fontSize);
        }
        engine.setPositionX(sectionElement, x);
        if (horizontalSettings.isCenter) {
          engine.setEnum(sectionElement, "text/horizontalAlignment", "Center");
        } else if (horizontalSettings.isRight) {
          engine.setEnum(sectionElement, "text/horizontalAlignment", "Right");
        } else {
          engine.setPositionX(sectionElement, x);
        }
        titleHeight = engine.getGlobalBoundingBoxHeight(sectionElement);
        dishElementHeight += titleHeight;
      } else if (dish.isEdit === false) {
        const newDishKind = engine.getKind(sectionElement);
        if (newDishKind === "text") {
          const textCase = engine.getTextCases(sectionElement);
          engine.setTextCase(sectionElement, textCase[0]);
        }
        engine.replaceText(sectionElement, titleWithPrice);
        engine.setWidth(sectionElement, sectionWidth);
        engine.setHeightMode(sectionElement, "Auto");
        if (dish.titleLayout === null || dish.titleLayout === undefined) {
          engine.setFloat(sectionElement, "text/fontSize", fontSize);
        }
        engine.setPositionX(sectionElement, x);
        if (horizontalSettings.isCenter) {
          engine.setEnum(sectionElement, "text/horizontalAlignment", "Center");
        } else if (horizontalSettings.isRight) {
          engine.setEnum(sectionElement, "text/horizontalAlignment", "Right");
        } else {
          engine.setPositionX(sectionElement, x);
        }
        titleHeight = engine.getGlobalBoundingBoxHeight(sectionElement);
        dishElementHeight += titleHeight;
      } else {
        engine.destroy(sectionElement);
      }

      if (
        dish.price != null &&
        dish.price.length > 0 &&
        titleLayoutSettings.isSectionTitleWithPrice
      ) {
        engine.setTextColor(
          sectionElement,
          engine.getTextColors(childrenList[1])[0],
          dish.title!.length
        );
        engine.setTextFontSize(
          sectionElement,
          engine.getTextFontSizes(childrenList[1])[0],
          dish.title!.length
        );
        if (section?.temp_dish_layout && section?.dish_layout) {
          engine.setTypeface(
            sectionElement,
            engine.getTypeface(childrenList[1]),
            dish.title!.length
          );
        }
      }
    }

    if (getName === "sectionPrice") {
      if (!!dish.price && titleLayoutSettings.isSectionTitleTopOnPrice) {
        const newDishKind = engine.getKind(sectionElement);
        if (newDishKind === "text") {
          const textCase = engine.getTextCases(sectionElement);
          engine.setTextCase(sectionElement, textCase[0]);
        }

        engine.replaceText(sectionElement, dish.price);
        engine.setWidth(sectionElement, sectionWidth);
        engine.setHeightMode(sectionElement, "Auto");
        engine.setPositionY(sectionElement, dishElementHeight);
        if (dish.titleLayout === null || dish.titleLayout === undefined) {
          engine.setFloat(sectionElement, "text/fontSize", fontSize);
        }
        engine.setPositionX(sectionElement, x);
        if (horizontalSettings.isCenter) {
          engine.setEnum(sectionElement, "text/horizontalAlignment", "Center");
        } else if (horizontalSettings.isRight) {
          engine.setEnum(sectionElement, "text/horizontalAlignment", "Right");
        } else {
          engine.setPositionX(sectionElement, x);
        }

        dishElementHeight += engine.getGlobalBoundingBoxHeight(sectionElement);
      } else {
        engine.destroy(sectionElement);
      }
    }

    if (getName === "sectionAddons") {
      if (
        dish.addOns != null &&
        dish.addOns.length > 0 &&
        dish.type != "spacer"
      ) {
        const newDishKind = engine.getKind(sectionElement);
        if (newDishKind === "text") {
          const textCase = engine.getTextCases(sectionElement);
          engine.setTextCase(sectionElement, textCase[0]);
        }

        engine.replaceText(sectionElement, dish.addOns);
        engine.setWidth(sectionElement, sectionWidth);
        engine.setHeightMode(sectionElement, "Auto");
        engine.setPositionY(sectionElement, dishElementHeight);
        if (dish.titleLayout === null || dish.titleLayout === undefined) {
          engine.setFloat(sectionElement, "text/fontSize", fontSize);
        }
        engine.setPositionX(sectionElement, x);
        if (horizontalSettings.isCenter) {
          engine.setEnum(sectionElement, "text/horizontalAlignment", "Center");
        } else if (horizontalSettings.isRight) {
          engine.setEnum(sectionElement, "text/horizontalAlignment", "Right");
        } else {
          engine.setPositionX(sectionElement, x);
        }

        dishElementHeight += engine.getGlobalBoundingBoxHeight(sectionElement);
      } else {
        engine.destroy(sectionElement);
      }
    }
  }
  return dishElementHeight;
};
