export function handleImageSize(event: any, instance: any) {
  try {
    if (event.type === "Created") {
      const engine = instance.engine;
      const type = engine.block.getType(event.block);
      const name = engine.block.getName(event.block);
      if (
        type === "//ly.img.ubq/graphic" &&
        name != "inlineImage" &&
        name != "sectionBorder" &&
        name != "dishBorder"
      ) {
        const blockId = event.block;

        try {
          // Always force initial set (even if property isn't fully ready)
          engine.block.setEnum(blockId, "contentFill/mode", "Contain");
          console.log("✅ Forced initial contentFill/mode = Contain for block:", blockId);
        } catch (err: any) {
          console.warn(
            "Initial contentFill/mode setEnum failed (may not be ready yet):",
            err.message
          );
        }

        // Listen for state changes as backup
        const unsubscribeBlockState = engine.block.onStateChanged(
          [blockId],
          (changedIds: string[]) => {
            if (!changedIds.includes(blockId)) return;

            const state = engine.block.getState(blockId);
            if (state.type === "Ready") {
              try {
                engine.block.setEnum(blockId, "contentFill/mode", "Contain");
                console.log("✅ Set contentFill/mode to Contain after Ready (confirm step).");
              } catch (err) {
                console.error("❌ Failed to set contentFill/mode after Ready:", err);
              }

              unsubscribeBlockState();
            } else if (state.type === "Error") {
              console.error("❌ Image failed to load, skipping fill mode change.");
              unsubscribeBlockState();
            }
          }
        );
      }
    }
  } catch (e: any) {
    console.error("handleImageSize error:", e.message);
  }
}
