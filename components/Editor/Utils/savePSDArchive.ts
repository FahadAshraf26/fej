import { uploadFile } from "@Helpers/UploadFile";
import { supabase } from "@database/client.connection";
import { getArchiveFileName, getSceneStorageKey } from "./sceneStorage";

export const savePSDArchive = async (
  engine: any,
  template: any,
  sceneData?: any,
  sceneStorageKey?: string
): Promise<{ archiveFileName: string | null; error: Error | null }> => {
  try {
    if (!engine) {
      throw new Error("Engine not available");
    }

    const storageKey =
      sceneStorageKey || getSceneStorageKey(template?.content, template?.isPSDImport);
    if (!storageKey) {
      throw new Error("Missing scene storage key");
    }

    const archiveBlob = await engine.scene.saveToArchive();

    const archiveFileName =
      sceneData?.meta?.processedArchiveFileName || getArchiveFileName(storageKey);

    if (!archiveFileName) {
      throw new Error("Unable to derive archive filename for PSD template.");
    }

    if (!archiveBlob) {
      throw new Error("Failed to generate archive blob from engine.");
    }

    const archiveFile = new File([archiveBlob], archiveFileName, {
      type: archiveBlob.type || "application/zip",
    });

    await uploadFile("templates", archiveFileName, archiveFile);

    if (sceneData?.meta?.needsFirstSave) {
      const updatedSceneData = {
        ...sceneData,
        meta: {
          ...sceneData.meta,
          processedArchiveUrl: archiveFileName,
          needsFirstSave: false,
        },
      };

      const { error: updateError } = await supabase.storage
        .from("templates")
        .upload(storageKey, JSON.stringify(updatedSceneData), {
          contentType: "application/json",
          upsert: true,
        });

      if (updateError) {
        console.error("Error updating scene JSON after archive upload:", updateError);
      }
    }

    return { archiveFileName, error: null };
  } catch (error) {
    console.error("Error saving PSD archive:", error);
    return {
      archiveFileName: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};
