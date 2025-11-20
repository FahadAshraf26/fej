// RemoveUserModal.tsx
import React from "react";
import {
  Text,
  Box,
  Avatar,
  Group,
  Alert,
  Stack,
  createStyles,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons";
import CommonModal from "../../components/CommonComponents/Modal";
import { IUserDetails } from "../../interfaces";

interface RemoveUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: IUserDetails | null;
  onRemove: () => Promise<void>;
  isLoading: boolean;
}

const useStyles = createStyles((theme) => ({
  userInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[6]
        : theme.colors.gray[0],
    marginBottom: theme.spacing.md,
  },
  avatar: {
    backgroundColor: theme.colors.red[5],
    color: theme.white,
  },
  alert: {
    marginTop: theme.spacing.md,
  },
}));

const RemoveUserModal: React.FC<RemoveUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onRemove,
  isLoading,
}) => {
  const { classes } = useStyles();

  if (!user) return null;

  // Extract the first letter from email for avatar fallback
  const firstLetter = user.email ? user.email.charAt(0).toUpperCase() : "?";

  return (
    <CommonModal
      title="Remove User"
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onRemove}
      loading={isLoading}
      submitLabel="Remove"
      submitLabelColor="red"
    >
      <Box>
        <Stack spacing="sm" align="center">
          <div className={classes.userInfo}>
            <Group spacing="md" position="center">
              <Avatar size="lg" radius="xl" className={classes.avatar}>
                {firstLetter}
              </Avatar>
              <div>
                <Text size="sm" color="dimmed">
                  {user.email}
                </Text>
              </div>
            </Group>
          </div>

          <Text size="md" align="center">
            Are you sure you want to remove this user?
          </Text>

          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            className={classes.alert}
          >
            This action cannot be undone. The user will lose access to the
            system immediately.
          </Alert>
        </Stack>
      </Box>
    </CommonModal>
  );
};

export default RemoveUserModal;
