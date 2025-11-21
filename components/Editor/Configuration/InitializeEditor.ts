import { getConfigOfImageComponent } from "@Components/Editor/Utils";
import { ITemplateDetails, IUserDetails } from "@Interfaces/";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { dockIcons } from "./dockIcons";
import { customButtons } from "./customButtons";
import { getFonts } from "@Components/Editor/Utils";
import { toast } from "react-toastify";
import { getArchiveFileName, getSceneStorageKey } from "@Components/Editor/Utils/sceneStorage";
import { fetchTextWithRetry } from "@Utils/fetchWithRetry";

export const InitializeEditor = async ({
  template,
  instance,
  configData,
  user,
}: {
  template: ITemplateDetails | null;
  instance: any;
  configData: any;
  user: IUserDetails;
}) => {
  const cesdkInstance = useInitializeEditor.getState().cesdkInstance;
  const templateFonts = useInitializeEditor.getState().fonts;

  const createCleanId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  try {
    const sceneStorageKey = getSceneStorageKey(template?.content, template?.isPSDImport);
    const sceneUrl = sceneStorageKey
      ? `${
          process.env.NEXT_PUBLIC_SUPABASE_URL
        }/storage/v1/object/public/templates/${sceneStorageKey}?t=${new Date().toISOString()}`
      : undefined;

    instance.addDefaultAssetSources();
    instance.addDemoAssetSources({ sceneMode: "Design" });
    instance.engine.asset.addLocalSource("my-custom-typefaces");
    getFonts(templateFonts).map((font: any) => {
      instance.engine.asset.addAssetToSource("my-custom-typefaces", font);
    });

    await instance.createDesignScene();
    cesdkInstance.current = instance;

    let psdProcessor: any = null;
    if (typeof window !== "undefined") {
      const PSDProcessorModule = await import("@Components/PSDImport/PSDProcessor");
      const PSDProcessor = PSDProcessorModule.default;
      psdProcessor = PSDProcessor.getInstance();
      psdProcessor.setEngine(instance.engine);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    dockIcons(instance);
    customButtons(instance, template);

    if (template?.isPSDImport) {
      if (!sceneStorageKey || !sceneUrl) {
        throw new Error("Missing PSD scene storage path.");
      }

      let hasLoadedScene = false;

      // Fetch scene JSON first to check if we need to load from IndexedDB
      const sceneContent = await fetchTextWithRetry(sceneUrl, {
        timeout: 10000,
        maxRetries: 3,
      });
      let sceneData: any | null = null;

      try {
        sceneData = JSON.parse(sceneContent);
      } catch (parseError) {
        console.warn("Failed to parse PSD scene JSON, using raw string.", parseError);
      }

      // If this is a first-time load, skip URL attempt and load from IndexedDB directly
      if (sceneData?.meta?.needsFirstSave && sceneData?.meta?.processedArchiveFileName) {
          const contentId = sceneStorageKey?.replace(/\.json$/i, "") || template?.content;
          
          const { getBlobFromIndexedDB, removeBlobFromIndexedDB } = await import(
            "@Helpers/IndexedDBStorage"
          );

          try {
            // Load the single multi-page scene archive from IndexedDB
            const blobKey = `psd_archive_${contentId}`;
            const storedBlob = await getBlobFromIndexedDB(blobKey);

            if (storedBlob) {
              console.log(`Loading ${sceneData?.meta?.isMultiPageScene ? 'multi-page' : 'single'} scene from IndexedDB`);
              
              // Load from IndexedDB blob
              const tempArchiveUrl = URL.createObjectURL(storedBlob);
              await cesdkInstance.current?.engine.scene.loadFromArchiveURL(tempArchiveUrl);
              URL.revokeObjectURL(tempArchiveUrl);
              hasLoadedScene = true;
              
              // Remove the archive from IndexedDB after successful load
              await removeBlobFromIndexedDB(blobKey);

              if (sceneData?.meta?.needsFirstSave) {
                // Use shared savePSDArchive utility function
                (async () => {
                  try {
                    const { savePSDArchive } = await import(
                      "@Components/Editor/Utils/savePSDArchive"
                    );
                    const result = await savePSDArchive(
                      cesdkInstance.current?.engine,
                      template,
                      sceneData,
                      sceneStorageKey
                    );

                    if (result.error) {
                      console.error("Error during auto-save on first editor open:", result.error);
                    } else {
                      console.log("PSD menu auto-saved successfully on first editor open");
                    }
                  } catch (autoSaveError) {
                    console.error("Error during auto-save on first editor open:", autoSaveError);
                  }
                })();
              }
            } else {
              console.error("PSD archive blob not found in IndexedDB. The scene cannot be loaded.");
              const message = "PSD scene data is missing. Please re-import the PSD file.";
              toast(message, { type: "error" });
              throw new Error(message);
            }
          } catch (blobError) {
            console.error("Failed to load from stored blob:", blobError);
            const message =
              blobError instanceof Error && blobError.message
                ? blobError.message
                : "Failed to load PSD scene. Please re-import the PSD file.";
            toast(message, { type: "error" });
            throw blobError;
          }
      } else {
        // Not a first-time load, try loading from URL
        const archiveFileName = getArchiveFileName(sceneStorageKey);

        if (archiveFileName) {
          const archiveUrl = `${
            process.env.NEXT_PUBLIC_SUPABASE_URL
          }/storage/v1/object/public/templates/${archiveFileName}?t=${new Date().toISOString()}`;
          try {
            await cesdkInstance.current?.engine.scene.loadFromArchiveURL(archiveUrl);
            hasLoadedScene = true;
          } catch (archiveError) {
            console.warn(
              "Unable to load PSD scene archive from URL, trying alternative methods.",
              archiveError
            );
          }
        }

        if (!hasLoadedScene && sceneData?.meta?.processedArchiveUrl) {
          const archiveUrl = `${
            process.env.NEXT_PUBLIC_SUPABASE_URL
          }/storage/v1/object/public/templates/${
            sceneData.meta.processedArchiveUrl
          }?t=${new Date().toISOString()}`;

          try {
            await cesdkInstance.current?.engine.scene.loadFromArchiveURL(archiveUrl);
            hasLoadedScene = true;
          } catch (error) {
            console.error("Error loading processed PSD scene archive:", error);
            const message =
              error instanceof Error && error.message
                ? error.message
                : "Failed to load processed PSD scene archive";
            toast(message, { type: "error" });

            if (sceneContent) {
              await cesdkInstance.current?.engine.scene.loadFromString(sceneContent);
              hasLoadedScene = true;
            } else {
              throw new Error("No valid scene data available to load");
            }
          }
        } else if (sceneData?.meta?.archiveUrl) {
          const archiveUrl = `${
            process.env.NEXT_PUBLIC_SUPABASE_URL
          }/storage/v1/object/public/templates/${
            sceneData.meta.archiveUrl
          }?t=${new Date().toISOString()}`;

          try {
            await cesdkInstance.current?.engine.scene.loadFromArchiveURL(archiveUrl);
            hasLoadedScene = true;
          } catch (error) {
            console.error("Error loading PSD scene archive:", error);
            const message =
              error instanceof Error && error.message
                ? error.message
                : "Failed to load PSD scene archive";
            toast(message, { type: "error" });
            if (sceneContent) {
              await cesdkInstance.current?.engine.scene.loadFromString(sceneContent);
              hasLoadedScene = true;
            } else {
              throw new Error("No valid scene data available to load");
            }
          }
        } else {
          if (sceneContent) {
            await cesdkInstance.current?.engine.scene.loadFromString(sceneContent);
            hasLoadedScene = true;
          } else {
            console.error("No scene data available for PSD import");
            const message = "PSD scene data is missing. Please re-import the PSD file.";
            toast(message, { type: "error" });
            throw new Error(message);
          }
        }
      }
    } else if (template?.content) {
      await cesdkInstance.current?.engine.scene.loadFromURL(sceneUrl);
    }

    configData?.forEach(async (element: any) => {
      const restaurantName = element?.restaurantName;
      const cleanId = restaurantName ? createCleanId(restaurantName) : element?.id;

      instance?.engine.asset.addSource(
        getConfigOfImageComponent(element?.eleList, cleanId, restaurantName)
      );
    });
  } catch (error) {}
};
