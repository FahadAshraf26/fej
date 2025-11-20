// components/Modals/Forms/RenameTemplateModal.tsx
import React, { useEffect, useCallback } from "react";
import { Box, Flex, Input, Text, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconEdit } from "@tabler/icons";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import CommonModal from "../../CommonComponents/Modal";
import { useTemplateStore } from "../../../stores/Template/Template.store";

interface RenameTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ITemplateDetails;
}

const RenameTemplateModal: React.FC<RenameTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  // Get rename function from store
  const renameTemplate = useTemplateStore((state) => state.renameTemplate);

  // Initialize form with Mantine's useForm hook
  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      isSubmitting: false,
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? "Name is required" : null),
    },
  });

  // Reset form when modal opens with new template
  useEffect(() => {
    if (isOpen && template) {
      form.reset();
      form.setValues({
        name: template.name || "",
        description: template.description || "",
        isSubmitting: false,
      });
    }
  }, [isOpen, template?.id]); // Only depend on template.id instead of the whole template object

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: { name: string; description: string }) => {
      if (!template) return;

      try {
        form.setFieldValue("isSubmitting", true);
        await renameTemplate(template.id, values.name, values.description);
        form.setFieldValue("isSubmitting", false);
        onClose();
      } catch (error) {
        console.error("Error renaming template:", error);
        form.setFieldError("name", "An error occurred. Please try again.");
        form.setFieldValue("isSubmitting", false);
      }
    },
    [template, renameTemplate, onClose]
  );

  // Custom modal title with icon
  const modalTitle = (
    <Flex align="center" gap="xs">
      <IconEdit size={24} color="#ff9800" />
      <Text size="lg" weight={600}>
        Rename Template
      </Text>
    </Flex>
  );

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      submitLabel="Save Changes"
      submitLabelColor="orange"
      onSubmit={form.onSubmit(handleSubmit)}
      loading={form.values.isSubmitting}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <Text align="center" size="md" mb="md">
          Are you sure you want to rename this template?
        </Text>

        <form>
          <Input.Wrapper
            label="Template Name"
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
              placeholder="Enter template name"
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
            placeholder="Provide a brief description of this template"
          />
        </form>
      </Box>
    </CommonModal>
  );
};

export default RenameTemplateModal;
