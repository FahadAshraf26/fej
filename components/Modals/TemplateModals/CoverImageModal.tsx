// components/Modals/Forms/CoverImageModal.tsx
import React, { useCallback, useState } from "react";
import { Box, Flex, Text, FileButton, Button, Image } from "@mantine/core";
import { IconUpload } from "@tabler/icons";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import CommonModal from "../../CommonComponents/Modal";
import { useTemplateStore } from "../../../stores/Template/Template.store";

interface CoverImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ITemplateDetails;
}

const CoverImageModal: React.FC<CoverImageModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  // Get upload function from store
  const uploadCoverImage = useTemplateStore((state) => state.uploadCoverImage);

  // State for file and loading
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setError("");
      setPreviewUrl(null);
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setFile(file);
    setError("");

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Cleanup preview URL when component unmounts
    return () => URL.revokeObjectURL(url);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!template || !file) return;

    try {
      setIsLoading(true);
      setError("");
      await uploadCoverImage(template.id, file);
      onClose();
    } catch (error) {
      console.error("Error uploading cover image:", error);
      setError(
        "An error occurred while uploading the image. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [template, file, uploadCoverImage, onClose]);

  // Custom modal title with icon
  const modalTitle = (
    <Flex align="center" gap="xs">
      <IconUpload size={24} color="#ff9800" />
      <Text size="lg" weight={600}>
        Upload Cover Image
      </Text>
    </Flex>
  );

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      submitLabel="Upload"
      submitLabelColor="orange"
      onSubmit={handleSubmit}
      loading={isLoading}
      disabled={!file}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <Text align="center" size="md" mb="md">
          Choose an image to use as the template cover
        </Text>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Preview"
              width={200}
              height={200}
              fit="cover"
              radius="md"
            />
          ) : (
            <Box
              sx={{
                width: 200,
                height: 200,
                border: "2px dashed #ccc",
                borderRadius: "md",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text color="dimmed" align="center">
                No image selected
              </Text>
            </Box>
          )}

          <FileButton
            onChange={handleFileSelect}
            accept="image/*"
            disabled={isLoading}
          >
            {(props) => (
              <Button {...props} variant="outline" color="orange">
                Choose Image
              </Button>
            )}
          </FileButton>

          {error && (
            <Text color="red" size="sm">
              {error}
            </Text>
          )}

          <Text size="sm" color="dimmed">
            Supported formats: JPG, PNG, GIF (max 5MB)
          </Text>
        </Box>
      </Box>
    </CommonModal>
  );
};

export default CoverImageModal;
