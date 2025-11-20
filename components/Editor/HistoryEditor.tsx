import dynamic from "next/dynamic";

const HistoryEditor = dynamic(() => import("./HistoryEditorConfig"), {
  ssr: false,
});

export default HistoryEditor;
