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

      // Step 2: Create a master scene and manually add pages from each PSD
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

      // Load each PSD archive and clone its pages into the master scene
      for (let i = 0; i < parsedArchives.length; i++) {
        const { archive, fileName, pageName } = parsedArchives[i];
        let tempLoadEngine: any = null;

        try {
          console.log(`Adding pages from PSD ${i + 1}/${parsedArchives.length}: ${pageName}`);

          // Create a temporary engine to load this archive
          tempLoadEngine = await this.createTemporaryEngine();

          // Load the archive into the temporary engine
          const archiveUrl = URL.createObjectURL(archive);
          await tempLoadEngine.scene.loadFromArchiveURL(archiveUrl);
          URL.revokeObjectURL(archiveUrl);

          // Get all pages from this loaded archive
          const pagesInArchive = tempLoadEngine.block.findByType("page");
          console.log(`Found ${pagesInArchive.length} page(s) in ${fileName}`);

          // Clone each page and append to the master scene
          for (let pageIdx = 0; pageIdx < pagesInArchive.length; pageIdx++) {
            const pageId = pagesInArchive[pageIdx];
            
            // Duplicate the page (creates a deep copy with all children)
            const clonedPageId = tempLoadEngine.block.duplicate(pageId);

            // CRITICAL: Transfer buffer assets before serialization
            // Get all blocks in the cloned page to find images
            const allBlocksInPage = tempLoadEngine.block.findAll();
            const bufferMapping = new Map<string, string>();

            for (const blockId of allBlocksInPage) {
              // Check if this block has a fill (image blocks have fills)
              if (tempLoadEngine.block.hasFill(blockId)) {
                const fillId = tempLoadEngine.block.getFill(blockId);
                
                // Check if this fill actually has an image property (not all fills are image fills)
                const fillType = tempLoadEngine.block.getType(fillId);
                const hasImageProperty = tempLoadEngine.block.hasProperty(fillId, 'fill/image/imageFileURI');
                
                if (hasImageProperty) {
                  try {
                    // Get the image URI from the fill
                    const imageUri = tempLoadEngine.block.getString(fillId, 'fill/image/imageFileURI');
                    
                    // If it's a buffer:// URI, we need to copy the buffer data
                    if (imageUri && imageUri.startsWith('buffer://')) {
                      // Check if we already copied this buffer
                      if (!bufferMapping.has(imageUri)) {
                        try {
                          // Get the buffer length and data from temp engine
                          const bufferLength = tempLoadEngine.editor.getBufferLength(imageUri);
                          const bufferData = tempLoadEngine.editor.getBufferData(imageUri, 0, bufferLength);
                          
                          // Create a new buffer in the master engine
                          const newBufferUri = masterEngine.editor.createBuffer();
                          
                          // Copy the data to the new buffer
                          masterEngine.editor.setBufferData(newBufferUri, 0, bufferData);
                          
                          // Store the mapping
                          bufferMapping.set(imageUri, newBufferUri);
                          console.log(`Copied buffer asset: ${imageUri} -> ${newBufferUri} (${bufferLength} bytes)`);
                        } catch (bufferError) {
                          console.warn(`Failed to copy buffer ${imageUri}:`, bufferError);
                        }
                      }
                    }
                  } catch (imageError) {
                    // Skip blocks that don't have image fills (e.g., color fills, gradient fills)
                    continue;
                  }
                }
              }
            }

            // Serialize the cloned page as a string (correct CESDK API)
            const pageString = await tempLoadEngine.block.saveToString([clonedPageId]);

            // Import the page into the master engine (correct CESDK API)
            const importedBlockIds = await masterEngine.block.loadFromString(pageString);
            const importedPageId = importedBlockIds[0]; // First block is the page

            // Now update all buffer:// URIs in the imported page to use the new buffers
            const importedBlocks = masterEngine.block.findAll();
            for (const blockId of importedBlocks) {
              if (masterEngine.block.hasFill(blockId)) {
                const fillId = masterEngine.block.getFill(blockId);
                const imageUri = masterEngine.block.getString(fillId, 'fill/image/imageFileURI');
                
                // Replace old buffer URI with new one from our mapping
                if (imageUri && bufferMapping.has(imageUri)) {
                  const newBufferUri = bufferMapping.get(imageUri);
                  masterEngine.block.setString(fillId, 'fill/image/imageFileURI', newBufferUri);
                  console.log(`Updated image URI: ${imageUri} -> ${newBufferUri}`);
                }
              }
            }

            // Append the imported page to the master scene
            masterEngine.block.appendChild(masterScene, importedPageId);

            // Track which PSD this page came from
            pageSourceMap.set(totalPagesAdded, {
              fileName,
              psdName: pageName,
              pageIndexInPSD: pageIdx,
            });

            totalPagesAdded++;
            console.log(`Added page ${totalPagesAdded} from ${fileName} (page ${pageIdx + 1}/${pagesInArchive.length})`);
          }
        } catch (error) {
          console.error(`Error adding pages from ${fileName}:`, error);
          throw error;
        } finally {
          if (tempLoadEngine) {
            try {
              await tempLoadEngine.dispose();
            } catch (cleanupError) {
              console.warn("Error disposing temp load engine:", cleanupError);
            }
          }
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
