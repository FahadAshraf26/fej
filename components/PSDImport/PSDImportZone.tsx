import React, { useCallback, useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import {
  Box,
  Text,
  ThemeIcon,
  Alert,
  Stack,
  Progress,
  Group,
  Badge,
  ScrollArea,
} from "@mantine/core";
import { IconUpload, IconFile, IconAlertCircle, IconCheck, IconX } from "@tabler/icons";
import useUploadStore from "../../stores/upload/upload.store";
import { getLargeFileSuggestions } from "../../helpers/PSDFileSuggestions";

interface PSDImportZoneProps {
  onPSDImport: (scene: any) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface FileProcessingStatus {
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  sceneArchive?: Blob;
}

export const PSDImportZone: React.FC<PSDImportZoneProps> = ({
  onPSDImport,
  onError,
  disabled = false,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "processing" | "success" | "error">(
    "idle"
  );
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileProcessingStatus[]>([]);
  const [mergeProgress, setMergeProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const uploads = useUploadStore((state) => state.uploads);

  useEffect(() => {
    if (uploadId && uploads[uploadId]) {
      const upload = uploads[uploadId];
      setUploadProgress(upload.progress);

      if (upload.status === "error") {
        setImportStatus("error");
        onError(upload.error?.message || "Upload failed");
        setIsProcessing(false);
      } else if (upload.status === "completed") {
        const fileName = uploadId.split("-").slice(1).join("-");
        const originalFileName = fileName.replace(/^\d+-/, "");

        const sceneData = {
          version: "1.0.0",
          meta: {
            name: originalFileName.replace(".psd", ""),
            created: new Date().toISOString(),
            isPSDImport: true,
            fileSize: 0,
            uploadedFileName: fileName,
            psdFileUrl: fileName,
            originalFileName: originalFileName,
          },
          pages: [
            {
              id: "page-1",
              name: "Main Page",
              width: 800,
              height: 600,
              blocks: [
                {
                  id: "psd-import-block",
                  type: "ly.img.image",
                  x: 0,
                  y: 0,
                  width: 800,
                  height: 600,
                  fill: "#ffffff",
                },
              ],
            },
          ],
        };

        setImportStatus("success");
        onPSDImport(sceneData);
        setIsProcessing(false);
      }
    }
  }, [uploadId, uploads, onError, onPSDImport]);

  const processPSDFile = useCallback(
    async (
      file: File,
      fileIndex: number
    ): Promise<{ success: boolean; sceneArchive?: Blob; error?: string }> => {
      if (!file) {
        return { success: false, error: "No file provided" };
      }

      if (typeof window === "undefined") {
        throw new Error("PSD processing is only available in the browser.");
      }

      setFiles((prev) => {
        const updated = [...prev];
        updated[fileIndex] = { ...updated[fileIndex], status: "processing", progress: 0 };
        return updated;
      });

      let progressInterval: NodeJS.Timeout | null = null;

      try {
        progressInterval = setInterval(() => {
          setFiles((prev) => {
            const updated = [...prev];
            if (updated[fileIndex] && updated[fileIndex].progress < 90) {
              updated[fileIndex] = {
                ...updated[fileIndex],
                progress: Math.min(updated[fileIndex].progress + 2, 90),
              };
            }
            return updated;
          });
        }, 300);

        setFiles((prev) => {
          const updated = [...prev];
          updated[fileIndex] = { ...updated[fileIndex], progress: 5 };
          return updated;
        });

        const PSDProcessorModule = await import("./PSDProcessor");
        const PSDProcessor = PSDProcessorModule.default;
        const psdProcessor = PSDProcessor.getInstance();

        setFiles((prev) => {
          const updated = [...prev];
          updated[fileIndex] = { ...updated[fileIndex], progress: 10 };
          return updated;
        });

        const processedResult = await psdProcessor.processPSDFile(file, true);

        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }

        if (!processedResult || !processedResult.sceneArchive) {
          throw new Error("Failed to process PSD file");
        }

        setFiles((prev) => {
          const updated = [...prev];
          updated[fileIndex] = {
            ...updated[fileIndex],
            status: "completed",
            progress: 100,
            sceneArchive: processedResult.sceneArchive,
          };
          return updated;
        });

        return { success: true, sceneArchive: processedResult.sceneArchive };
      } catch (error) {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        console.error(`PSD import error for ${file.name}:`, error);

        let message = "Failed to import PSD file";
        if (error instanceof Error) {
          if (error.message.includes("413") || error.message.includes("Content Too Large")) {
            message = `File too large for upload. Please try compressing your PSD file or splitting it into smaller parts.\n\nSuggestions:\n${getLargeFileSuggestions(
              file.size
            )
              .map((s) => `• ${s}`)
              .join("\n")}`;
          } else if (
            error.message.includes("timeout") ||
            error.message.includes("timed out") ||
            error.message.includes("network") ||
            error.message.includes("slow network")
          ) {
            message = `Processing timed out due to slow network connection. Please check your internet connection and try again.`;
          } else {
            message = error.message;
          }
        }

        setFiles((prev) => {
          const updated = [...prev];
          updated[fileIndex] = {
            ...updated[fileIndex],
            status: "error",
            progress: 0,
            error: message,
          };
          return updated;
        });

        return { success: false, error: message };
      }
    },
    []
  );

  const processMultiplePSDFiles = useCallback(
    async (fileList: File[]) => {
      if (!fileList || fileList.length === 0) return;

      if (typeof window === "undefined") {
        throw new Error("PSD processing is only available in the browser.");
      }

      setIsProcessing(true);
      setImportStatus("processing");
      setUploadProgress(0);

      const initialFiles: FileProcessingStatus[] = fileList.map((file) => ({
        file,
        status: "pending",
        progress: 0,
      }));
      setFiles(initialFiles);

      try {
        toast(`Processing ${fileList.length} PSD file${fileList.length > 1 ? "s" : ""}...`, {
          type: "info",
        });

        const processResults = await Promise.all(
          fileList.map((file, index) => processPSDFile(file, index))
        );

        const sceneArchives: Array<{ archive: Blob; fileName: string }> = [];
        const errorFiles: string[] = [];

        processResults.forEach((result, index) => {
          if (result.success && result.sceneArchive) {
            sceneArchives.push({
              archive: result.sceneArchive,
              fileName: fileList[index].name,
            });
          } else {
            errorFiles.push(fileList[index].name);
          }
        });

        if (errorFiles.length > 0 && sceneArchives.length === 0) {
          throw new Error(`Failed to process all files: ${errorFiles.join(", ")}`);
        }

        if (errorFiles.length > 0) {
          toast(
            `Warning: ${errorFiles.length} file(s) failed to process: ${errorFiles.join(", ")}`,
            { type: "warning" }
          );
        }

        if (sceneArchives.length === 0) {
          throw new Error("No PSD files were successfully processed");
        }

        setMergeProgress(10);
        toast("Merging PSD files into a single menu...", { type: "info" });

        const PSDProcessorModule = await import("./PSDProcessor");
        const PSDProcessor = PSDProcessorModule.default;
        const psdProcessor = PSDProcessor.getInstance();

        setMergeProgress(30);
        const mergeResult = await psdProcessor.mergeMultiplePSDScenes(sceneArchives);

        setMergeProgress(90);
        await new Promise((resolve) => setTimeout(resolve, 100));
        setMergeProgress(100);

        const archiveFileName = `merged-${Date.now()}.scene`;
        const totalFileSize = fileList.reduce((sum, file) => sum + file.size, 0);

        const sceneData = {
          version: "1.0.0",
          meta: {
            name:
              fileList.length === 1
                ? fileList[0].name.replace(".psd", "")
                : `${fileList.length} PSD Files`,
            created: new Date().toISOString(),
            isPSDImport: true,
            fileSize: totalFileSize,
            processedArchiveBlob: mergeResult.sceneArchive,
            processedArchiveFileName: archiveFileName,
            originalFileName: fileList.map((f) => f.name).join(", "),
            isProcessedArchive: true,
            needsFirstSave: true,
            processingMessages: mergeResult.messages || [],
            isMultiPSDImport: true,
            pageNames: mergeResult.pageNames || [],
          },
          pages: mergeResult.pageNames.map((name, index) => ({
            id: `page-${index + 1}`,
            name: name,
            width: 800,
            height: 600,
            blocks: [],
          })),
        };

        setImportStatus("success");
        onPSDImport(sceneData);
        setIsProcessing(false);
        toast(
          `Successfully processed ${sceneArchives.length} PSD file${
            sceneArchives.length > 1 ? "s" : ""
          }! Opening editor...`,
          { type: "success" }
        );
      } catch (error) {
        console.error("PSD import error:", error);
        setImportStatus("error");
        setUploadProgress(0);
        setMergeProgress(0);

        let message = "Failed to import PSD files";
        if (error instanceof Error) {
          message = error.message;
        }
        toast(message, { type: "error" });
        onError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [files, processPSDFile, onPSDImport, onError]
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const invalidFiles = selectedFiles.filter(
      (file) =>
        file.type !== "image/vnd.adobe.photoshop" && !file.name.toLowerCase().endsWith(".psd")
    );

    if (invalidFiles.length > 0) {
      onError(
        `Please select valid PSD files. Invalid files: ${invalidFiles
          .map((f) => f.name)
          .join(", ")}`
      );
      return;
    }

    processMultiplePSDFiles(selectedFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);

    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    const invalidFiles = droppedFiles.filter(
      (file) =>
        file.type !== "image/vnd.adobe.photoshop" && !file.name.toLowerCase().endsWith(".psd")
    );

    if (invalidFiles.length > 0) {
      onError(
        `Please drop valid PSD files. Invalid files: ${invalidFiles.map((f) => f.name).join(", ")}`
      );
      return;
    }

    processMultiplePSDFiles(droppedFiles);
  };

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click();
    }
  };

  const getStatusIcon = () => {
    switch (importStatus) {
      case "processing":
        return <IconUpload size={24} className="animate-spin" />;
      case "success":
        return <IconCheck size={24} color="green" />;
      case "error":
        return <IconAlertCircle size={24} color="red" />;
      default:
        return <IconFile size={24} />;
    }
  };

  const getStatusText = () => {
    switch (importStatus) {
      case "processing":
        return files.length > 0
          ? `Processing ${files.length} PSD file${files.length > 1 ? "s" : ""}...`
          : "Processing PSD files...";
      case "success":
        return "PSD files imported successfully!";
      case "error":
        return "Import failed. Please try again.";
      default:
        return isDragActive
          ? "Drop your PSD file(s) here"
          : "Drag & drop PSD file(s) or click to browse";
    }
  };

  const removeFile = (index: number) => {
    if (isProcessing) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Box>
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        sx={(theme) => ({
          border: `2px dashed ${
            isDragActive
              ? theme.colors.orange[6]
              : importStatus === "error"
              ? theme.colors.red[6]
              : importStatus === "success"
              ? theme.colors.green[6]
              : theme.colors.gray[4]
          }`,
          borderRadius: theme.radius.md,
          padding: theme.spacing.xl,
          textAlign: "center",
          cursor: disabled || isProcessing ? "not-allowed" : "pointer",
          backgroundColor: isDragActive
            ? theme.colors.orange[0]
            : importStatus === "success"
            ? theme.colors.green[0]
            : theme.colors.gray[0],
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: disabled || isProcessing ? undefined : theme.colors.orange[0],
            borderColor: disabled || isProcessing ? undefined : theme.colors.orange[6],
          },
        })}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".psd,image/vnd.adobe.photoshop"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <Stack align="center" spacing="md">
          <ThemeIcon
            size={48}
            radius="xl"
            color={
              importStatus === "success" ? "green" : importStatus === "error" ? "red" : "orange"
            }
            variant="light"
          >
            {getStatusIcon()}
          </ThemeIcon>

          <Text size="lg" weight={600} color="dimmed">
            {getStatusText()}
          </Text>

          {importStatus === "idle" && (
            <Text size="sm" color="dimmed">
              Supported format: .psd files (multiple files supported)
            </Text>
          )}

          {importStatus === "processing" && (
            <Stack spacing="xs" style={{ width: "100%" }}>
              {files.length > 0 && mergeProgress === 0 ? (
                <>
                  <Text size="sm" color="dimmed">
                    Processing {files.length} file{files.length > 1 ? "s" : ""}...
                  </Text>
                  {files.map((fileStatus, index) => (
                    <Box key={index} style={{ width: "100%" }}>
                      <Group position="apart" mb={4}>
                        <Text
                          size="xs"
                          color="dimmed"
                          style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {fileStatus.file.name}
                        </Text>
                        <Badge
                          size="xs"
                          color={
                            fileStatus.status === "completed"
                              ? "green"
                              : fileStatus.status === "error"
                              ? "red"
                              : "orange"
                          }
                        >
                          {fileStatus.status === "completed"
                            ? "Done"
                            : fileStatus.status === "error"
                            ? "Error"
                            : `${fileStatus.progress}%`}
                        </Badge>
                      </Group>
                      <Progress
                        value={fileStatus.progress}
                        size="xs"
                        radius="xl"
                        color={
                          fileStatus.status === "completed"
                            ? "green"
                            : fileStatus.status === "error"
                            ? "red"
                            : "orange"
                        }
                        style={{ width: "100%" }}
                      />
                    </Box>
                  ))}
                </>
              ) : mergeProgress > 0 ? (
                <>
                  <Text size="sm" color="dimmed">
                    Merging PSD files into a single menu... {mergeProgress}%
                  </Text>
                  <Progress
                    value={mergeProgress}
                    size="sm"
                    radius="xl"
                    color="orange"
                    style={{ width: "100%" }}
                  />
                </>
              ) : (
                <>
                  <Text size="sm" color="dimmed">
                    Processing... {uploadProgress}%
                  </Text>
                  <Progress
                    value={uploadProgress}
                    size="sm"
                    radius="xl"
                    color="orange"
                    style={{ width: "100%" }}
                  />
                </>
              )}
            </Stack>
          )}
        </Stack>
      </Box>

      {importStatus === "error" && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} mt="md">
          <Text size="sm">
            There was an error processing your PSD file. Please make sure it&apos;s a valid PSD file
            and try again.
          </Text>
        </Alert>
      )}

      {files.length > 0 && importStatus !== "processing" && (
        <Box mt="md">
          <Text size="sm" weight={600} mb="xs">
            Selected Files ({files.length}):
          </Text>
          <ScrollArea style={{ maxHeight: 150 }}>
            <Stack spacing="xs">
              {files.map((fileStatus, index) => (
                <Group
                  key={index}
                  position="apart"
                  p="xs"
                  style={{ border: "1px solid #e0e0e0", borderRadius: 4 }}
                >
                  <Text size="xs" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {fileStatus.file.name}
                  </Text>
                  {!isProcessing && (
                    <IconX
                      size={16}
                      style={{ cursor: "pointer" }}
                      onClick={() => removeFile(index)}
                    />
                  )}
                </Group>
              ))}
            </Stack>
          </ScrollArea>
        </Box>
      )}

      {importStatus === "success" && (
        <Alert color="green" icon={<IconCheck size={16} />} mt="md">
          <Text size="sm">
            Your PSD file{files.length > 1 ? "s have" : " has"} been successfully imported and{" "}
            {files.length > 1 ? "are" : "is"} ready to use as a template.
          </Text>
        </Alert>
      )}
    </Box>
  );
};
