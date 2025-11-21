import JSZip from 'jszip';

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
   * Helper method to recursively remap URIs in an object
   * Searches for properties that look like URIs and updates them based on the mapping
   */
  private remapUrisInObject(obj: any, uriMapping: Map<string, string>): void {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        // Check if this string is a URI that needs remapping
        if (uriMapping.has(value)) {
          obj[key] = uriMapping.get(value);
          console.log(`Remapped URI in ${key}: ${value} -> ${obj[key]}`);
        }
      } else if (typeof value === 'object') {
        // Recursively process nested objects
        this.remapUrisInObject(value, uriMapping);
      }
    }
  }

  /**
   * Merges multiple CESDK scene archives into a single multi-page scene archive
   * This is done at the archive level (ZIP manipulation) to preserve all buffer assets
   * Archive format: scene.json + resources/ directory with buffers
   */
  private async mergeSceneArchives(
    archives: Array<{ archive: Blob; fileName: string; pageName: string }>
  ): Promise<Blob> {
    console.log(`Merging ${archives.length} scene archives at file level...`);

    // Load all archives using JSZip
    const loadedArchives = await Promise.all(
      archives.map(async ({ archive, fileName, pageName }) => {
        const zip = await JSZip.loadAsync(archive);
        const sceneJsonFile = zip.file('scene.json');
        
        if (!sceneJsonFile) {
          throw new Error(`No scene.json found in archive for ${fileName}`);
        }
        
        const sceneJsonText = await sceneJsonFile.async('string');
        const sceneData = JSON.parse(sceneJsonText);
        
        return {
          zip,
          sceneData,
          fileName,
          pageName
        };
      })
    );

    console.log(`Loaded ${loadedArchives.length} archives, remapping IDs...`);

    // Create the merged scene structure
    const mergedScene: any = {
      version: loadedArchives[0].sceneData.version || '1.0',
      blocks: [],
      metadata: {
        mergedFrom: archives.map(a => a.fileName),
        pageCount: 0
      }
    };

    // Create output ZIP
    const outputZip = new JSZip();
    let idOffset = 0;
    const pageIds: number[] = [];

    // Merge each archive
    for (let archiveIdx = 0; archiveIdx < loadedArchives.length; archiveIdx++) {
      const { zip, sceneData, fileName } = loadedArchives[archiveIdx];
      
      console.log(`Merging archive ${archiveIdx + 1}/${loadedArchives.length}: ${fileName}`);

      // Track resource URI mappings for this archive
      const uriMapping = new Map<string, string>();

      // Copy buffer/resource files from this archive FIRST
      const resourcesFolder = zip.folder('resources');
      if (resourcesFolder) {
        const resourceFiles: Array<{ path: string; file: any }> = [];
        resourcesFolder.forEach((relativePath, file) => {
          if (!file.dir) {
            resourceFiles.push({ path: relativePath, file });
          }
        });
        
        // Copy all resources to output zip with unique naming
        for (const { path, file } of resourceFiles) {
          const data = await file.async('arraybuffer');
          const oldUri = `resources/${path}`;
          const uniquePath = `resources/${archiveIdx}_${path}`;
          outputZip.file(uniquePath, data);
          uriMapping.set(oldUri, uniquePath);
          console.log(`Mapped resource: ${oldUri} -> ${uniquePath}`);
        }
      }

      // Remap all block IDs in this archive to avoid collisions
      const idMapping = new Map<number, number>();
      let oldSceneId: number | null = null;
      
      if (sceneData.blocks && Array.isArray(sceneData.blocks)) {
        // First pass: identify the old scene root (to exclude it)
        for (const block of sceneData.blocks) {
          if (block.type === 'scene' || block.type === '//ly.img.ubq/scene') {
            oldSceneId = block.id;
            console.log(`Found old scene root with ID ${oldSceneId} in ${fileName}`);
            break;
          }
        }
        
        // Second pass: copy all blocks EXCEPT the old scene root
        for (const block of sceneData.blocks) {
          // Skip the old scene block - we'll create a new master scene
          if (block.id === oldSceneId) {
            console.log(`Skipping old scene block ${block.id}`);
            continue;
          }
          
          const oldId = block.id;
          const newId = oldId + idOffset;
          idMapping.set(oldId, newId);
          
          // Remap the block's ID
          block.id = newId;
          
          // Remap parent references
          if (block.parent !== undefined && block.parent !== null) {
            // If parent was the old scene, set to null (will be adopted by master scene)
            if (block.parent === oldSceneId) {
              block.parent = null;
              console.log(`Reset parent of block ${newId} (was scene ${oldSceneId})`);
            } else {
              block.parent = idMapping.get(block.parent) ?? (block.parent + idOffset);
            }
          }
          
          // Remap children references
          if (block.children && Array.isArray(block.children)) {
            block.children = block.children.map((childId: number) => 
              idMapping.get(childId) ?? (childId + idOffset)
            );
          }
          
          // Update resource URIs in block properties (CRITICAL for images!)
          if (block.properties) {
            this.remapUrisInObject(block.properties, uriMapping);
          }
          
          // Track page blocks (will be children of master scene)
          if (block.type === 'page' || block.type === '//ly.img.ubq/page') {
            pageIds.push(newId);
            console.log(`Tracked page block ${newId} from ${fileName}`);
          }
          
          // Add to merged blocks (excluding old scene)
          mergedScene.blocks.push(block);
        }
      }

      // Update ID offset for next archive
      const maxId = Math.max(...Array.from(idMapping.values()), idOffset);
      idOffset = maxId + 1;
    }

    // Create a single master scene block to hold all pages with VerticalStack layout
    const sceneBlockId = idOffset++;
    const sceneBlock = {
      id: sceneBlockId,
      type: '//ly.img.ubq/scene',
      parent: null,
      children: pageIds,
      properties: {
        'scene/layout': 'VerticalStack'
      }
    };
    
    // Update all page blocks to have the master scene as parent
    for (const block of mergedScene.blocks) {
      if (pageIds.includes(block.id)) {
        block.parent = sceneBlockId;
        console.log(`Set parent of page ${block.id} to master scene ${sceneBlockId}`);
      }
    }
    
    mergedScene.blocks.push(sceneBlock);
    mergedScene.metadata.pageCount = pageIds.length;
    
    console.log(`Merged scene: ${mergedScene.blocks.length} blocks, ${pageIds.length} pages`);

    // Save merged scene.json to output ZIP
    outputZip.file('scene.json', JSON.stringify(mergedScene, null, 2));

    // Generate the final archive blob
    const mergedArchive = await outputZip.generateAsync({ type: 'blob' });
    console.log(`Generated merged archive: ${mergedArchive.size} bytes`);

    return mergedArchive;
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

      // Step 2: Merge all PSD archives at the file level (preserves all assets including images)
      console.log("Merging archives at file level to preserve buffer assets...");
      const sceneArchive = await this.mergeSceneArchives(parsedArchives);
      
      // Build metadata for each page
      const pageMetadata: Array<{ fileName: string; pageName: string; pageIndex: number }> = [];
      
      for (let i = 0; i < parsedArchives.length; i++) {
        const { fileName, pageName } = parsedArchives[i];
        pageMetadata.push({
          fileName,
          pageName,
          pageIndex: i,
        });
      }

      console.log(`Generated metadata for ${pageMetadata.length} page(s)`);

      return {
        sceneArchive,
        pageMetadata,
        messages: allMessages,
      };
    } catch (error) {
      console.error("Error processing multiple PSD files:", error);
      throw error;
    }
  }
}

export default PSDProcessor;
