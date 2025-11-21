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

      // SIMPLIFIED: Only process first PSD for now
      console.log(`Processing FIRST PSD only (simplified test): ${inputs[0].fileName}`);
      const firstInput = inputs[0];
      if (!firstInput.file) {
        throw new Error("First file is missing");
      }

      const fileBuffer = await firstInput.file.arrayBuffer();
      const parser = await PSDParser.fromFile(engine, fileBuffer, encodeBufferToPNG);
      const result = await parser.parse();

      if (result && result.logger) {
        allMessages.push(...(result.logger.getMessages() || []));
      }

      if (!result) {
        throw new Error(`Failed to parse PSD: ${firstInput.fileName}`);
      }

      const scene = engine.scene.get();
      engine.block.setEnum(scene, "scene/layout", "VerticalStack");
      console.log(`Parsed first PSD with VerticalStack layout`);

      // Track pages
      const pageSourceMap = new Map<number, { fileName: string; psdName: string; pageIndexInPSD: number }>();
      const pages = engine.block.findByType("page");
      const pageName = firstInput.fileName.replace(".psd", "").replace(/\s*\(\d+\)\s*$/, "");
      
      for (let i = 0; i < pages.length; i++) {
        pageSourceMap.set(i, {
          fileName: firstInput.fileName,
          psdName: pageName,
          pageIndexInPSD: i,
        });
      }

      console.log(`Scene has ${pages.length} page(s) from ${firstInput.fileName}`);
      console.log(`NOTE: Only processing first PSD - this is a simplified test to verify images work`)

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
