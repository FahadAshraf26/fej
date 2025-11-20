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
      // Save all pages as strings (with embedded assets) for later loading
      const pageStrings: Array<{ pageString: string; fileName: string }> = [];

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

          const pages = tempEngine.block.findByType("page");

          if (pages && pages.length > 0) {
            for (const sourcePageId of pages) {
              try {
                const pageType = tempEngine.block.getType(sourcePageId);
                const pageBlockType = "//ly.img.ubq/page";

                if (pageType !== pageBlockType) {
                  console.warn(
                    `Block ${sourcePageId} is not a page block (type: ${pageType}), skipping`
                  );
                  continue;
                }

                // Save the entire page block as a string (with embedded assets)
                const pageString = await tempEngine.block.saveToString([sourcePageId]);
                pageStrings.push({ pageString, fileName });
                console.log(
                  `Saved page from ${fileName} as string, length: ${pageString.length} characters`
                );
              } catch (pageError) {
                console.error(`Error saving page from ${fileName}:`, pageError);
              }
            }
          } else {
            pageNames.push(fileName.replace(".psd", "") || `Page ${i + 1}`);
          }
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

      // Step 3: Load all pages into the new scene and append them
      for (let i = 0; i < pageStrings.length; i++) {
        const { pageString, fileName } = pageStrings[i];

        try {
          // Load the page block directly from string into the merged scene
          const loadedPageBlocks = await mergedEngine.block.loadFromString(pageString);

          if (!loadedPageBlocks || loadedPageBlocks.length === 0) {
            throw new Error(`Failed to load page block from ${fileName}`);
          }

          const loadedPageId = loadedPageBlocks[0];

          console.log(`Loaded page block ${loadedPageId} from ${fileName}`);

          // Verify it's actually a page
          const loadedPageType = mergedEngine.block.getType(loadedPageId);
          const pageBlockType = "//ly.img.ubq/page";
          if (loadedPageType !== pageBlockType) {
            console.warn(
              `Loaded block type mismatch: ${loadedPageType}, expected ${pageBlockType}`
            );
            continue;
          }

          // Append the page to the scene root
          mergedEngine.block.appendChild(sceneRoot, loadedPageId);

          // Set page name
          const pageName = fileName.replace(".psd", "") || `Page ${i + 1}`;
          try {
            mergedEngine.block.setName(loadedPageId, pageName);
          } catch (nameError) {
            console.debug(`Could not set page name for ${pageName}:`, nameError);
          }
          pageNames.push(pageName);

          // Log progress
          const pagesAfterAdd = mergedEngine.block.findByType("page");
          console.log(`Pages after adding page ${i + 1}: ${pagesAfterAdd?.length || 0}`);
        } catch (loadError) {
          console.error(`Error loading page from ${fileName}:`, loadError);
          pageNames.push(fileName.replace(".psd", "") || `Page ${i + 1}`);
        }
      }

      // Wait a moment for the scene to fully process all loaded pages
      await new Promise((resolve) => setTimeout(resolve, 100));

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

      const mergedArchive = await mergedEngine.scene.saveToArchive();

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
