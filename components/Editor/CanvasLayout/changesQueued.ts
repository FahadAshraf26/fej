import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import styles from "./ArrowAnimation.module.css";

interface BlockEvent {
  block: number;
  type: string;
}

// Remove arrow when changes are applied
const cleanup = () => {
  try {
    // Try multiple selectors to ensure we find the arrow
    const arrowSelectors = [
      `.${styles.arrowContainer}`,
      '[class*="arrowContainer"]',
      '[class*="arrow-container"]'
    ];

    for (const selector of arrowSelectors) {
      const arrows = document.querySelectorAll(selector);
      arrows.forEach(arrow => {
        if (arrow && arrow.parentNode) {
          // Remove all child elements first
          while (arrow.firstChild) {
            arrow.removeChild(arrow.firstChild);
          }
          // Then remove the arrow container itself
          arrow.parentNode.removeChild(arrow);
        }
      });
    }

    // Additional cleanup for any SVG elements that might be left behind
    const svgElements = document.querySelectorAll(`.${styles.arrowSvg}`);
    svgElements.forEach(svg => {
      if (svg && svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
    });
  } catch (error) {
    console.error('Error cleaning up arrow:', error);
  }
};

export const changesQueued = () => {
  const { changedPageIds, isAutoLayoutComponent } = usePageStore.getState();
  const { canvasLoader, isSaving } = useInitializeEditor.getState();
  const block = usePageStore.getState().getSelectedPage()?.pageId;
  const instance = useInitializeEditor.getState().cesdkInstance.current;
  const hasOnlyDefaultPage =
    changedPageIds.size === 1 && changedPageIds.has(-1);
  const hasChanges = changedPageIds.size > 0 && !hasOnlyDefaultPage;

  // Only cleanup when there are no changes
  if (changedPageIds.size === 0) {
    cleanup();
  }

  if (block) {
    const solidColor = instance.engine.block.createFill("color");
    const rgbaBlack = { r: 1, g: 1, b: 1, a: 0.8 };
    const [graphicBlock] = instance.engine.block.findByName(
      "loaderChangesGraphic"
    );
    if (
      isAutoLayoutComponent &&
      hasChanges === true &&
      !graphicBlock &&
      canvasLoader === false
    ) {
      // Clean up any existing arrows before creating a new one
      cleanup();

      // Create the arrow container and SVG
      const arrowContainer = document.createElement("div");
      arrowContainer.setAttribute("class", styles.arrowContainer);
      arrowContainer.setAttribute("data-arrow-container", "true");
      
      const arrowSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      arrowSvg.setAttribute("width", "391");
      arrowSvg.setAttribute("height", "426");
      arrowSvg.setAttribute("viewBox", "0 0 391 426");
      arrowSvg.setAttribute("fill", "none");
      arrowSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      arrowSvg.setAttribute("class", styles.arrowSvg);
      arrowSvg.setAttribute("data-arrow-svg", "true");

      const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path1.setAttribute("d", "M9 417C165.429 270.375 269.714 172.625 374 26");
      path1.setAttribute("stroke", "#FFA500");
      path1.setAttribute("stroke-width", "17.425");
      path1.setAttribute("stroke-linecap", "round");
      path1.setAttribute("stroke-linejoin", "round");
      path1.setAttribute("class", styles.arrowPath);

      const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path2.setAttribute("d", "M348.653 33.343L379.076 9L372.996 63.7662L348.653 33.343Z");
      path2.setAttribute("fill", "#FFA500");
      path2.setAttribute("stroke", "#FFA500");
      path2.setAttribute("stroke-width", "17.425");
      path2.setAttribute("stroke-linecap", "round");
      path2.setAttribute("stroke-linejoin", "round");
      path2.setAttribute("class", styles.arrowPath);

      arrowSvg.appendChild(path1);
      arrowSvg.appendChild(path2);
      arrowContainer.appendChild(arrowSvg);

      // Always append the new arrow container
      document.body.appendChild(arrowContainer);

      const graphic = instance.engine.block.create("graphic");
      const pageHeight = instance.engine.block.getHeight(block);
      const pageWidth = instance.engine.block.getWidth(block);
      instance.engine.block.setName(graphic, "loaderChangesGraphic");
      const rectShape = instance.engine.block.createShape("rect");
      instance.engine.block.setName(rectShape, "loaderShape");
      instance.engine.block.setWidth(graphic, pageWidth);
      instance.engine.block.setHeight(graphic, pageHeight);
      instance.engine.block.appendChild(block, graphic);
      instance.engine.block.supportsShape(graphic);
      const text = instance.engine.block.create("text");
      instance.engine.block.setName(text, "ApplyloaderText");
      instance.engine.block.setWidth(text, 6.75);
      instance.engine.block.setHeight(text, 0.92);
      instance.engine.block.setPositionY(text, (pageHeight - 0.92) / 2);
      instance.engine.block.setPositionX(text, (pageWidth - 6.75) / 2);
      instance.engine.block.setFloat(text, "text/fontSize", 24);
      instance.engine.block.setEnum(text, "text/horizontalAlignment", "Center");
      instance.engine.block.appendChild(block, text);
      instance.engine.block.replaceText(
        text,
        `Almost done! Click "Apply Changes" to update your menu.`
      );
      instance.engine.block.setShape(graphic, rectShape);
      instance.engine.block.setColor(solidColor, "fill/color/value", rgbaBlack);
      instance.engine.block.setFill(graphic, solidColor);
      instance.engine.block.setFillEnabled(graphic, true);

      // Add cleanup to the instance using the engine's event system
      instance.engine.event.subscribe([graphic], (events: BlockEvent[]) => {
        for (const event of events) {
          if (event.type === "destroyed") {
            cleanup();
            instance.engine.block.destroy(graphic);
          }
        }
      });
    }
  }
};

// Export cleanup function to be used by other components
export { cleanup };
