import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

const INSPECTOR_PANEL = '//ly.img.panel/inspector';

export function enforceSinglePanelOpen(openedPanel: string, ui: any) {
  const builtInPanels = ui.findAllPanels({ open: true });

  const closeBuiltInPanels = () => {
    builtInPanels.forEach((panelId: string) => {
      ui.closePanel(panelId);
    });
  };

  const closeCustomSidebars = () => {
    const store = useInitializeEditor.getState();
    if (store.isContentOpen) store.setIsContentOpen();
    if (store.isLayoutOpen) store.setIsLayoutOpen();
    if (store.isStyleOpen) store.setIsStyleOpen();
  };

  const isInspectorOpen = builtInPanels.includes(INSPECTOR_PANEL);
  const otherBuiltIns = builtInPanels.filter((id: string) => id !== INSPECTOR_PANEL);

  if (openedPanel === 'custom') {
    if (builtInPanels.length > 0) closeBuiltInPanels();
  } else {
    closeCustomSidebars();
    if (openedPanel !== INSPECTOR_PANEL && isInspectorOpen) {
      ui.closePanel(INSPECTOR_PANEL);
    }
    if (openedPanel === INSPECTOR_PANEL && otherBuiltIns.length > 0) {
      otherBuiltIns.forEach((panelId: any) => ui.closePanel(panelId));
    }
  }
}