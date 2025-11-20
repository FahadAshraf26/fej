// @ts-nocheck
import {
  Avatar,
  Badge,
  Table,
  Group,
  Text,
  ActionIcon,
  Anchor,
  ScrollArea,
  useMantineTheme,
  Paper,
  UnstyledButton,
  Box,
  Stack,
} from "@mantine/core";
import {
  IconPencil,
  IconTrash,
  IconUser,
  IconBuildingSkyscraper,
  IconChevronRight,
  IconDatabaseOff,
  IconUserShield,
} from "@tabler/icons";
import { IUserDetails } from "../../interfaces";
import { useUser } from "../../hooks";
import _ from "lodash";
import { useState } from "react";

interface UsersTableProps {
  data: IUserDetails[];
  onDelete?: (user: IUserDetails) => void;
  onEdit?: (user: IUserDetails) => void;
  hideAction?: boolean;
  resturantsOptions?: any;
  onRowClick?: (user: IUserDetails) => void;
  expandedRestaurants?: string[];
  onToggleExpand?: (restaurantId: string) => void;
  isDashboard?: boolean;
  handleAction?: (action: () => void) => void;
}

export function UsersTable({
  data,
  onDelete,
  onEdit,
  hideAction = false,
  resturantsOptions,
  onRowClick,
  expandedRestaurants = [],
  onToggleExpand,
  isDashboard = false,
  handleAction,
}: UsersTableProps) {
  const user = useUser();
  const theme = useMantineTheme();

  const restaurantLookup = _.keyBy(resturantsOptions, "value");
  const groupedByRestaurant = _.groupBy(data, "restaurant_id");

  const toggleRestaurant = (restaurantId: string) => {
    onToggleExpand?.(restaurantId);
  };

  const handleClick = (item: IUserDetails, isOwner: boolean, hasUsers: boolean) => {
    if (isDashboard && isOwner && hasUsers) {
      toggleRestaurant(item.restaurant_id);
    }
  };
  const renderRow = (item: IUserDetails, isOwner = false, isNested = false) => {
    const getRestaurant = restaurantLookup[item.restaurant_id];
    const isExpanded = expandedRestaurants.includes(item.restaurant_id);
    const regularUsers =
      groupedByRestaurant[item.restaurant_id]?.filter((u) => u.role !== "owner") || [];
    const hasUsers = regularUsers.length > 0;

    return (
      <tr
        key={item.id}
        style={{
          cursor: isDashboard && isOwner ? "pointer" : "default",
          backgroundColor:
            isExpanded && isOwner
              ? theme.fn.rgba(theme.colors.orange[1], 0.3)
              : isNested
              ? theme.fn.rgba(theme.colors.orange[0], 0.5)
              : "white",
          borderLeft: isExpanded && isOwner ? `2px solid ${theme.colors.orange[5]}` : "none",
          transition: "all 0.2s ease",
          ...(isExpanded && isOwner
            ? {
                position: "relative",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                zIndex: 1,
              }
            : {}),
          ...(isNested && isExpanded
            ? {
                position: "relative",
                boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)",
                marginTop: "2px",
                marginBottom: "2px",
              }
            : {}),
        }}
        onClick={() => !isNested && onRowClick?.(item)}
      >
        <td>
          <Group spacing="sm" noWrap position="left">
            <Box
              w={20}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isDashboard && isOwner && hasUsers && (
                <UnstyledButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick(item, isOwner, hasUsers);
                  }}
                  sx={{
                    transition: "transform 0.2s ease",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconChevronRight size="1rem" stroke={1.5} />
                </UnstyledButton>
              )}
            </Box>
            {isOwner ? (
              <IconBuildingSkyscraper size="1.2rem" stroke={1.5} color={theme.colors.green[5]} />
            ) : item.role === "flapjack" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.colors.orange[5]}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icons-tabler-outline icon-tabler-user-shield"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M6 21v-2a4 4 0 0 1 4 -4h2" />
                <path d="M22 16c0 4 -2.5 6 -3.5 6s-3.5 -2 -3.5 -6c1 0 2.5 -.5 3.5 -1.5c1 1 2.5 1.5 3.5 1.5z" />
                <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
              </svg>
            ) : (
              // <Avatar size={30} radius="xl" color={theme.colors.blue[3]} />
              <IconUser size="1.2rem" stroke={1.5} color={theme.colors.blue[3]} />
            )}
          </Group>
        </td>
        <td>
          <Text fz="sm" c="dimmed">
            {item.phone}
          </Text>
        </td>
        <td>
          <Text fz="sm">{item.email}</Text>
        </td>
        {resturantsOptions && (
          <td>
            <Text fz="sm" c="dimmed">
              {getRestaurant?.label}
            </Text>
          </td>
        )}
        <td>
          <Text fz="sm" c="dimmed">
            {item.role}
          </Text>
        </td>
        {/* <td> */}
        {/* {isOwner && (
            <Badge
              color={item.subscriptionActive ? "green" : "red"}
              variant="light"
            >
              {item.subscriptionActive ? "Active" : "Inactive"}
            </Badge>
          )} */}
        {/* </td> */}
        {!hideAction && (
          <td>
            <Group spacing={0} position="right">
              {onEdit && (
                <ActionIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    if (handleAction) {
                      handleAction(() => onEdit(item));
                    } else {
                      onEdit(item);
                    }
                  }}
                >
                  <IconPencil size="1rem" stroke={1.5} color={theme.colors.blue[3]} />
                </ActionIcon>
              )}
              {onDelete && (
                <ActionIcon
                  color={item?.id === user?.id ? "gray" : "red"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item?.id !== user?.id) {
                      if (handleAction) {
                        handleAction(() => onDelete(item));
                      } else {
                        onDelete(item);
                      }
                    }
                  }}
                >
                  <IconTrash size="1rem" stroke={1.5} />
                </ActionIcon>
              )}
            </Group>
          </td>
        )}
      </tr>
    );
  };

  const rows = Object.entries(groupedByRestaurant).flatMap(([restaurantId, users]) => {
    const owners = users.filter((u) => u.role === "owner");
    const regularUsers = users.filter((u) => u.role !== "owner");
    const isExpanded = expandedRestaurants.includes(restaurantId);

    if (isDashboard) {
      const result = [...owners.map((owner) => renderRow(owner, true))];
      if (isExpanded) {
        result.push(...regularUsers.map((user) => renderRow(user, false, true)));
      }
      return result;
    } else {
      // Show all rows without expansion logic for single restaurant view
      return [
        ...owners.map((owner) => renderRow(owner, true)),
        ...regularUsers.map((user) => renderRow(user, false, false)),
      ];
    }
  });

  return (
    <Paper shadow="xs">
      <ScrollArea.Autosize mah="80vh">
        <Box
          sx={{
            position: "relative",
            minWidth: "100%",
          }}
        >
          <Table
            verticalSpacing="sm"
            highlightOnHover
            sx={(theme) => ({
              minWidth: "800px",
              position: "relative",
              borderCollapse: "separate",
              borderSpacing: 0,
              "& th": {
                backgroundColor: "white",
                border: "none",
                borderBottom: `1px solid ${theme.colors.gray[3]}`,
                padding: "12px 16px",
              },
              "& td": {
                padding: "12px 16px",
                borderBottom: `1px solid ${theme.colors.gray[2]}`,
              },
              "& tr": {
                transition: "all 0.2s ease",
              },
              "& tbody tr:hover": {
                backgroundColor: theme.fn.rgba(theme.colors.orange[0], 0.2),
              },
            })}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                backgroundColor: "white",
                zIndex: 2,
                width: "100%",
              }}
            >
              <tr>
                <th style={{ width: "80px", minWidth: "80px" }}></th>
                <th style={{ width: "150px", minWidth: "150px" }}>Phone</th>
                <th style={{ width: "250px", minWidth: "250px" }}>Email</th>
                {isDashboard && <th style={{ width: "200px", minWidth: "200px" }}>Restaurant</th>}
                <th style={{ width: "100px", minWidth: "100px" }}>Role</th>
                {/* <th style={{ width: "120px", minWidth: "120px" }}>
                  Subscription
                </th> */}
                {!hideAction && <th style={{ width: "80px", minWidth: "80px" }}></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <tr>
                  <td
                    colSpan={hideAction ? 6 : 7}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: theme.colors.gray[6],
                    }}
                  >
                    <Stack align="center" spacing="sm">
                      <IconDatabaseOff size={40} stroke={1.5} color={theme.colors.gray[5]} />
                      <Text size="sm" color="dimmed">
                        No data available
                      </Text>
                    </Stack>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Box>
      </ScrollArea.Autosize>
    </Paper>
  );
}
