import React, { useState } from "react";
import { Group, Text, Stack, Divider, Alert } from "@mantine/core";
import { IconFile, IconTemplate, IconAlertCircle } from "@tabler/icons";
import CommonModal from "../CommonComponents/Modal";
import { PSDImportZone } from "./PSDImportZone";

interface PSDImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPSDImport: (scene: any, fileName: string) => void;
  onError: (error: string) => void;
}

export const PSDImportModal: React.FC<PSDImportModalProps> = ({
  isOpen,
  onClose,
  onPSDImport,
  onError,
}) => {
  const [importedScene, setImportedScene] = useState<any>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handlePSDImport = (scene: any) => {
    setImportedScene(scene);
    const sceneFileName =
      scene?.meta?.originalFileName || scene?.meta?.name || "Imported PSD Template";
    setFileName(sceneFileName);

    setTimeout(() => {
      if (scene) {
        onPSDImport(scene, sceneFileName);
        handleClose();
      }
    }, 500);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleConfirmImport = () => {
    if (importedScene) {
      onPSDImport(importedScene, fileName);
      handleClose();
    }
  };

  const handleClose = () => {
    setImportedScene(null);
    setFileName("");
    setError("");
    onClose();
  };

  const modalTitle = (
    <Group spacing="xs">
      <IconFile size={24} color="#ff9800" />
      <Text>Import PSD Template</Text>
    </Group>
  );

  return (
    <CommonModal
      title={modalTitle}
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      hideFooter={true}
      loading={false}
    >
      <Stack spacing="md">
        <Alert color="blue" icon={<IconTemplate size={16} />} variant="light">
          <Text size="sm">
            Upload one or more Photoshop (.psd) files to create a new menu template. Each PSD file
            will be converted into a page in the menu. The files will be merged into a single
            non-auto layout menu for maximum design flexibility.
          </Text>
        </Alert>

        <Alert color="orange" icon={<IconFile size={16} />} variant="light">
          <Text size="sm">
            <strong>File Size Information:</strong>
            <br />
            • Files under 50MB: Direct upload
            <br />
            • Files over 50MB: Automatically split into chunks
            <br />• For best performance, compress large PSD files first
          </Text>
        </Alert>

        <PSDImportZone onPSDImport={handlePSDImport} onError={handleError} />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            <Text size="sm">{error}</Text>
          </Alert>
        )}

        {importedScene && (
          <>
            <Divider />
            <Alert color="green" icon={<IconTemplate size={16} />}>
              <Text size="sm">
                PSD file imported successfully! Creating menu and opening editor...
              </Text>
            </Alert>
          </>
        )}
      </Stack>
    </CommonModal>
  );
};
