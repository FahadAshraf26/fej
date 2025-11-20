// components/TemplateGallery/TemplateView/DeleteRestaurantModal.tsx
import React, { useState } from "react";
import {
  Modal,
  Group,
  ActionIcon,
  Flex,
  Button,
  Stack,
  Text,
  Box,
  TextInput,
  Alert,
  Paper,
} from "@mantine/core";
import {
  IconX,
  IconTrash,
  IconFileDescription,
  IconUserCircle,
  IconAlertTriangle,
} from "@tabler/icons";
import { useTemplateStore } from "../../../stores/Template/Template.store";

// Simplified props - only what can't come from global store
interface DeleteRestaurantModalProps {
  onDeleteRestaurant: () => Promise<void>;
}

export const DeleteRestaurantModal = React.memo(
  ({ onDeleteRestaurant }: DeleteRestaurantModalProps) => {
    // Get state and actions directly from the store
    const { deleteModalState, closeDeleteModal, userInput, setUserInput } = useTemplateStore(
      (state) => ({
        deleteModalState: state.deleteModalState,
        closeDeleteModal: state.closeDeleteModal,
        userInput: state.userInput,
        setUserInput: state.setUserInput,
      })
    );

    const isInputValid = userInput === deleteModalState.restaurantName;
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
      setIsDeleting(true);
      try {
        await onDeleteRestaurant();
        closeDeleteModal();
      } finally {
        setIsDeleting(false);
      }
    };

    return (
      <Modal
        opened={deleteModalState.isOpen}
        onClose={closeDeleteModal}
        withCloseButton={false}
        centered
        size="md"
        radius="lg"
        overlayBlur={3}
        overlayOpacity={0.55}
        styles={{ modal: { padding: 0, borderRadius: 24 } }}
      >
        <Box p={0} bg="#fff" style={{ borderRadius: 24, overflow: "hidden" }}>
          {/* Top Icon and Close */}
          <Box pos="relative" pt={32} pb={8}>
            <Box style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Box className="icon-container">
                <IconTrash size={32} color="#e11d48" />
              </Box>
            </Box>
            <ActionIcon
              size="lg"
              variant="subtle"
              color="gray"
              onClick={closeDeleteModal}
              style={{ position: "absolute", top: 16, right: 16 }}
            >
              <IconX size={20} />
            </ActionIcon>
          </Box>

          {/* Title */}
          <Text align="center" size="xl" weight={700} color="#1e293b" mb={8}>
            Delete Restaurant
          </Text>

          {/* Restaurant Info Card */}
          <Paper
            radius="md"
            shadow="xs"
            p="md"
            mx="auto"
            mb={20}
            style={{
              background: "#f8fafc",
              maxWidth: 340,
              marginTop: 8,
              marginBottom: 20,
            }}
          >
            <Text size="md" weight={700} color="#1e293b" mb={4}>
              {deleteModalState.restaurantName}
            </Text>
            <Group spacing="md">
              <Group spacing={4}>
                <IconFileDescription size={16} color="#64748b" />
                <Text size="sm" color="#64748b">
                  {deleteModalState.menuCount} menus
                </Text>
              </Group>
              <Group spacing={4}>
                <IconUserCircle size={16} color="#64748b" />
                <Text size="sm" color="#64748b">
                  {deleteModalState.userCount} user{deleteModalState.userCount === 1 ? "" : "s"}
                </Text>
              </Group>
            </Group>
          </Paper>

          {/* Warning Alert */}
          <Box px={24} mb={20}>
            <Alert
              icon={<IconAlertTriangle size={18} />}
              title={<span style={{ fontWeight: 700 }}>This action cannot be undone</span>}
              color="yellow"
              radius="md"
              style={{ background: "#fffbea", border: "1px solid #fde68a" }}
            >
              <Text size="sm" color="#92400e">
                This will permanently delete the restaurant and all associated data including menus,
                users, and settings.
              </Text>
            </Alert>
          </Box>

          {/* Confirmation Section */}
          <Box px={24} mb={0}>
            <Stack spacing={12}>
              <Text size="sm" weight={600} color="#334155">
                To confirm deletion, please type the restaurant name:
              </Text>
              <Box
                style={{
                  border: "1.5px dashed #fca5a5",
                  background: "#fff1f2",
                  borderRadius: 10,
                  padding: "8px 14px",
                  fontFamily: "monospace",
                  color: "#e11d48",
                  fontWeight: 600,
                  fontSize: 16,
                  marginBottom: 2,
                  letterSpacing: 1,
                  display: "inline-block",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                {deleteModalState.restaurantName}
              </Box>
              <TextInput
                placeholder="Enter restaurant name to confirm"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                size="md"
                radius="md"
                styles={{
                  input: {
                    borderColor: isInputValid ? "#10b981" : "#3b82f6",
                    borderWidth: 2,
                    fontSize: 16,
                    fontWeight: 500,
                    background: "#fff",
                  },
                }}
              />
              {userInput && !isInputValid && (
                <Text size="xs" color="#e11d48" weight={500}>
                  Restaurant name does not match
                </Text>
              )}
            </Stack>
          </Box>

          {/* Footer Button */}
          <Group grow spacing={0} px={24} py={24} mt={8} style={{ borderTop: "1px solid #f1f5f9" }}>
            <Button
              color="red"
              onClick={handleDelete}
              disabled={!isInputValid || isDeleting}
              size="md"
              radius="xl"
              leftIcon={<IconTrash size={18} />}
              style={{ fontWeight: 600 }}
              fullWidth
              loading={isDeleting}
              sx={{
                "&:disabled": {
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  opacity: 0.7,
                  cursor: "not-allowed",
                },
              }}
            >
              Delete Restaurant
            </Button>
          </Group>
        </Box>
      </Modal>
    );
  }
);

DeleteRestaurantModal.displayName = "DeleteRestaurantModal";

export default DeleteRestaurantModal;
