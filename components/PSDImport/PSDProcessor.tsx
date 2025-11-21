export class PSDProcessor {
  private static instance: PSDProcessor;
  private engine: any = null;

  private constructor() {}

  public static getInstance(): PSDProcessor {
    if (!PSDProcessor.instance) {
      PSDProcessor.instance = new PSDProcessor();
    }
    return PSDProcessor.instance;
  }

  public setEngine(engine: any) {
    this.engine = engine;
  }

  /**
   * Creates a temporary engine instance for processing PSD files
   * This allows processing without requiring the main editor engine
   * Only works in browser environment (client-side only)
   */
  private async createTemporaryEngine(): Promise<any> {
    if (typeof window === "undefined") {
      throw new Error(
        "PSD processing requires a browser environment. This code cannot run on the server."
      );
    }

    const CreativeEngine = (await import("@cesdk/engine")).default;
    const engine = await CreativeEngine.init({
      license: process.env.REACT_APP_LICENSE,
    });
    return engine;
  }

  public async processPSDFile(
    file: File,
    useTemporaryEngine: boolean = false
  ): Promise<{ sceneArchive: Blob; imageBlob: Blob | null; messages: any[] }> {
    if (typeof window === "undefined") {
      throw new Error(
        "PSD processing requires a browser environment. This code cannot run on the server."
      );
    }

    let engineToUse: any = null;
    let shouldCleanupEngine = false;

    try {
      if (useTemporaryEngine || !this.engine) {
        engineToUse = await this.createTemporaryEngine();
        shouldCleanupEngine = true;
      } else {
        engineToUse = this.engine;
      }

      if (!engineToUse.asset || !engineToUse.scene) {
        throw new Error("Creative Engine not fully initialized. Missing asset or scene modules.");
      }

      const fileBuffer = await file.arrayBuffer();

      const { PSDParser, createWebEncodeBufferToPNG, addGoogleFontsAssetLibrary } = await import(
        "@imgly/psd-importer"
      );

      const encodeBufferToPNG = createWebEncodeBufferToPNG();

      try {
        addGoogleFontsAssetLibrary(engineToUse);
      } catch (fontError) {
        console.warn(
          "Google Fonts loading failed or timed out, continuing without them:",
          fontError
        );
      }

      const parser = await PSDParser.fromFile(engineToUse, fileBuffer, encodeBufferToPNG);

      const result = await parser.parse();

      if (result) {
        try {
          const sceneArchive = await engineToUse.scene.saveToArchive();

          return {
            sceneArchive,
            imageBlob: null,
            messages: result.logger?.getMessages() || [],
          };
        } catch (archiveError) {
          console.error("Error creating scene archive:", archiveError);
          throw new Error(
            `Failed to create scene archive: ${
              archiveError instanceof Error ? archiveError.message : "Unknown error"
            }`
          );
        }
      } else {
        throw new Error("Failed to process PSD file - no result returned");
      }
    } catch (error) {
      console.error("PSD processing error:", error);
      throw error;
    } finally {
      if (shouldCleanupEngine && engineToUse) {
        try {
          await engineToUse.dispose();
        } catch (cleanupError) {
          console.warn("Error disposing temporary engine:", cleanupError);
        }
      }
    }
  }

  /**
   * Processes multiple PSD files into separate scene archives
   * Each PSD file becomes its own scene archive (CESDK limitation: can't merge scenes)
   * Returns array of archives for page-switching architecture
   */
  public async processMultiplePSDFiles(
    inputs: Array<{ archive?: Blob; file?: File; fileName: string }>
  ): Promise<{ 
    pageArchives: Array<{ archive: Blob; fileName: string; pageName: string }>; 
    messages: any[];
  }> {
    if (typeof window === "undefined") {
      throw new Error(
        "PSD processing requires a browser environment. This code cannot run on the server."
      );
    }

    if (!inputs || inputs.length === 0) {
      throw new Error("No PSD files provided for processing");
    }

    const allMessages: any[] = [];

    try {
      // Step 1: Process all inputs (either parse PSD files or load scene archives)
      // Save all scenes as archives (which properly embed assets) for later loading
      const pageStrings: Array<{ pageString?: string; fileName: string; archive?: Blob }> = [];

      // Import PSD importer utilities
      const { PSDParser, createWebEncodeBufferToPNG, addGoogleFontsAssetLibrary } = await import(
        "@imgly/psd-importer"
      );
      const encodeBufferToPNG = createWebEncodeBufferToPNG();

      for (let i = 0; i < inputs.length; i++) {
        const { archive, file, fileName } = inputs[i];
        let tempEngine: any = null;

        try {
          tempEngine = await this.createTemporaryEngine();

          // If we have a raw PSD file, parse it using @imgly/psd-importer
          if (file) {
            // Check engine initialization (same as processPSDFile)
            if (!tempEngine.asset || !tempEngine.scene) {
              throw new Error(
                "Creative Engine not fully initialized. Missing asset or scene modules."
              );
            }

            const fileBuffer = await file.arrayBuffer();

            // Add Google Fonts support before parsing (same as single PSD import)
            try {
              addGoogleFontsAssetLibrary(tempEngine);
            } catch (fontError) {
              console.warn(
                "Google Fonts loading failed or timed out, continuing without them:",
                fontError
              );
            }

            const parser = await PSDParser.fromFile(tempEngine, fileBuffer, encodeBufferToPNG);
            const result = await parser.parse();

            if (result && result.logger) {
              const messages = result.logger.getMessages() || [];
              allMessages.push(...messages);
            }

            if (!result) {
              throw new Error(`Failed to parse PSD file: ${fileName}`);
            }

            // Verify scene has pages with content
            const parsedPages = tempEngine.block.findByType("page");
            if (!parsedPages || parsedPages.length === 0) {
              throw new Error(`No pages found after parsing ${fileName}`);
            }
          } else if (archive) {
            // If we have a pre-processed archive, load it directly
            // No need to add Google Fonts here as they should already be in the archive
            if (!tempEngine.asset || !tempEngine.scene || !tempEngine.block) {
              throw new Error("Creative Engine not fully initialized for scene loading.");
            }

            const archiveUrl = URL.createObjectURL(archive);
            await tempEngine.scene.loadFromArchiveURL(archiveUrl);
            URL.revokeObjectURL(archiveUrl);
          } else {
            throw new Error(`No file or archive provided for ${fileName}`);
          }

          // Ensure block module is available before using it
          if (!tempEngine.block) {
            throw new Error("Block module not available after processing.");
          }

          // Save the entire scene as an archive (all pages and assets included)
          const tempPageArchive = await tempEngine.scene.saveToArchive();
          
          pageStrings.push({ 
            fileName,
            archive: tempPageArchive 
          });
          
          console.log(
            `Saved scene from ${fileName} as archive with embedded assets, size: ${tempPageArchive.size} bytes`
          );
        } catch (error) {
          console.error(
            `Error processing ${file ? "PSD file" : "scene archive"} ${fileName}:`,
            error
          );
          // Continue processing other files even if one fails
        } finally {
          if (tempEngine) {
            try {
              await tempEngine.dispose();
            } catch (cleanupError) {
              console.warn("Error disposing temporary engine:", cleanupError);
            }
          }
        }
      }

      if (pageStrings.length === 0) {
        throw new Error("No PSD files were processed successfully");
      }

      // Build final result: array of page archives with metadata
      const pageArchives: Array<{ archive: Blob; fileName: string; pageName: string }> = [];
      
      for (let i = 0; i < pageStrings.length; i++) {
        const { archive, fileName } = pageStrings[i];

        if (!archive) {
          console.warn(`No archive for ${fileName}, skipping`);
          continue;
        }

        const pageName = fileName.replace(".psd", "").replace(/\s*\(\d+\)\s*$/, ""); // Remove " (1)" etc
        pageArchives.push({ 
          archive, 
          fileName, 
          pageName 
        });
        
        console.log(`Processed page "${pageName}" - archive size: ${archive.size} bytes`);
      }
      
      if (pageArchives.length === 0) {
        throw new Error("No archives were processed successfully");
      }

      console.log(`Successfully processed ${pageArchives.length} PSD file(s) into separate page archives`);

      return {
        pageArchives,
        messages: allMessages,
      };
    } catch (error) {
      console.error("Error processing PSD files:", error);
      throw error;
    }
  }
}

export default PSDProcessor;
