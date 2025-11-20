import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Box, Text, Group, ActionIcon, ThemeIcon, Badge, Paper, Stack } from "@mantine/core";
import { IconGripVertical, IconX, IconFile, IconCheck, IconAlertCircle } from "@tabler/icons";
import styles from "./PSDImport.module.css";

export interface PSDFileItem {
  id: string;
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  sceneArchive?: Blob;
}

interface ReorderablePSDListProps {
  files: PSDFileItem[];
  onReorder: (files: PSDFileItem[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export const ReorderablePSDList: React.FC<ReorderablePSDListProps> = ({
  files,
  onReorder,
  onRemove,
  disabled = false,
}) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || disabled) return;

    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorder(items);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <IconCheck size={16} color="green" />;
      case "error":
        return <IconAlertCircle size={16} color="red" />;
      case "processing":
        return <div className={styles["animate-spin"]}><IconFile size={16} color="blue" /></div>;
      default:
        return <IconFile size={16} color="gray" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "green";
      case "error":
        return "red";
      case "processing":
        return "blue";
      default:
        return "gray";
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="psd-files">
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={(theme) => ({
              backgroundColor: snapshot.isDraggingOver ? theme.colors.gray[0] : "transparent",
              borderRadius: theme.radius.md,
              padding: snapshot.isDraggingOver ? theme.spacing.xs : 0,
              transition: "all 0.2s ease",
            })}
          >
            <Stack spacing="xs">
              {files.map((fileItem, index) => (
                <Draggable
                  key={fileItem.id}
                  draggableId={fileItem.id}
                  index={index}
                  isDragDisabled={disabled || fileItem.status === "processing"}
                >
                  {(provided, snapshot) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      shadow={snapshot.isDragging ? "md" : "xs"}
                      p="md"
                      sx={(theme) => ({
                        backgroundColor: snapshot.isDragging ? theme.colors.blue[0] : "white",
                        border: `1px solid ${theme.colors.gray[3]}`,
                        cursor: disabled || fileItem.status === "processing" ? "default" : "grab",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          borderColor: theme.colors.blue[4],
                        },
                      })}
                    >
                      <Group position="apart" noWrap>
                        <Group spacing="md" noWrap sx={{ flex: 1, minWidth: 0 }}>
                          <div {...provided.dragHandleProps}>
                            <ThemeIcon
                              color="gray"
                              variant="light"
                              size="lg"
                              sx={{
                                cursor:
                                  disabled || fileItem.status === "processing"
                                    ? "not-allowed"
                                    : "grab",
                              }}
                            >
                              <IconGripVertical size={20} />
                            </ThemeIcon>
                          </div>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Group spacing="xs" mb={4}>
                              <ThemeIcon color={getStatusColor(fileItem.status)} variant="light" size="sm">
                                {getStatusIcon(fileItem.status)}
                              </ThemeIcon>
                              <Text
                                size="sm"
                                weight={500}
                                sx={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={fileItem.file.name}
                              >
                                {fileItem.file.name}
                              </Text>
                            </Group>
                            <Group spacing="xs">
                              <Badge size="xs" variant="outline" color="gray">
                                Page {index + 1}
                              </Badge>
                              <Text size="xs" color="dimmed">
                                {formatFileSize(fileItem.file.size)}
                              </Text>
                              {fileItem.status === "error" && fileItem.error && (
                                <Text size="xs" color="red" lineClamp={1}>
                                  {fileItem.error}
                                </Text>
                              )}
                            </Group>
                          </Box>
                        </Group>

                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => onRemove(fileItem.id)}
                          disabled={disabled || fileItem.status === "processing"}
                        >
                          <IconX size={18} />
                        </ActionIcon>
                      </Group>
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Stack>
          </Box>
        )}
      </Droppable>
    </DragDropContext>
  );
};
