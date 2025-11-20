import React, { FC } from "react";
import {
  Modal,
  Button,
  TextInput,
  Text,
  Grid,
  Col,
  Skeleton,
} from "@mantine/core";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

interface PreviewLinkModalProps {
  onClose: () => void;
  clipboardUrl: {
    copy: (text: string) => void;
    copied: boolean;
  };
  clipboardEmbed: {
    copy: (text: string) => void;
    copied: boolean;
  };
}

export const PreviewLinkModal: FC<PreviewLinkModalProps> = ({
  onClose,
  clipboardUrl,
  clipboardEmbed,
}) => {
  const isPreviewLink = useInitializeEditor((state) => state.isPreviewLink);
  const previewLink = useInitializeEditor((state) => state.previewLink);
  const embedCode = useInitializeEditor((state) => state.embedCode);
  return (
    <Modal
      opened={isPreviewLink}
      onClose={onClose}
      title="Published Menus"
      radius={5}
    >
      <Grid gutter="xs">
        <Col span={12}>
          <Text size="sm">Direct Link</Text>
        </Col>
        <Col span={12}>
          <Skeleton visible={!previewLink.length}>
            <TextInput value={previewLink} readOnly />
          </Skeleton>
        </Col>
        <Col span={1}>
          <Button
            onClick={() => clipboardUrl.copy(previewLink)}
            size="xs"
            mb="md"
            style={{
              backgroundColor: "#FC6D20",
              color: "#652C10",
            }}
          >
            {clipboardUrl.copied ? "Copied" : "Copy"}
          </Button>
        </Col>
        <Col span={12}>
          <Text size="sm">Embed Code</Text>
        </Col>
        <Col span={12}>
          <Text size={10} mb={2} c="dimmed">
            Used for embedding on websites like wix, squarespace, etc.
          </Text>
        </Col>
        <Col span={12}>
          <Skeleton visible={!embedCode.length}>
            <TextInput value={embedCode} readOnly />
          </Skeleton>
        </Col>
        <Col span={1}>
          <Button
            onClick={() => clipboardEmbed.copy(embedCode)}
            size="xs"
            style={{
              backgroundColor: "#FC6D20",
              color: "#652C10",
            }}
          >
            {clipboardEmbed.copied ? "Copied" : "Copy"}
          </Button>
        </Col>
      </Grid>
    </Modal>
  );
};
