import { useEffect, useRef } from "react";
import CreativeEditorSDK from "@cesdk/cesdk-js";
import { formatDate } from "./Utils/formatDate";
import classes from "./EditorConfig.module.css";

const HistoryEditor = ({ templateData }: any) => {
  const cesdkContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sceneUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL +
      `/storage/v1/object/public/template_versions/${templateData?.file}`;
    CreativeEditorSDK.create(cesdkContainer.current!, {
      logger: () => {},
      role: "Creator",
      license: process.env.REACT_APP_LICENSE,
      ...(templateData?.file && {
        initialSceneURL:
          process.env.NEXT_PUBLIC_SUPABASE_URL +
          `/storage/v1/object/public/template_versions/${
            templateData?.file
          }?t=${new Date().toISOString()}`,
      }),
      ui: {
        elements: {
          navigation: {
            title: `${templateData?.menuName} (Version ${
              templateData?.version
            } | ${formatDate(templateData?.created_at)})`,
          },
        },
      },
    }).then(async (cesdk) => {
      cesdk.engine.editor.setSettingBool("page/title/show", false);
      await cesdk.addDefaultAssetSources();
      await cesdk.addDemoAssetSources({ sceneMode: "Design" });
      cesdk.disableNoSceneWarning();
      await cesdk.loadFromURL(sceneUrl);
      cesdk.ui.setDockOrder([]);
      cesdk.ui.setInspectorBarOrder([]);
      cesdk.ui.setNavigationBarOrder([
        "ly.img.title.navigationBar",
        "ly.img.spacer",
        "ly.img.spacer",
        "ly.img.zoom.navigationBar",
      ]);
      cesdk.ui.setCanvasMenuOrder([]);
      cesdk.ui.setCanvasBarOrder([], "bottom");
    });
  }, [templateData.version]);

  return (
    <div
      className={`${classes.cesdkWrapper} ${"cesdkWrapperStyleWithoutPreview"}`}
    >
      <div
        ref={cesdkContainer}
        id="cesdkContainer"
        className="cesdkStyle"
      ></div>
    </div>
  );
};
export default HistoryEditor;
