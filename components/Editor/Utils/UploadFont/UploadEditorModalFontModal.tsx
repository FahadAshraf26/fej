import { Dispatch, SetStateAction } from "react";
import { Button, Group, Modal, TextInput, Text, FileInput } from "@mantine/core";
import { IconUpload } from "@tabler/icons";
import { DEFAULT_FONTS } from "@Contants/DefaultFont";
import { ITemplateDetails } from "@Interfaces/";
import { uploadCustomFont } from "@Hooks/index";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { getFonts } from "@Components/Editor/Utils";
import { v4 as uuidv4 } from "uuid";

export const UploadEditorModalFontModal = (
  setFontsError: Dispatch<SetStateAction<any>>,
  template: ITemplateDetails | null,
  setloading: Dispatch<SetStateAction<boolean>>,
  fontsError: any,
  loading: boolean,
  isUploadFontModal: boolean,
  setTitleFontSize: Dispatch<SetStateAction<any>>,
  setFont: Dispatch<SetStateAction<any>>,
  titleFontSize: any,
  font: any,
  setIsUploadFontModal: Dispatch<SetStateAction<boolean>>,
  setFontListTrigger: Dispatch<SetStateAction<number>>,
  instanceRef: any
) => {
  const fonts = useInitializeEditor.getState().fonts;
  const setFonts = useInitializeEditor.getState().setFonts;

  const handleUploadFont = async () => {
    try {
      if (!titleFontSize) {
        setFontsError({ title: "Font title required" });
        return;
      }
      if (!font) {
        setFontsError({ file: "Font file required" });
        return;
      }
      const alreadyUploaded = [...fonts, ...DEFAULT_FONTS].filter(
        (item: any) => item?.name === titleFontSize
      );
      if (alreadyUploaded.length) {
        setFontsError({ submit: "Font already exist" });
        return;
      }
      setFontsError({});

      setloading(true);
      const content = uuidv4();
      await uploadCustomFont(font, template, titleFontSize, content);

      const newFont = {
        name: titleFontSize,
        file: font,
        content,
      };

      getFonts([newFont]).map((font: any) => {
        instanceRef.current.engine.asset.addAssetToSource("my-custom-modal-typefaces", font);
      });

      // Update the global store with the new font to persist across modal sessions
      const currentFonts = useInitializeEditor.getState().fonts;
      setFonts([...currentFonts, newFont]);

      // Also add the font to the main editor's CESDK instance if it exists
      const mainEditorInstance = useInitializeEditor.getState().cesdkInstance.current;
      if (mainEditorInstance) {
        getFonts([newFont]).map((font: any) => {
          mainEditorInstance.engine.asset.addAssetToSource("my-custom-typefaces", font);
        });
      }

      setTitleFontSize("");
      setFont(null);

      setIsUploadFontModal(false);

      setTimeout(() => {
        if (setFontListTrigger) {
          setFontListTrigger((prev) => prev + 1);
        }
      }, 100);
    } catch (error) {
      console.error("Font upload error:", error);
      setFontsError({ submit: "Failed to upload font" });
    } finally {
      setloading(false);
    }
  };

  const handleClose = () => {
    setTitleFontSize("");
    setFont(null);
    setFontsError({});
    setIsUploadFontModal(false);
  };

  return (
    <Modal
      opened={isUploadFontModal}
      onClose={handleClose}
      title="Upload Custom Fonts"
      centered
      classNames={{
        root: "upload-font-modal-cesdk-modal",
      }}
    >
      <TextInput
        label="Your custom font name"
        placeholder="Your custom font name"
        value={titleFontSize || ""}
        onChange={(e) => setTitleFontSize(e.target.value)}
        error={fontsError?.title}
      />
      <FileInput
        label="Your custom font"
        icon={<IconUpload size={14} />}
        value={font}
        onChange={(file: any) => setFont(file)}
        error={fontsError?.file}
        accept=".ttf,.otf,.woff,.woff2"
      />
      <Text color="red" fz={"xs"} my={"xs"}>
        {fontsError?.submit}
      </Text>
      <Group position="right" mt={"md"}>
        <Button onClick={handleClose} variant="outline">
          Cancel
        </Button>
        <Button onClick={handleUploadFont} disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </Group>
    </Modal>
  );
};
