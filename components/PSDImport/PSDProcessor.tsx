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
   * Processes multiple PSD files into a SINGLE multi-page scene
   * Simplified approach: Only process first PSD for now to verify images work
   */
  public async processMultiplePSDFiles(
    inputs: Array<{ archive?: Blob; file?: File; fileName: string }>
  ): Promise<{ 
    sceneArchive: Blob;
    pageMetadata: Array<{ fileName: string; pageName: string; pageIndex: number }>; 
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
    let engine: any = null;

    try {
      // Import PSD importer utilities
      const { PSDParser, createWebEncodeBufferToPNG, addGoogleFontsAssetLibrary } = await import(
        "@imgly/psd-importer"
      );
      const encodeBufferToPNG = createWebEncodeBufferToPNG();

      // Create engine
      engine = await this.createTemporaryEngine();

      if (!engine.asset || !engine.scene || !engine.block) {
        throw new Error("Creative Engine not fully initialized");
      }

      // Add Google Fonts support
      try {
        addGoogleFontsAssetLibrary(engine);
      } catch (fontError) {
        console.warn("Google Fonts loading failed, continuing without them:", fontError);
      }

      // Track all duplicated pages and metadata
      const allDuplicatedPages: number[] = [];
      const pageSourceMap = new Map<number, { fileName: string; psdName: string; pageIndexInPSD: number }>();
      let currentPageIndex = 0;

      // Parse each PSD and duplicate its pages to preserve them
      for (let i = 0; i < inputs.length; i++) {
        const { file, fileName } = inputs[i];

        if (!file) {
          console.warn(`Skipping ${fileName} - no file provided`);
          continue;
        }

        try {
          console.log(`Parsing PSD ${i + 1}/${inputs.length}: ${fileName}`);

          const fileBuffer = await file.arrayBuffer();
          const parser = await PSDParser.fromFile(engine, fileBuffer, encodeBufferToPNG);
          const result = await parser.parse();

          if (result && result.logger) {
            allMessages.push(...(result.logger.getMessages() || []));
          }

          if (!result) {
            throw new Error(`Failed to parse PSD: ${fileName}`);
          }

          const sceneId = engine.scene.get();
          console.log(`PSD created scene ${sceneId}`);

          // Get pages and duplicate them immediately (preserves them as orphans)
          const pages = engine.block.findByType("page");
          console.log(`Found ${pages.length} page(s), duplicating to preserve them`);

          for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
            const pageId = pages[pageIdx];
            const duplicatedPageId = engine.block.duplicate(pageId);
            allDuplicatedPages.push(duplicatedPageId);

            const pageName = fileName.replace(".psd", "").replace(/\s*\(\d+\)\s*$/, "");
            pageSourceMap.set(currentPageIndex++, {
              fileName,
              psdName: pageName,
              pageIndexInPSD: pageIdx,
            });

            console.log(`Duplicated page ${pageIdx + 1}/${pages.length} from ${fileName} (ID: ${duplicatedPageId})`);
          }
        } catch (error) {
          console.error(`Error processing ${fileName}:`, error);
          throw error;
        }
      }

      console.log(`All ${inputs.length} PSDs parsed, ${allDuplicatedPages.length} pages duplicated`);

      // Create final master scene and add all duplicated pages
      const masterSceneId = engine.scene.create();
      engine.block.setEnum(masterSceneId, "scene/layout", "VerticalStack");
      console.log(`Created master scene ${masterSceneId} with VerticalStack layout`);

      // Add all duplicated pages to master scene
      for (const pageId of allDuplicatedPages) {
        engine.block.appendChild(masterSceneId, pageId);
      }

      console.log(`Added all ${allDuplicatedPages.length} pages to master scene`)

      // Build metadata
      const pageMetadata: Array<{ fileName: string; pageName: string; pageIndex: number }> = [];
      const finalPages = engine.block.findByType("page");
      
      for (let i = 0; i < finalPages.length; i++) {
        const pageSource = pageSourceMap.get(i);
        if (pageSource) {
          pageMetadata.push({
            fileName: pageSource.fileName,
            pageName: pageSource.psdName,
            pageIndex: i,
          });
        }
      }

      // Save scene
      const sceneArchive = await engine.scene.saveToArchive();
      console.log(`Saved scene: ${sceneArchive.size} bytes with ${pageMetadata.length} page(s)`);

      return {
        sceneArchive,
        pageMetadata,
        messages: allMessages,
      };
    } catch (error) {
      console.error("Error processing PSD files:", error);
      throw error;
    } finally {
      if (engine) {
        try {
          await engine.dispose();
        } catch (cleanupError) {
          console.warn("Error disposing engine:", cleanupError);
        }
      }
    }
  }
}

export default PSDProcessor;
