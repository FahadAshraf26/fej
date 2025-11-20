import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { MimeType } from "@cesdk/cesdk-js";
import { supabase } from "@database/client.connection";
import { toast } from "react-toastify";

export const onPublish = async ({
  restaurantId,
  templateId,
}: {
  restaurantId?: string;
  templateId?: string;
}) => {
  const cesdkInstance = useInitializeEditor.getState().cesdkInstance;
  const setPreviewLink = useInitializeEditor.getState().setPreviewLink;
  const setEmbedCode = useInitializeEditor.getState().setEmbedCode;
  const setIsPreviewLink = useInitializeEditor.getState().setIsPreviewLink;
  try {
    setIsPreviewLink(true);
    const pages = cesdkInstance.current?.engine.scene.getPages();
    const scene = cesdkInstance.current?.engine.scene.get();
    const bl = await cesdkInstance.current?.engine.block.export(scene!, MimeType.Pdf);
    for (let page = 0; page < pages.length; page++) {
      const blimage = await cesdkInstance.current?.engine.block.export(
        pages[page]!,
        MimeType.Jpeg,
        {
          jpegQuality: 1,
          targetWidth: 1200,
          targetHeight: 1200,
        }
      );
      const { data: jpgData, error } = await supabase.storage
        .from("JPEGs")
        .upload(`${restaurantId}/${templateId}/page${page}.jpg`, blimage, {
          upsert: true,
        });
    }
    const { data: result, error: pdfUploadError } = await supabase.storage
      .from("PDFs")
      .upload(`${restaurantId}/${templateId}.pdf`, bl, {
        upsert: true,
      });
    // Ensure no error occurred during PDF upload
    if (pdfUploadError) {
      throw pdfUploadError;
    }
    const { data } = supabase.storage
      .from("PDFs")
      .getPublicUrl(`${restaurantId}/${templateId}.pdf?version=${Date.now()}`);
    if (data || (restaurantId && templateId && location.host)) {
      setPreviewLink(
        `${
          process.env.NEXT_PUBLIC_SUPABASE_URL
        }/storage/v1/object/public/PDFs/${restaurantId}/${templateId}.pdf?version=${Date.now()}`
      );
      setEmbedCode(
        `<iframe src="https://${
          location.host
        }/menu/embed/${restaurantId}/${templateId}?version=${Date.now()}" style="position: absolute; top: 0; left: 0; bottom: 0; right: 0; width: 100%; height: 100%;"></iframe>`
      );
    }
  } catch (error: any) {
    console.error("Error generating preview:", error.message);
    toast(error.message, { type: "error" });
  }
};
