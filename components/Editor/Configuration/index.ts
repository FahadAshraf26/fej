import { ITemplateDetails, IUserDetails } from "@Interfaces/ITemplate";
import { editorCallbacks } from "@Components/Editor/Configuration/callbacks";
import { getMenuTitle } from "../getTitle";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { cleanup } from "../CanvasLayout/changesQueued";
import {
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  persistLayerOrder,
} from "../CanvasLayout/layerOperations";

export const eConfiguration = async (
  menuContent: ITemplateDetails | null | undefined,
  template: ITemplateDetails | null,
  saveTemplate: (value: string) => void,
  router: any,
  user: IUserDetails
) => {
  const { onExport, captureCoverImage, onPublish, onUpload, onSave } = await editorCallbacks(
    menuContent,
    template,
    saveTemplate,
    user
  );
  const restaurantList = useInitializeEditor.getState().restaurantList || [];

  const createCleanId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const restaurantI18nKeys: { [key: string]: string } = {};

  restaurantList.forEach((restaurant: any) => {
    if (restaurant?.name && typeof restaurant.name === "string") {
      const cleanId = createCleanId(restaurant.name);

      restaurantI18nKeys[`libraries.${cleanId}.label`] = restaurant.name;
    }
  });

  const waitForStateValue = (
    getStateValue: () => boolean,
    targetValue: boolean,
    interval = 100
  ) => {
    return new Promise<void>((resolve) => {
      const checkValue = setInterval(() => {
        const stateValue = getStateValue();
        if (stateValue === targetValue) {
          clearInterval(checkValue);
          resolve();
        }
      }, interval);
    });
  };

  const customActionButtons = [
    {
      label: template?.isAutoLayout ? "Apply Changes" : "Save",
      iconName: "save",
      callback: () => {
        cleanup();
        onSave();
      },
    },
    {
      label: "Download",
      iconName: "download",
      export: {
        show: true,
        format: ["application/pdf"],
        onclick: () => alert("Download"),
      },
      callback: async () => {
        const cesdkInstance = await useInitializeEditor.getState().cesdkInstance;
        const scene = cesdkInstance.current.engine.scene.get();
        const mimeType = "application/pdf";
        const blob = await cesdkInstance.current.engine.block.export(scene, mimeType);
        onExport([blob]);
      },
    },
  ];
  if (!router.pathname.includes("/template")) {
    customActionButtons.push({
      label: "Publish",
      iconName: "default",
      callback: async () => {
        await onSave();
        await waitForStateValue(() => useInitializeEditor.getState().canvasLoader, false);
        onPublish();
      },
    });
  }
  return {
    logger: () => {},
    role: "Creator",
    license: process.env.REACT_APP_LICENSE,
    ...(template?.content && {
      initialSceneURL:
        process.env.NEXT_PUBLIC_SUPABASE_URL +
        `/storage/v1/object/public/templates/${template?.content}?t=${new Date().toISOString()}`,
    }),
    i18n: {
      en: {
        ...restaurantI18nKeys,
        "libraries.ly.img.upload.label": "My Uploads",
        "libraries.ly.img.image.label": "Images",
        "libraries.ly.img.text.label": "Text",
        "libraries.ly.img.vectorpath.label": "Shapes",
        "meta.currentLanguage": "English",
        "libraries.Images.label": "Restaurant Images",
      },
    },
    ui: {
      elements: {
        navigation: {
          title: getMenuTitle(),
          action: {
            custom: [...customActionButtons],
          },
        },
      },
      libraries: {
        insert: {
          autoClose: false,
        },
      },
      dock: {
        iconSize: "normal",
        hideLabels: false,
      },
      pageFormats: {
        "american-letter": {
          default: true,
          width: 8.5,
          height: 11,
          unit: "Inch",
        },
        Legal: {
          width: 8.5,
          height: 14,
          unit: "Inch",
        },
        Tabloid: {
          width: 11,
          height: 17,
          unit: "Inch",
        },
        "Half Letter": {
          width: 5.5,
          height: 8.5,
          unit: "Inch",
        },
        "Quarter Letter": {
          width: 4.25,
          height: 5.5,
          unit: "Inch",
        },
      },
      typefaceLibraries: ["my-custom-typefaces", "ly.img.typeface"],
    },
    callbacks: {
      onExport: async (blobs: any) => onExport(blobs),
      onUpload: async (file: any) => onUpload(file),
    },
  };
};
