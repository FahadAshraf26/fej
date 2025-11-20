import React from "react";
import styles from "./EditorConfig.module.css";
import { formatDate } from "./Utils/formatDate";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { Group, Stack, Text, Button, Divider } from "@mantine/core";

const SnapshotItem = ({
  version,
  isSaving,
  onLoadVersion,
  isLastItem,
}: any) => {
  return (
    <>
      <Group position="apart" py="md" px="xs">
        <Stack spacing={2}>
          <Text size="sm">
            {version.updated_by} (v{version.version})
          </Text>
          <Text size="sm" color="dimmed">
            {formatDate(version.created_at)}
          </Text>
        </Stack>

        <Button
          variant="filled"
          onClick={() => onLoadVersion(version.version, version.id)}
          disabled={!isSaving}
          size="xs"
          styles={{
            root: {
              backgroundColor: "#FF8000",
              "&:hover": {
                backgroundColor: "#FF9933",
              },
            },
          }}
        >
          Load
        </Button>
      </Group>

      {!isLastItem && <Divider color="gray.2" />}
    </>
  );
};

interface TemplateVersion {
  updated_by: string;
  created_at: string;
  file: string;
  version: string;
  id: number;
}

interface HistorySidebarProps {
  onLoadVersion: (version: string, id: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CloseIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 6L6 18M6 6L18 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const OpenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    style={{ marginRight: "4px" }}
    width="18"
    height="18"
    stroke-width="2"
  >
    {" "}
    <path d="M12 8l0 4l2 2"></path>{" "}
    <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"></path>{" "}
  </svg>
);

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  onLoadVersion,
  isOpen,
  onToggle,
}) => {
  const versions: TemplateVersion[] = useInitializeEditor(
    (state) => state.templateVersions
  );
  const isSaving = useInitializeEditor((state) => state.isSaving);
  const isInitializeEditor = useInitializeEditor(
    (state) => state.isInitializeEditor
  );
  const sortedVersions = [...versions].sort((a, b) => {
    const versionA = Number(a.version);
    const versionB = Number(b.version);
    const versionDiff = versionB - versionA;
    if (versionDiff !== 0) return versionDiff;

    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });
  return (
    <>
      {!isInitializeEditor && (
        <button
          className={`${styles.openButton} ${
            isOpen ? styles.openButtonHidden : ""
          }`}
          onClick={onToggle}
          aria-label="Open history sidebar"
        >
          <OpenIcon />
          <span className={styles.openButtonText}>Version History</span>
        </button>
      )}

      <div
        className={
          isOpen
            ? `${styles.sidebar_open}`
            : `${styles.sidebar_close} ${
                isOpen ? styles.sidebarOpen : styles.sidebarClosed
              }`
        }
      >
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarHeadline}>Version History</h2>
          <div className={styles.sidebarHeaderRight}>
            <button
              onClick={onToggle}
              className={styles.closeButton}
              aria-label="Close history sidebar"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        <Stack spacing="lg" mx="lg">
          {sortedVersions.map((version, index) => (
            <SnapshotItem
              key={`${version.id}-${index}`}
              version={version}
              isSaving={!isSaving}
              onLoadVersion={(version: any, id: any) =>
                onLoadVersion(version, id)
              }
              isLastItem={index === versions.length - 1}
            />
          ))}
        </Stack>
      </div>
    </>
  );
};

export default HistorySidebar;
