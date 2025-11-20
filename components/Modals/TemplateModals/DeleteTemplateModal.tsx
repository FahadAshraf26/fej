import React, { useCallback } from "react";
import { Alert, Box, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import CommonModal from "../../CommonComponents/Modal";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { useUserContext } from "../../../context/UserContext";

interface DeleteTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ITemplateDetails;
}

const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  const { user } = useUserContext();
  const deleteTemplate = useTemplateStore((state) => state.deleteTemplate);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // Handler for delete operation
  const handleDelete = useCallback(async () => {
    if (!template) {
      setError("Template information is missing");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await deleteTemplate(template, user?.id || "");
      onClose();
    } catch (error) {
      console.error("Error deleting template:", error);
      setError(
        "An error occurred while deleting the template. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [template, deleteTemplate, user?.id, onClose]);

  // Customized modal title with icon
  const modalTitle = (
    <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <IconAlertCircle size={24} color="#fa5252" />
      <Text size="lg" weight={600}>
        Delete Template
      </Text>
    </Box>
  );

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      submitLabel="Delete"
      submitLabelColor="red"
      onSubmit={handleDelete}
      loading={isLoading}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <Text align="center" size="md" mb="md">
          Are you sure you want to delete this menu?
        </Text>

        <Alert icon={<IconAlertCircle size={16} />} title="Alert!" color="red">
          This action cannot be undone. The template will be permanently
          deleted.
        </Alert>

        {error && (
          <Text color="red" size="sm" mt="xs">
            {error}
          </Text>
        )}
      </Box>
    </CommonModal>
  );
};

export default DeleteTemplateModal;
