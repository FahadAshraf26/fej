import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import { promises as fs } from "fs";
import getConfig from "next/config";

const { serverRuntimeConfig } = getConfig();

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "900mb",
  },
};

interface ProcessedScene {
  fileName: string;
  sceneArchive: string;
  messages: any[];
}

interface FailedFile {
  fileName: string;
  error: string;
}

interface SuccessResponse {
  success: true;
  scenes: ProcessedScene[];
  failedFiles?: FailedFile[];
  partialSuccess?: boolean;
}

interface ErrorResponse {
  success: false;
  error: string;
  scenes?: ProcessedScene[];
  failedFiles?: FailedFile[];
}

type ApiResponse = SuccessResponse | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  let CreativeEngine: any = null;
  let PSDParser: any = null;
  let createPNGJSEncodeBufferToPNG: any = null;
  let PNG: any = null;
  let engine: any = null;

  try {
    console.log("[Server PSD] Starting import of modules...");
    
    const [{ default: CE }, psdImporter, pngjs] = await Promise.all([
      import("@cesdk/node"),
      import("@imgly/psd-importer"),
      import("pngjs"),
    ]);

    console.log("[Server PSD] Modules imported successfully");
    console.log("[Server PSD] CE:", typeof CE);
    console.log("[Server PSD] PSDParser:", typeof psdImporter?.PSDParser);
    console.log("[Server PSD] createPNGJSEncodeBufferToPNG:", typeof psdImporter?.createPNGJSEncodeBufferToPNG);

    CreativeEngine = CE;
    PSDParser = psdImporter.PSDParser;
    createPNGJSEncodeBufferToPNG = psdImporter.createPNGJSEncodeBufferToPNG;
    PNG = pngjs.PNG;

    const form = formidable({
      maxFileSize: 900 * 1024 * 1024,
      maxFiles: 20,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);

    if (!files.psds || (Array.isArray(files.psds) && files.psds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "No PSD files provided",
      });
    }

    const psdFiles = Array.isArray(files.psds) ? files.psds : [files.psds];

    const license = serverRuntimeConfig?.REACT_APP_LICENSE || process.env.REACT_APP_LICENSE;
    console.log("[Server PSD] License available:", !!license);
    
    if (!license) {
      throw new Error("Missing REACT_APP_LICENSE environment variable");
    }

    const processedScenes: ProcessedScene[] = [];
    const failedFiles: FailedFile[] = [];

    for (const psdFile of psdFiles) {
      let fileEngine: any = null;
      
      try {
        console.log(`[Server PSD] Processing file: ${psdFile.originalFilename}`);
        console.log(`[Server PSD] Initializing CreativeEngine...`);
        
        fileEngine = await CreativeEngine.init({ license });
        console.log(`[Server PSD] Engine initialized, creating scene...`);
        
        const scene = fileEngine.scene.create();
        console.log(`[Server PSD] Scene created with handle: ${scene}`);


        const fileBuffer = await fs.readFile(psdFile.filepath);

        const parser = await PSDParser.fromFile(
          fileEngine,
          fileBuffer.buffer,
          createPNGJSEncodeBufferToPNG(PNG)
        );

        const result = await parser.parse();

        if (!result) {
          throw new Error(`Failed to parse PSD file: ${psdFile.originalFilename}`);
        }

        const sceneArchive = await fileEngine.scene.saveToArchive();
        const archiveBuffer = await sceneArchive.arrayBuffer();

        processedScenes.push({
          fileName: psdFile.originalFilename || "unknown.psd",
          sceneArchive: Buffer.from(archiveBuffer).toString("base64"),
          messages: result.logger?.getMessages() || [],
        });

        fileEngine.dispose();
        fileEngine = null;
      } catch (fileError) {
        const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error";
        console.error(`Error processing ${psdFile.originalFilename}:`, errorMessage);
        
        failedFiles.push({
          fileName: psdFile.originalFilename || "unknown.psd",
          error: errorMessage,
        });
        
        if (fileEngine) {
          try {
            fileEngine.dispose();
          } catch (disposeError) {
            console.error("Error disposing file engine:", disposeError);
          }
        }
      }
    }

    if (processedScenes.length === 0) {
      return res.status(500).json({
        success: false,
        error: "All files failed to process",
        failedFiles,
      });
    }

    if (failedFiles.length > 0) {
      return res.status(200).json({
        success: true,
        scenes: processedScenes,
        failedFiles,
        partialSuccess: true,
      });
    }

    return res.status(200).json({
      success: true,
      scenes: processedScenes,
    });
  } catch (error) {
    console.error("[Server PSD] Fatal error:", error);
    console.error("[Server PSD] Error stack:", error instanceof Error ? error.stack : "No stack trace");

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process PSD files",
    });
  }
}
