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
   * Uses CESDK's native multi-page support - each PSD becomes a page in ONE scene
   * Pages are automatically arranged vertically by CESDK
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
    let masterEngine: any = null;

    try {
      // Import PSD importer utilities
      const { PSDParser, createWebEncodeBufferToPNG, addGoogleFontsAssetLibrary } = await import(
        "@imgly/psd-importer"
      );
      const encodeBufferToPNG = createWebEncodeBufferToPNG();

      // Step 1: Parse each PSD into its own temporary scene and save as archive
      const parsedArchives: Array<{ archive: Blob; fileName: string; pageName: string }> = [];

      for (let i = 0; i < inputs.length; i++) {
        const { file, fileName } = inputs[i];

        if (!file) {
          console.warn(`Skipping ${fileName} - no file provided`);
          continue;
        }

        let tempEngine: any = null;

        try {
          console.log(`Parsing PSD ${i + 1}/${inputs.length}: ${fileName}`);

          // Create temporary engine for this PSD
          tempEngine = await this.createTemporaryEngine();

          if (!tempEngine.asset || !tempEngine.scene || !tempEngine.block) {
            throw new Error("Creative Engine not fully initialized");
          }

          // Add Google Fonts support
          try {
            addGoogleFontsAssetLibrary(tempEngine);
          } catch (fontError) {
            console.warn("Google Fonts loading failed, continuing without them:", fontError);
          }

          const fileBuffer = await file.arrayBuffer();

          // Parse PSD into this temporary scene
          const parser = await PSDParser.fromFile(tempEngine, fileBuffer, encodeBufferToPNG);
          const result = await parser.parse();

          if (result && result.logger) {
            const messages = result.logger.getMessages() || [];
            allMessages.push(...messages);
          }

          if (!result) {
            throw new Error(`Failed to parse PSD file: ${fileName}`);
          }

          // Save this PSD's scene as an archive (preserves all assets)
          const archive = await tempEngine.scene.saveToArchive();
          const pageName = fileName.replace(".psd", "").replace(/\s*\(\d+\)\s*$/, "");

          parsedArchives.push({ archive, fileName, pageName });
          console.log(`Parsed and saved "${pageName}" as archive`);
        } catch (error) {
          console.error(`Error parsing PSD file ${fileName}:`, error);
          throw error;
        } finally {
          if (tempEngine) {
            try {
              await tempEngine.dispose();
            } catch (cleanupError) {
              console.warn("Error disposing temp engine:", cleanupError);
            }
          }
        }
      }

      if (parsedArchives.length === 0) {
        throw new Error("No PSD files were parsed successfully");
      }

      // Step 2: Create a master scene and load all archives into SAME engine
      masterEngine = await this.createTemporaryEngine();

      if (!masterEngine.asset || !masterEngine.scene || !masterEngine.block) {
        throw new Error("Master engine not fully initialized");
      }

      // Create master scene with vertical layout
      const masterScene = masterEngine.scene.create();
      masterEngine.block.setEnum(masterScene, "scene/layout", "VerticalStack");
      console.log("Created master multi-page scene with VerticalStack layout");

      // Map to track which PSD each page came from
      const pageSourceMap = new Map<number, { fileName: string; psdName: string; pageIndexInPSD: number }>();
      let totalPagesAdded = 0;

      // Load each PSD archive into master engine and duplicate pages (preserves buffers!)
      for (let i = 0; i < parsedArchives.length; i++) {
        const { archive, fileName, pageName } = parsedArchives[i];

        try {
          console.log(`Adding pages from PSD ${i + 1}/${parsedArchives.length}: ${pageName}`);

          // Load archive into engine (creates a new scene, replacing current active scene)
          const archiveUrl = URL.createObjectURL(archive);
          await masterEngine.scene.loadFromArchiveURL(archiveUrl);
          URL.revokeObjectURL(archiveUrl);

          // Get the temp scene that was just loaded
          const tempSceneId = masterEngine.scene.get();
          const pagesInArchive = masterEngine.block.findByType("page");
          console.log(`Found ${pagesInArchive.length} page(s) in ${fileName}`);

          // Duplicate each page WITHIN THE SAME ENGINE (preserves buffer assets!)
          const duplicatedPageIds: number[] = [];
          for (let pageIdx = 0; pageIdx < pagesInArchive.length; pageIdx++) {
            const pageId = pagesInArchive[pageIdx];
            
            // Duplicate within same engine - buffers are preserved!
            const clonedPageId = masterEngine.block.duplicate(pageId);
            duplicatedPageIds.push(clonedPageId);

            // Track which PSD this page came from
            pageSourceMap.set(totalPagesAdded, {
              fileName,
              psdName: pageName,
              pageIndexInPSD: pageIdx,
            });

            totalPagesAdded++;
            console.log(`Duplicated page ${totalPagesAdded} from ${fileName} (page ${pageIdx + 1}/${pagesInArchive.length})`);
          }

          // Switch back to master scene
          masterEngine.scene.load(masterScene);
          console.log(`Switched to master scene ${masterScene}`);

          // Append all duplicated pages to master scene (auto-reparents them!)
          for (const dupPageId of duplicatedPageIds) {
            masterEngine.block.appendChild(masterScene, dupPageId);
            console.log(`Appended duplicated page ${dupPageId} to master scene`);
          }

          // Destroy the temporary scene
          try {
            if (tempSceneId !== masterScene) {
              masterEngine.scene.destroy(tempSceneId);
              console.log(`Destroyed temp scene ${tempSceneId}`);
            }
          } catch (destroyError) {
            console.warn("Could not destroy temp scene:", destroyError);
          }
        } catch (error) {
          console.error(`Error adding pages from ${fileName}:`, error);
          throw error;
        }
      }

      // Get final page list from master scene
      const finalPages = masterEngine.block.findByType("page");
      console.log(`Master scene contains ${finalPages.length} page(s) total`);

      // Build accurate metadata from actual pages in the master scene
      const pageMetadata: Array<{ fileName: string; pageName: string; pageIndex: number }> = [];
      
      for (let i = 0; i < finalPages.length; i++) {
        const pageSource = pageSourceMap.get(i);
        if (pageSource) {
          const pageDisplayName = finalPages.length > parsedArchives.length
            ? `${pageSource.psdName} - Page ${pageSource.pageIndexInPSD + 1}` // Multi-page PSD
            : pageSource.psdName; // Single page per PSD

          pageMetadata.push({
            fileName: pageSource.fileName,
            pageName: pageDisplayName,
            pageIndex: i,
          });
        } else {
          // Fallback if source mapping failed
          pageMetadata.push({
            fileName: `unknown-${i}`,
            pageName: `Page ${i + 1}`,
            pageIndex: i,
          });
        }
      }

      console.log(`Generated metadata for ${pageMetadata.length} page(s)`);

      // Save the master multi-page scene
      const sceneArchive = await masterEngine.scene.saveToArchive();
      console.log(`Saved master scene: ${sceneArchive.size} bytes with ${pageMetadata.length} PSDs`);

      return {
        sceneArchive,
        pageMetadata,
        messages: allMessages,
      };
    } catch (error) {
      console.error("Error processing multiple PSD files:", error);
      throw error;
    } finally {
      if (masterEngine) {
        try {
          await masterEngine.dispose();
        } catch (cleanupError) {
          console.warn("Error disposing master engine:", cleanupError);
        }
      }
    }
  }
}

export default PSDProcessor;
