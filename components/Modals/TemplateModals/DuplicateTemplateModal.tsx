import React, { useCallback } from "react";
import { Box, Text, Input, Textarea, Flex, Alert } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCopy, IconAlertCircle } from "@tabler/icons";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import CommonModal from "../../CommonComponents/Modal";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { useUserContext } from "../../../context/UserContext";

interface DuplicateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ITemplateDetails;
}

const DuplicateTemplateModal: React.FC<DuplicateTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  const { user } = useUserContext();
  // Get duplicate function from store
  const duplicateTemplate = useTemplateStore((state) => state.duplicateTemplate);

  // Initialize form with Mantine's useForm hook
  const form = useForm({
    initialValues: {
      name: "",
      description: template?.description || "",
      isSubmitting: false,
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? "Name is required" : null),
    },
  });

  // Reset form when modal opens with new template
  React.useEffect(() => {
    if (isOpen && template) {
      form.reset();
      form.setValues({
        name: `${template.name} (Copy)`,
        description: template.description || "",
        isSubmitting: false,
      });
    }
  }, [isOpen, template?.id]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: { name: string }) => {
      if (!template || !user?.id) return;

      try {
        form.setFieldValue("isSubmitting", true);
        await duplicateTemplate(template.id, values.name, template.description, user.id);
        form.setFieldValue("isSubmitting", false);
        onClose();
      } catch (error) {
        console.error("Error duplicating template:", error);
        form.setFieldError("name", "An error occurred. Please try again.");
        form.setFieldValue("isSubmitting", false);
      }
    },
    [template, duplicateTemplate, onClose, user?.id]
  );

  // Custom modal title with icon
  const modalTitle = (
    <Flex align="center" gap="xs">
      <IconCopy size={24} color="#ff9800" />
      <Text size="lg" weight={600}>
        Duplicate Template
      </Text>
    </Flex>
  );

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      submitLabel="Duplicate"
      submitLabelColor="orange"
      onSubmit={form.onSubmit(handleSubmit)}
      loading={form.values.isSubmitting}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <Text align="center" size="md" mb="md">
          Create a copy of this template?
        </Text>

        {form.errors.name && !form.errors.name.toString().includes("occurred") && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
            {form.errors.name}
          </Alert>
        )}

        <form id="duplicate-form">
          <Input.Wrapper
            label="New Template Name"
            required
            size="md"
            mb="md"
            mt="md"
            error={form.errors.name}
            styles={{
              label: {
                fontWeight: 600,
                marginBottom: 8,
              },
            }}
          >
            <Input
              placeholder="Enter new template name"
              size="md"
              {...form.getInputProps("name")}
              styles={(theme) => ({
                input: {
                  "&:focus": {
                    borderColor: theme.colors.orange[6],
                  },
                },
              })}
            />
          </Input.Wrapper>

          <Textarea
            label="Description"
            size="md"
            {...form.getInputProps("description")}
            styles={(theme) => ({
              label: {
                fontWeight: 600,
                marginBottom: 8,
              },
              input: {
                "&:focus": {
                  borderColor: theme.colors.orange[6],
                },
              },
            })}
            minRows={3}
            maxRows={4}
            placeholder="Provide a brief description for the duplicated template"
          />
        </form>

        {form.errors.name && form.errors.name.toString().includes("occurred") && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mt="md">
            {form.errors.name}
          </Alert>
        )}
      </Box>
    </CommonModal>
  );
};

export default DuplicateTemplateModal;
