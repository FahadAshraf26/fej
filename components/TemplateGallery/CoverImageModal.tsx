// components/TemplateGallery/CoverImageModal.tsx
import { useState } from "react";
import { Box } from "@mantine/core";
import { useForm } from "@mantine/form";
import { ITemplateDetails } from "../../interfaces/ITemplate";
import CommonModal from "../CommonComponents/Modal";
import ImageUploadInput from "../CommonComponents/ImageUploadInput";

interface CoverImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  template?: ITemplateDetails;
}

const CoverImageModal = ({
  isOpen,
  onClose,
  onUpload,
  template,
}: CoverImageModalProps) => {
  const [uploading, setUploading] = useState(false);

  // Initialize form
  const form = useForm({
    initialValues: {
      coverImage: null as File | null,
    },
  });

  // Reset form when modal closes
  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Handle form submission
  const handleSubmit = async (values: { coverImage: File | null }) => {
    if (!values.coverImage) return;

    setUploading(true);
    try {
      await onUpload(values.coverImage);
      form.reset();
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Thumbnail"
      loading={uploading}
      onSubmit={form.onSubmit(handleSubmit)}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <form id="thumbnailForm">
          <ImageUploadInput template={template} form={form} />
        </form>
      </Box>
    </CommonModal>
  );
};

export default CoverImageModal;
