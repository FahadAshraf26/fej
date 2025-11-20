import React, { FC } from "react";
import { Modal, Button, Skeleton, TextInput, Text } from "@mantine/core";

interface PreviewLinkModalProps {
  opened: boolean;
  onClose: () => void;
  clipboardUrl: {
    copy: (text: string) => void;
    copied: boolean;
  };
  clipboardEmbed: {
    copy: (text: string) => void;
    copied: boolean;
  };
  previewLink: string;
  embedCode: string;
}

export const PreviewLinkModal: FC<PreviewLinkModalProps> = ({
  opened,
  onClose,
  clipboardUrl,
  clipboardEmbed,
  previewLink,
  embedCode
}) => {
  return (
    <Modal opened={opened} onClose={onClose} title="Published Menus">
      <Text size="sm">Direct Link</Text>
      <Skeleton visible={previewLink.length <= 0}>
      <TextInput value={previewLink} readOnly />
      </Skeleton>
      <Button
        onClick={() => clipboardUrl.copy(previewLink)}
        size="xs"
        mt="sm"
        mb="md"
        style={{
          backgroundColor: "#FC6D20",
          color: "#652C10",
        }}
      >
        {clipboardUrl.copied ? "Copied" : "Copy"}
      </Button>
      <Text size="sm">Embed Code</Text>
      <Text size={10} mb={2} c="dimmed">Used for embedding on websites like wix, squarespace, etc.</Text>
      <Skeleton visible={embedCode.length <= 0}>
        <TextInput value={embedCode} readOnly />
      </Skeleton>
      <Button
        onClick={() => clipboardEmbed.copy(embedCode)}
        size="xs"
        mt="sm"
        style={{
          backgroundColor: "#FC6D20",
          color: "#652C10",
        }}
      >
        {clipboardEmbed.copied ? "Copied" : "Copy"}
      </Button>
    </Modal>
  )
}