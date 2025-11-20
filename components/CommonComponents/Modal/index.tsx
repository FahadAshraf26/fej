import { Box, Modal, Title, Group, Button, createStyles } from "@mantine/core";
import { useEffect, useRef, useCallback } from "react";

const useStyles = createStyles((theme) => ({
  modal: {
    ".mantine-Modal-header": {
      marginBottom: theme.spacing.xs,
      borderBottom: `1px solid ${
        theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
      }`,
      paddingBottom: theme.spacing.xs,
      textAlign: "center",
      paddingRight: 0,
      marginRight: 0,
    },
    ".mantine-Modal-title": {
      fontWeight: 600,
      fontSize: theme.fontSizes.lg,
      textAlign: "center",
      width: "100%",
      margin: 0,
      padding: 0,
    },
    ".mantine-Modal-body": {
      padding: `0 ${theme.spacing.md}px ${theme.spacing.xs}px`,
    },
    ".mantine-Modal-close": {
      color: theme.colors.orange[6],
      "&:hover": {
        backgroundColor: theme.fn.rgba(theme.colors.orange[6], 0.1),
      },
    },
    "&:not(.mantine-Modal-withCloseButton) .mantine-Modal-header": {
      paddingRight: 0,
      "& .mantine-Modal-title": {
        marginRight: 0,
        paddingRight: 0,
      },
    },
  },
  content: {
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    margin: 0,
  },
  footer: {
    marginTop: theme.spacing.sm,
    display: "flex",
    justifyContent: "flex-end",
    borderTop: `1px solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
    paddingTop: theme.spacing.xs,
  },
}));

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string | React.ReactNode;
  maxHeight?: string;
  submitLabel?: string;
  submitLabelColor?: string;
  dataTestId?: string;
  onSubmit?: () => void;
  loading?: boolean;
  hideFooter?: boolean;
  disabled?: boolean;
  size?: string;
  withCloseButton?: boolean;
}

const CommonModal = ({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = "auto",
  submitLabel = "Update",
  submitLabelColor = "orange",
  dataTestId = "",
  onSubmit,
  loading = false,
  hideFooter = false,
  disabled = false,
  size = "md",
  withCloseButton = true,
}: Props) => {
  const { classes } = useStyles();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Memoize the close handler to prevent unnecessary re-renders
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoize the submit handler
  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    } else {
      handleClose();
    }
  }, [onSubmit, handleClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (isInputField) {
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" || e.key === "v" || e.key === "a" || e.key === "x")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      centered
      title={
        typeof title === "string" ? (
          <Title order={4} color="#2e2e2e">
            {title}
          </Title>
        ) : (
          title
        )
      }
      classNames={{ modal: classes.modal }}
      size={size}
      closeButtonLabel={`Close dialog`}
      trapFocus={true}
      transition="fade"
      transitionDuration={200}
      overlayOpacity={0.55}
      overlayBlur={3}
      withCloseButton={withCloseButton}
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      withinPortal={true}
    >
      <div ref={modalRef} tabIndex={-1}>
        <Box className={classes.content} style={{ maxHeight }}>
          {children}
        </Box>

        {!hideFooter && (
          <Group className={classes.footer} position="right" spacing="xs">
            <Button variant="subtle" onClick={handleClose} color="gray" disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="filled"
              onClick={handleSubmit}
              loading={loading}
              disabled={disabled}
              color={submitLabelColor}
              data-test-id={dataTestId}
            >
              {submitLabel}
            </Button>
          </Group>
        )}
      </div>
    </Modal>
  );
};

export default CommonModal;
