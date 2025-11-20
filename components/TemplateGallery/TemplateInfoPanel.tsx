import { useState, useEffect } from "react";
import { Box, Text, Flex, Collapse, Group, ActionIcon } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons";
import theme from "config/theme";

// Collapsible Templates Info Component
export const CollapsibleTemplatesInfo = () => {
  // Initialize state from localStorage or default to expanded (true)
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved preference on initial render
  useEffect(() => {
    const savedState = localStorage.getItem("templatesInfoExpanded");
    if (savedState !== null) {
      setIsExpanded(savedState === "true");
    } else {
      setIsExpanded(true);
    }
  }, []);

  // Save preference when state changes
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem("templatesInfoExpanded", newState.toString());
  };

  return (
    <Box mb="xl">
      <Box
        sx={(theme) => ({
          background: isExpanded ? "#FFF8EE" : "#FFF8EE99",
          border: `1px solid ${theme.colors.orange[3]}`,
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          overflow: "hidden",
          cursor: isExpanded ? "default" : "pointer",
        })}
      >
        {/* Clickable header area - always visible */}
        <Group
          position="apart"
          p="md"
          onClick={!isExpanded ? toggleExpanded : undefined}
          sx={{
            borderBottom: isExpanded
              ? `1px solid ${theme.colors.orange[2]}`
              : "none",
            cursor: isExpanded ? "default" : "pointer",
          }}
        >
          <Text fw={700} color="orange.7">
            ⚠️ Important Templates Information
          </Text>
          <ActionIcon
            variant="subtle"
            color="orange"
            onClick={toggleExpanded}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronDown size={16} />
            )}
          </ActionIcon>
        </Group>

        {/* Collapsible content */}
        <Collapse in={isExpanded}>
          <Box p="md" pt="sm">
            <Text mb="md">
              The Templates tab contains <b>two types</b> of menu templates:
            </Text>

            <Flex align="flex-start" mb="md">
              <Box
                mr="md"
                mt="xs"
                sx={{
                  minWidth: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: theme.colors.orange[5],
                }}
              />
              <Text>
                <b>Draft Menus:</b> Only visible to Flapjack users
              </Text>
            </Flex>

            <Flex align="flex-start" mb="md">
              <Box
                mr="md"
                mt="xs"
                sx={{
                  minWidth: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: theme.colors.green[5],
                }}
              />
              <Text>
                <b>Live Menus:</b>{" "}
                <span
                  style={{ backgroundColor: "#FFEEDB", padding: "2px 4px" }}
                >
                  Visible to ALL users
                </span>
                , even those without an account
              </Text>
            </Flex>

            <Text fw={500} color="gray.8" mb="md">
              Please be cautious when publishing menus as they will be publicly
              accessible. These templates are intended as starting points for
              customer menus.
            </Text>

            <Text color="gray.7" fz="sm" style={{ fontStyle: "italic" }}>
              To add a menu to this tab, either transfer it to the Flapjack
              restaurant or select the Flapjack restaurant when creating a new
              menu.
            </Text>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

// Collapsible Customer Menus Info Component
export const CollapsibleCustomerMenusInfo = () => {
  // Initialize state from localStorage or default to expanded (true)
  const [isExpanded, setIsExpanded] = useState(false);

  // Load saved preference on initial render
  useEffect(() => {
    const savedState = localStorage.getItem("customerMenusInfoExpanded");
    if (savedState !== null) {
      setIsExpanded(savedState === "true");
    } else {
      setIsExpanded(true);
    }
  }, []);

  // Save preference when state changes
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem("customerMenusInfoExpanded", newState.toString());
  };

  return (
    <Box mb="xl">
      <Box
        sx={(theme) => ({
          background: isExpanded ? "#EDF2FF" : "#EDF2FF99",
          border: `1px solid ${theme.colors.blue[3]}`,
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          overflow: "hidden",
          cursor: isExpanded ? "default" : "pointer",
        })}
      >
        {/* Clickable header area - always visible */}
        <Group
          position="apart"
          p="md"
          onClick={!isExpanded ? toggleExpanded : undefined}
          sx={{
            borderBottom: isExpanded
              ? `1px solid ${theme.colors.blue[2]}`
              : "none",
            cursor: isExpanded ? "default" : "pointer",
          }}
        >
          <Text fw={700} color="blue.7">
            📋 Customer Menus Overview
          </Text>
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={toggleExpanded}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronDown size={16} />
            )}
          </ActionIcon>
        </Group>

        {/* Collapsible content */}
        <Collapse in={isExpanded}>
          <Box p="md" pt="sm">
            <Text mb="md">
              The &quot;Customer Menus&quot; tab displays all menus that are
              either in progress or already delivered to customers.
            </Text>

            <Flex align="flex-start" mb="md">
              <Box
                mr="md"
                mt="xs"
                sx={{
                  minWidth: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: theme.colors.green[5],
                }}
              />
              <Text>
                <b>Live Menus:</b>{" "}
                <span
                  style={{
                    backgroundColor: "#e7ecff",
                    padding: "2px 4px",
                    color: "#3b5bdb",
                  }}
                >
                  Visible to customers
                </span>{" "}
                when they log in
              </Text>
            </Flex>

            <Box
              ml="xl"
              mb="md"
              p="sm"
              sx={(theme) => ({
                borderLeft: `3px solid ${theme.colors.red[5]}`,
                backgroundColor: theme.colors.red[0],
              })}
            >
              <Text fw={600} color="red.8">
                ⚠️ Please be careful when editing or modifying live menus!
              </Text>
            </Box>

            <Flex align="flex-start" mb="md">
              <Box
                mr="md"
                mt="xs"
                sx={{
                  minWidth: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: theme.colors.orange[5],
                }}
              />
              <Text>
                <b>Draft Menus:</b> Only visible to Flapjack users
              </Text>
            </Flex>

            <Text color="gray.7" fz="sm" style={{ fontStyle: "italic" }}>
              To add a menu here, it must be assigned to a restaurant either
              when creating the menu or by transferring the menu to the
              corresponding restaurant.
            </Text>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};
