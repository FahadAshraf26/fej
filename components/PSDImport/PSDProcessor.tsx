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
   * Merges multiple PSD files or scene archives into a single scene with multiple pages
   * Each PSD file becomes a page in the merged scene
   * Can accept either raw PSD Files or pre-processed scene archives
   */
  public async mergeMultiplePSDScenes(
    inputs: Array<{ archive?: Blob; file?: File; fileName: string }>
  ): Promise<{ sceneArchive: Blob; messages: any[]; pageNames: string[] }> {
    if (typeof window === "undefined") {
      throw new Error(
        "PSD processing requires a browser environment. This code cannot run on the server."
      );
    }

    if (!inputs || inputs.length === 0) {
      throw new Error("No PSD files or scene archives provided for merging");
    }

    let mergedEngine: any = null;
    const allMessages: any[] = [];
    const pageNames: string[] = [];

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
          pageNames.push(fileName.replace(".psd", "") || `Page ${i + 1}`);
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
        throw new Error("No pages were found in any of the scene archives");
      }

      // Step 2: Create a new empty scene
      mergedEngine = await this.createTemporaryEngine();

      if (!mergedEngine.asset || !mergedEngine.scene || !mergedEngine.block) {
        throw new Error("Creative Engine not fully initialized. Missing required modules.");
      }

      await mergedEngine.scene.create();
      const sceneId = mergedEngine.scene.get();
      const sceneRoot = sceneId === 0 ? 0 : sceneId;

      console.log(`Created new empty scene with root ${sceneRoot}`);

      // Step 3: Load each archive, extract pages as complete scene archives
      // Since CESDK can't merge scenes directly, we save each page as its own archive
      const pageArchives: Array<{ archive: Blob; fileName: string }> = [];
      
      for (let i = 0; i < pageStrings.length; i++) {
        const { archive, fileName } = pageStrings[i];

        if (!archive) {
          console.error(`No archive for ${fileName}, skipping`);
          continue;
        }

        try {
          // For single-page PSDs, just use the archive as-is
          // For multi-page PSDs, we already have the full scene archive
          pageArchives.push({ archive, fileName });
          console.log(`Added archive for ${fileName}, size: ${archive.size} bytes`);
        } catch (error) {
          console.error(`Error processing archive for ${fileName}:`, error);
        }
      }
      
      if (pageArchives.length === 0) {
        throw new Error("No archives were processed successfully");
      }
      
      // If there's only one file, just use its archive directly
      if (pageArchives.length === 1) {
        console.log("Single PSD file - using archive directly");
        const singleArchive = pageArchives[0].archive;
        pageNames.push(pageArchives[0].fileName.replace(".psd", ""));
        
        return {
          sceneArchive: singleArchive,
          messages: allMessages,
          pageNames,
        };
      }
      
      // For multiple files, load each archive and rebuild a merged scene
      // Step 4: Load first archive as the base
      const firstArchiveUrl = URL.createObjectURL(pageArchives[0].archive);
      await mergedEngine.scene.loadFromArchiveURL(firstArchiveUrl);
      URL.revokeObjectURL(firstArchiveUrl);
      
      const firstPages = mergedEngine.scene.getPages();
      for (const pageId of firstPages) {
        const pageName = pageArchives[0].fileName.replace(".psd", "");
        mergedEngine.block.setName(pageId, pageName);
        pageNames.push(pageName);
      }
      
      console.log(`Loaded first archive (${pageArchives[0].fileName}) with ${firstPages.length} pages`);
      
      // Step 5: For each additional archive, load it and transfer pages
      for (let i = 1; i < pageArchives.length; i++) {
        const { archive, fileName } = pageArchives[i];
        
        try {
          // Create a temporary engine to load this archive
          const tempEngine = await this.createTemporaryEngine();
          
          const archiveUrl = URL.createObjectURL(archive);
          await tempEngine.scene.loadFromArchiveURL(archiveUrl);
          URL.revokeObjectURL(archiveUrl);
          
          const tempPages = tempEngine.scene.getPages();
          console.log(`Loaded ${fileName} into temp engine, has ${tempPages.length} pages`);
          
          // For each page, export it and import into merged scene
          for (const tempPageId of tempPages) {
            // Export the page as PNG to get rendered content
            const pageArchiveBlob = await tempEngine.scene.saveToArchive();
            
            // Load into a second temp engine to extract just this page
            const extractEngine = await this.createTemporaryEngine();
            const extractUrl = URL.createObjectURL(pageArchiveBlob);
            await extractEngine.scene.loadFromArchiveURL(extractUrl);
            URL.revokeObjectURL(extractUrl);
            
            const extractedPages = extractEngine.scene.getPages();
            if (extractedPages.length > 0) {
              const sourcePage = extractedPages[0];
              
              // Create new page in merged scene
              const newPage = mergedEngine.block.create("page");
              mergedEngine.block.setWidth(newPage, extractEngine.block.getWidth(sourcePage));
              mergedEngine.block.setHeight(newPage, extractEngine.block.getHeight(sourcePage));
              
              // Copy all children
              const children = extractEngine.block.getChildren(sourcePage);
              for (const childId of children) {
                const childArchive = await extractEngine.block.saveToString([childId]);
                const loadedChildren = await mergedEngine.block.loadFromString(childArchive);
                if (loadedChildren && loadedChildren.length > 0) {
                  mergedEngine.block.appendChild(newPage, loadedChildren[0]);
                }
              }
              
              // Add page to merged scene
              const sceneRoot = mergedEngine.scene.get();
              mergedEngine.block.appendChild(sceneRoot, newPage);
              
              const pageName = fileName.replace(".psd", "");
              mergedEngine.block.setName(newPage, pageName);
              pageNames.push(pageName);
            }
            
            await extractEngine.dispose();
          }
          
          await tempEngine.dispose();
          console.log(`Merged pages from ${fileName}`);
        } catch (error) {
          console.error(`Error merging ${fileName}:`, error);
          pageNames.push(fileName.replace(".psd", "") || `Page ${i + 1}`);
        }
      }

      // Get page IDs from the scene API (this is the correct way)
      const finalPages = mergedEngine.scene.getPages();
      console.log(`Final page count from scene API: ${finalPages?.length || 0}`);

      if (!finalPages || finalPages.length === 0) {
        throw new Error("No pages were created in the merged scene");
      }

      // Step 4: Position pages vertically to prevent overlapping
      let currentY = 0;
      const pageGap = 50; // Gap between pages in pixels

      for (let i = 0; i < finalPages.length; i++) {
        const pageId = finalPages[i];
        try {
          // Verify page exists and has content
          const pageType = mergedEngine.block.getType(pageId);
          if (pageType !== "//ly.img.ubq/page") {
            console.warn(`Page ${pageId} is not a valid page type: ${pageType}`);
            continue;
          }

          // Get page dimensions
          const pageHeight = mergedEngine.block.getHeight(pageId);
          const pageWidth = mergedEngine.block.getWidth(pageId);
          const pageChildren = mergedEngine.block.getChildren(pageId);

          console.log(
            `Page ${pageId} - Height: ${pageHeight}, Width: ${pageWidth}, Children: ${
              pageChildren?.length || 0
            }`
          );

          // Position page at current Y position
          mergedEngine.block.setPositionY(pageId, currentY);
          mergedEngine.block.setPositionX(pageId, 0);

          console.log(`Positioned page ${pageId} at Y: ${currentY}`);

          // Move to next position (page height + gap)
          currentY += pageHeight + pageGap;
        } catch (positionError) {
          console.error(`Error positioning page ${pageId}:`, positionError);
        }
      }

      // Verify page structure
      const finalPageDetails = finalPages.map((pid: any) => {
        try {
          return {
            id: pid,
            type: mergedEngine.block.getType(pid),
            name: mergedEngine.block.getName(pid),
            parent: mergedEngine.block.getParent(pid),
            width: mergedEngine.block.getWidth(pid),
            height: mergedEngine.block.getHeight(pid),
            x: mergedEngine.block.getPositionX(pid),
            y: mergedEngine.block.getPositionY(pid),
            childrenCount: mergedEngine.block.getChildren(pid)?.length || 0,
          };
        } catch (e) {
          return { id: pid, error: String(e) };
        }
      });
      console.log("Final page structure with positions:", finalPageDetails);

      console.log("Saving merged scene archive with embedded assets...");
      const mergedArchive = await mergedEngine.scene.saveToArchive();
      console.log(`Merged archive size: ${mergedArchive.size} bytes`);

      if (mergedArchive.size < 1000) {
        console.warn("Archive size is suspiciously small - assets may not be embedded");
      }

      return {
        sceneArchive: mergedArchive,
        messages: allMessages,
        pageNames,
      };
    } catch (error) {
      console.error("Error merging PSD scenes:", error);
      throw error;
    } finally {
      if (mergedEngine) {
        try {
          await mergedEngine.dispose();
        } catch (cleanupError) {
          console.warn("Error disposing merged engine:", cleanupError);
        }
      }
    }
  }
}

export default PSDProcessor;
