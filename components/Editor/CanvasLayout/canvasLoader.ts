import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";

function destroyAllLoaderBlocks(instance: any) {
  const loaderNames = [
    "loaderGraphic",
    "loaderText",
    "ApplyloaderText",
    "loaderChangesGraphic",
    "loaderShape",
  ];
  loaderNames.forEach((name) => {
    const [found] = instance.engine.block.findByName(name);
    if (found) {
      instance.engine.block.destroy(found);
    }
  });
}

export const canvasLoader = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const canvasLoaderState = useInitializeEditor.getState().canvasLoader;
      const pages = usePageStore.getState().pages;
      for (const page of pages) {
        const block = page?.pageId;
        const instance = useInitializeEditor.getState().cesdkInstance.current;

        if (!block || !instance) {
          console.error("Canvas loader: Invalid block or instance");
          resolve(); // Silently continue instead of rejecting
          return;
        }

        // Always clean up any loader blocks before doing anything else
        destroyAllLoaderBlocks(instance);

        if (canvasLoaderState === true) {
          // Clean up again just in case
          destroyAllLoaderBlocks(instance);

          const graphic = instance.engine.block.create("graphic");
          const pageHeight = instance.engine.block.getHeight(block);
          const pageWidth = instance.engine.block.getWidth(block);
          instance.engine.block.setName(graphic, "loaderGraphic");

          const rectShape = instance.engine.block.createShape("rect");
          instance.engine.block.setName(rectShape, "loaderShape");
          instance.engine.block.setWidth(graphic, pageWidth);
          instance.engine.block.setHeight(graphic, pageHeight);
          instance.engine.block.appendChild(block, graphic);
          instance.engine.block.supportsShape(graphic);

          const text = instance.engine.block.create("text");
          instance.engine.block.setName(text, "loaderText");
          instance.engine.block.setWidth(text, 1.72);
          instance.engine.block.setHeight(text, 0.67);
          instance.engine.block.setPositionY(text, (pageHeight - 0.67) / 2);
          instance.engine.block.setPositionX(text, (pageWidth - 1.72) / 2);
          instance.engine.block.setFloat(text, "text/fontSize", 24);
          instance.engine.block.appendChild(block, text);
          instance.engine.block.replaceText(text, "Loading ...");

          instance.engine.block.setShape(graphic, rectShape);
          const solidColor = instance.engine.block.createFill("color");
          const rgbaBlack = { r: 1, g: 1, b: 1, a: 0.8 };
          instance.engine.block.setColor(solidColor, "fill/color/value", rgbaBlack);
          instance.engine.block.setFill(graphic, solidColor);
          instance.engine.block.setFillEnabled(graphic, true);

          // Wait for the next frame to ensure all rendering is complete
          requestAnimationFrame(() => {
            resolve();
          });
        } else {
          // Clean up all loader blocks when loading is done
          destroyAllLoaderBlocks(instance);
          resolve();
        }
      }
    } catch (error) {
      reject(error);
    }
  });
};
