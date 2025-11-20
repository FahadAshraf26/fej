import { customComponent } from "@Contants/customComponent";
import {
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  persistLayerOrder,
} from "../../../CanvasLayout/layerOperations";

export const ElementEditorButton = (instance: any, restaurantList: any[]) => {
  instance.ui.addAssetLibraryEntry({
    id: "Elements",
    sourceIds: [
      customComponent.recent,
      "Elements",
      ...restaurantList.map((item: any) => `${item?.name}.`),
    ],
    previewLength: 5,
    previewBackgroundType: "cover",
    gridBackgroundType: "cover",
    gridColumns: 3,
  });

  instance.ui.setDockOrder([
    {
      id: "Elements",
      key: "Elements",
      label: "Elements",
      entries: ["Elements"],
      icon: ({ theme, iconSize }: any) => {
        return null;
      },
    },
  ]);

  // Override layer controls with custom behavior
  instance.ui.registerComponent(
    "ly.img.position.inspectorBar",
    ({
      builder: { Button },
      engine,
      block,
    }: {
      builder: { Button: any };
      engine: any;
      block: number;
    }) => {
      Button("bring-to-front", {
        label: "Bring to Front",
        icon: "bring-to-front",
        onClick: () => {
          bringToFront(engine, block);
          persistLayerOrder(engine);
        },
      });

      Button("bring-forward", {
        label: "Bring Forward",
        icon: "bring-forward",
        onClick: () => {
          bringForward(engine, block);
          persistLayerOrder(engine);
        },
      });

      Button("send-backward", {
        label: "Send Backward",
        icon: "send-backward",
        onClick: () => {
          sendBackward(engine, block);
          persistLayerOrder(engine);
        },
      });

      Button("send-to-back", {
        label: "Send to Back",
        icon: "send-to-back",
        onClick: () => {
          sendToBack(engine, block);
          persistLayerOrder(engine);
        },
      });
    }
  );
};
