import { Dispatch, SetStateAction } from "react";
import { Button, Group, Modal, TextInput, Text, FileInput } from "@mantine/core";
import { IconUpload } from "@tabler/icons";
import { DEFAULT_FONTS } from "@Contants/DefaultFont";
import { ITemplateDetails } from "@Interfaces/";
import { uploadCustomFont } from "@Hooks/index";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { getFonts } from "@Components/Editor/Utils";
import { v4 as uuidv4 } from "uuid";

export const UploadFontModal = (
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
  user: any,
  setFontListTrigger?: Dispatch<SetStateAction<number>>
) => {
  const fonts = useInitializeEditor.getState().fonts;
  const setFonts = useInitializeEditor.getState().setFonts;
  const instance = useInitializeEditor.getState().cesdkInstance.current;

  const refreshFontList = () => {
    if (setFontListTrigger) {
      setFontListTrigger((prev) => prev + 1);
    }
  };

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
        instance.engine.asset.addAssetToSource("my-custom-typefaces", font);
      });

      // Update the global store with the new font to persist across editor sessions
      const currentFonts = useInitializeEditor.getState().fonts;
      setFonts([...currentFonts, newFont]);

      setTitleFontSize("");
      setFont(null);

      setIsUploadFontModal(false);

      setTimeout(() => {
        refreshFontList();
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
    <Modal opened={isUploadFontModal} onClose={handleClose} title="Upload Custom Fonts" centered>
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
