import { Alert, Group, Text, Box, Select, Button } from "@mantine/core";
import { useUserContext } from "@Context/UserContext";
import { useState } from "react";
import { IconChevronUp, IconDatabase } from "@tabler/icons";
import { isWhitelistedUser } from "@Config/whitelist";
import theme from "@Config/theme";
import { toast } from "react-toastify";

const TAB_HEIGHT = 28;

const roleOptions = [
  { value: "flapjack", label: "Flapjack" },
  { value: "owner", label: "Owner" },
  { value: "user", label: "User" },
];

const WhitelistBanner = () => {
  const { user } = useUserContext();
  const [isMinimized, setIsMinimized] = useState(true);
  const [selectedRole, setSelectedRole] = useState(user?.role || "user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user?.email || !isWhitelistedUser(user.email)) {
    return null;
  }

  const handleUpdateRole = async () => {
    setLoading(true);
    setError("");
    try {
      await fetch("/api/users/updateRole", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          role: selectedRole,
        }),
      });
      toast.success("Role updated successfully!", {
        position: "top-right",
        closeButton: false,
        hideProgressBar: true,
        autoClose: 1000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const handleMinimizeToggle = () => {
    setIsMinimized((v) => !v);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          position: "fixed",
          bottom: isMinimized ? 0 : "71px",
          right: 24,
          zIndex: 1100,
          backgroundColor: theme.colors.indigo[5],
          padding: "1px 6px",
          borderRadius: "8px 8px 0 0",
          cursor: "pointer",
          boxShadow: "0 -1px 6px rgba(0,0,0,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
          transition: "background 0.2s, bottom 0.3s",
          "&:hover": {
            backgroundColor: theme.colors.indigo[6],
          },
        }}
        onClick={handleMinimizeToggle}
      >
        <IconChevronUp
          size={18}
          color="white"
          style={{
            transform: isMinimized ? "none" : "rotate(180deg)",
            transition: "transform 0.2s",
          }}
        />
      </Box>
      <Alert
        variant="light"
        styles={{
          root: {
            borderRadius: "14px 14px 0 0",
            padding: "12px 20px 12px 24px",
            boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
            transition: "transform 0.3s ease",
            transform: isMinimized ? `translateY(100%)` : "translateY(0)",
            willChange: "transform",
            position: "relative",
            minHeight: TAB_HEIGHT,
            pointerEvents: isMinimized ? "none" : "auto",
            background: `linear-gradient(90deg, ${theme.colors.blue[0]}, ${theme.colors.teal[0]})`,
            border: `1px solid ${theme.colors.blue[2]}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          },
        }}
      >
        <Group position="apart" spacing="md" align="center" noWrap>
          <Box>
            <Text color={theme.colors.blue[8]} size="sm" weight={600} mb={2}>
              Update your role
            </Text>
            <Text color={theme.colors.gray[7]} size="xs" mb={4}>
              Select your role below. This will affect your access and permissions in the app.
            </Text>
          </Box>
          <Group spacing={4} align="center" noWrap>
            <Select
              data={roleOptions}
              value={selectedRole}
              onChange={(val) => setSelectedRole(val || "user")}
              size="sm"
              sx={{
                minWidth: 120,
                background: theme.colors.blue[0],
                borderRadius: 6,
                border: `1px solid ${theme.colors.blue[2]}`,
                fontWeight: 500,
              }}
              styles={{
                input: {
                  color: theme.colors.blue[8],
                  fontWeight: 500,
                  background: theme.colors.blue[0],
                  borderRadius: 6,
                  border: `1px solid ${theme.colors.blue[2]}`,
                },
                dropdown: {
                  borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                },
                item: {
                  fontWeight: 500,
                  color: theme.colors.blue[8],
                  "&[data-selected]": {
                    backgroundColor: theme.colors.blue[1],
                    color: theme.colors.blue[8],
                  },
                  "&[data-selected]:hover": {
                    backgroundColor: theme.colors.blue[2],
                    color: theme.colors.blue[8],
                  },
                  "&:hover": {
                    backgroundColor: theme.colors.blue[2],
                    color: theme.colors.blue[8],
                  },
                },
              }}
              disabled={loading}
              withinPortal
            />
            <Button
              size="sm"
              color="blue"
              onClick={handleUpdateRole}
              loading={loading}
              leftIcon={<IconDatabase size={16} />}
              sx={{ marginLeft: 6, borderRadius: 6, fontWeight: 600 }}
              disabled={selectedRole === user.role || loading}
            >
              Update
            </Button>

            {error && (
              <Text color="red" size="xs">
                {error}
              </Text>
            )}
          </Group>
        </Group>
      </Alert>
    </Box>
  );
};

export default WhitelistBanner;
