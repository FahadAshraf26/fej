import {
  Table,
  Group,
  Text,
  ActionIcon,
  ScrollArea,
  useMantineTheme,
  Box,
  TextInput,
  Button,
  Flex,
  Stack,
  Paper,
  Card,
  Avatar,
  Badge,
  Alert,
  Divider,
} from "@mantine/core";
import {
  IconDatabaseOff,
  IconPencil,
  IconTrash,
  IconMapPin,
  IconPlus,
  IconAlertCircle,
  IconInfoCircle,
  IconLocation,
  IconFolder,
  IconFolderPlus,
  IconEdit,
} from "@tabler/icons";
import { useState } from "react";
import { useForm } from "@mantine/form";
import { supabase } from "@database/client.connection";
import { IRestaurantList } from "interfaces/IRestaurantList";
import CommonModal from "@Components/CommonComponents/Modal";
import { APP_CONFIG } from "@Contants/app";

interface LocationTableProps {
  data: IRestaurantList;
  handleAction?: (action: () => void) => void;
}

type LocationData = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  country?: string | null;
  restaurantId: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type ModalState = {
  type: "add" | "edit" | "remove" | null;
  locationData: LocationData | null;
};

export function RestaurantLocationTable({ data, handleAction }: LocationTableProps) {
  // Filter out the "Default" location
  const filteredLocations =
    data?.locations?.filter((loc) => loc.name !== APP_CONFIG.LOCATION.DEFAULT) || [];
  const defaultLocation =
    data?.locations?.find((loc) => loc.name === APP_CONFIG.LOCATION.DEFAULT) || null;

  const [locations, setLocations] = useState<LocationData[]>(filteredLocations);
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    locationData: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const theme = useMantineTheme();

  // Form for add/edit modal
  const locationForm = useForm({
    initialValues: {
      name: "",
    },
    validate: {
      name: (value) => {
        if (!value.trim()) return "Location name is required";
        if (value.trim().length < 2) return "Location name must be at least 2 characters";
        if (value.trim().length > 50) return "Location name must be less than 50 characters";
        return null;
      },
    },
  });

  const closeModal = () => {
    setModalState({ type: null, locationData: null });
    locationForm.reset();
    setIsLoading(false);
  };

  const isDefaultLocation = (name: string) => name === APP_CONFIG.LOCATION.DEFAULT;

  const rows = locations.map((item: LocationData) => (
    <tr key={item.id}>
      <td>
        <Group spacing="sm">
          <IconMapPin size={18} color={theme.colors.gray[6]} />
          <Text size="sm" color="dimmed">
            {isDefaultLocation(item.name) ? APP_CONFIG.LOCATION.REPLACEMENT : item.name}
          </Text>
        </Group>
      </td>
      <td>
        <Group spacing={8} position="right">
          <ActionIcon
            disabled={isDefaultLocation(item.name)}
            size="sm"
            variant="light"
            color="blue"
            onClick={() => {
              if (handleAction) {
                handleAction(() => {
                  setModalState({ type: "edit", locationData: item });
                  locationForm.setValues({ name: item.name });
                });
              } else {
                setModalState({ type: "edit", locationData: item });
                locationForm.setValues({ name: item.name });
              }
            }}
          >
            <IconPencil size="1rem" />
          </ActionIcon>
          <ActionIcon
            disabled={isDefaultLocation(item.name)}
            size="sm"
            variant="light"
            color="red"
            onClick={() => {
              if (handleAction) {
                handleAction(() => {
                  setModalState({ type: "remove", locationData: item });
                });
              } else {
                setModalState({ type: "remove", locationData: item });
              }
            }}
          >
            <IconTrash size="1rem" />
          </ActionIcon>
        </Group>
      </td>
    </tr>
  ));

  // Database operations remain the same...
  async function addLocation(locationName: string): Promise<LocationData | null> {
    try {
      const { data: responseData, error: responseError } = await supabase
        .from("locations")
        .insert({
          name: locationName,
          restaurantId: data?.id,
        })
        .select()
        .single();

      if (responseError) throw responseError;
      return responseData;
    } catch (error) {
      console.error("Error adding location:", error);
      return null;
    }
  }

  async function updateLocation(
    locationId: string,
    locationName: string
  ): Promise<LocationData | null> {
    try {
      const { data: responseData, error: responseError } = await supabase
        .from("locations")
        .update({
          name: locationName,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", locationId)
        .select()
        .single();

      if (responseError) throw responseError;
      return responseData;
    } catch (error) {
      console.error("Error updating location:", error);
      return null;
    }
  }

  async function deleteLocation(locationId: string): Promise<boolean> {
    try {
      const { error: responseError } = await supabase
        .from("locations")
        .delete()
        .eq("id", locationId);

      if (responseError) throw responseError;
      return true;
    } catch (error) {
      console.error("Error deleting location:", error);
      return false;
    }
  }

  const handleLocationUpdate = async (values: { name: string }) => {
    if (!modalState.locationData && modalState.type !== "add") return;

    if (handleAction) {
      handleAction(async () => {
        setIsLoading(true);
        try {
          let result: LocationData | null = null;

          if (modalState.type === "add") {
            result = await addLocation(values.name);
            if (result) {
              setLocations((prev) => [...prev, result!]);
              closeModal();
            }
          } else if (modalState.type === "edit" && modalState.locationData) {
            result = await updateLocation(modalState.locationData!.id, values.name);
            if (result) {
              setLocations((prev) =>
                prev.map((loc) =>
                  loc.id === modalState.locationData!.id ? { ...loc, name: values.name } : loc
                )
              );
              closeModal();
            }
          }
        } catch (error) {
          console.error("Error updating location:", error);
        } finally {
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(true);
      try {
        let result: LocationData | null = null;

        if (modalState.type === "add") {
          result = await addLocation(values.name);
          if (result) {
            setLocations((prev) => [...prev, result!]);
            closeModal();
          }
        } else if (modalState.type === "edit" && modalState.locationData) {
          result = await updateLocation(modalState.locationData!.id, values.name);
          if (result) {
            setLocations((prev) =>
              prev.map((loc) =>
                loc.id === modalState.locationData!.id ? { ...loc, name: values.name } : loc
              )
            );
            closeModal();
          }
        }
      } catch (error) {
        console.error("Error updating location:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRemoveLocation = async () => {
    if (!modalState.locationData || isDefaultLocation(modalState.locationData.name)) return;

    if (handleAction) {
      handleAction(async () => {
        setIsLoading(true);
        try {
          // Update templates to use default location before deleting
          await supabase
            .from("templates")
            .update({ location: defaultLocation?.id })
            .eq("location", modalState.locationData!.id)
            .eq("restaurant_id", data?.id);

          const success = await deleteLocation(modalState.locationData!.id);
          if (success) {
            setLocations((prev) => prev.filter((loc) => loc.id !== modalState.locationData!.id));
            closeModal();
          }
        } catch (error) {
          console.error("Error removing location:", error);
        } finally {
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(true);
      try {
        // Update templates to use default location before deleting
        await supabase
          .from("templates")
          .update({ location: defaultLocation?.id })
          .eq("location", modalState.locationData!.id)
          .eq("restaurant_id", data?.id);

        const success = await deleteLocation(modalState.locationData!.id);
        if (success) {
          setLocations((prev) => prev.filter((loc) => loc.id !== modalState.locationData!.id));
          closeModal();
        }
      } catch (error) {
        console.error("Error removing location:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Enhanced modal titles with better icons and styling
  const getModalTitle = () => {
    switch (modalState.type) {
      case "add":
        return (
          <Flex align="center" gap="sm">
            <Avatar size="sm" radius="xl" variant="light" color="orange">
              <IconFolderPlus size={16} />
            </Avatar>
            <Text size="lg" fw={600} c="dark">
              Add New Location
            </Text>
          </Flex>
        );
      case "edit":
        return (
          <Flex align="center" gap="sm">
            <Avatar size="sm" radius="xl" variant="light" color="blue">
              <IconEdit size={16} />
            </Avatar>
            <Text size="lg" fw={600} c="dark">
              Edit Location
            </Text>
          </Flex>
        );
      case "remove":
        return (
          <Flex align="center" gap="sm">
            <Avatar size="sm" radius="xl" variant="light" color="red">
              <IconTrash size={16} />
            </Avatar>
            <Text size="lg" fw={600} c="dark">
              Remove Location
            </Text>
          </Flex>
        );
      default:
        return null;
    }
  };

  return (
    <Paper shadow="xs" p="md" radius="md">
      <Flex justify="flex-end" mb="md">
        <Button
          leftIcon={<IconPlus size={16} />}
          size="sm"
          color="orange"
          onClick={() => {
            if (handleAction) {
              handleAction(() => setModalState({ type: "add", locationData: null }));
            } else {
              setModalState({ type: "add", locationData: null });
            }
          }}
        >
          Add New Location
        </Button>
      </Flex>

      <Card p={0} radius="md">
        <ScrollArea>
          <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
            <tbody>
              {locations.length > 0 ? (
                rows
              ) : (
                <tr>
                  <td colSpan={3}>
                    <Stack align="center" spacing="sm" py="xl">
                      <IconDatabaseOff size={40} stroke={1.5} color={theme.colors.gray[5]} />
                      <Text size="sm" color="dimmed">
                        No location data available
                      </Text>
                    </Stack>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Enhanced Remove Location Modal */}
      <CommonModal
        isOpen={modalState.type === "remove"}
        onClose={closeModal}
        title={getModalTitle()}
        submitLabel="Remove Location"
        submitLabelColor="red"
        onSubmit={handleRemoveLocation}
        loading={isLoading}
        size="md"
      >
        <Stack spacing="lg" p="md">
          {/* Warning Section */}
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Permanent Action"
            color="red"
            variant="light"
            radius="md"
          >
            <Text size="sm">
              This action cannot be undone. The location will be permanently removed from system.
            </Text>
          </Alert>

          {/* Location Details Card */}
          <Paper p="md" radius="md" bg="gray.0" withBorder>
            <Group spacing="md">
              <Avatar size="lg" radius="md" variant="light" color="red">
                <IconLocation size={24} />
              </Avatar>
              <Stack spacing={4}>
                <Text fw={600} size="lg">
                  {modalState.locationData?.name}
                </Text>
                <Badge variant="light" color="gray" size="sm">
                  Location ID: {modalState.locationData?.id.slice(0, 8)}...
                </Badge>
              </Stack>
            </Group>
          </Paper>

          {/* Impact Information */}
          <Alert
            icon={<IconInfoCircle size={16} />}
            title="What happens next?"
            color="cyan"
            variant="light"
            radius="md"
          >
            <Text size="sm">
              Any templates currently using this location will be automatically moved to{" "}
              <Text span fw={600} c="cyan">
                &quot;Other Menus&quot;
              </Text>
              . Your menu(s) items will remain intact.
            </Text>
          </Alert>
        </Stack>
      </CommonModal>

      <CommonModal
        isOpen={modalState.type === "add" || modalState.type === "edit"}
        onClose={closeModal}
        title={getModalTitle()}
        submitLabel={modalState.type === "edit" ? "Update Location" : "Create Location"}
        submitLabelColor="orange"
        onSubmit={locationForm.onSubmit(handleLocationUpdate)}
        loading={isLoading}
        size="md"
      >
        <Stack spacing="lg" p="md">
          {/* Header Section */}
          <Box>
            <Text ta="center" size="md" c="dimmed" mb="xs">
              {modalState.type === "edit"
                ? "Update your location details"
                : "Create a new location for organizing your menus"}
            </Text>

            {modalState.type === "add" && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
                radius="md"
                mt="md"
              >
                <Text size="sm">
                  Locations help you organize menus for different areas, branches, or service types.
                </Text>
              </Alert>
            )}
          </Box>

          {/* Form Section */}
          <Paper p="lg" radius="md" bg="gray.0" withBorder>
            <form>
              <Stack spacing="md">
                <Group spacing="sm" mb="xs">
                  <IconLocation size={18} color={theme.colors.orange[6]} />
                  <Text size="sm" fw={600} c="dark">
                    Location Information
                  </Text>
                </Group>

                <TextInput
                  label="Location Name"
                  placeholder="e.g., Downtown Branch, Takeout Menu, VIP Section"
                  required
                  size="md"
                  radius="md"
                  styles={(theme) => ({
                    label: {
                      fontWeight: 600,
                      marginBottom: 8,
                      color: theme.colors.dark[6],
                    },
                    input: {
                      border: `2px solid ${theme.colors.gray[3]}`,
                      "&:focus": {
                        borderColor: theme.colors.orange[6],
                        boxShadow: `0 0 0 2px ${theme.colors.orange[1]}`,
                      },
                    },
                  })}
                  icon={<IconMapPin size={16} color={theme.colors.gray[6]} />}
                  {...locationForm.getInputProps("name")}
                />

                <Text size="xs" c="dimmed" ta="right">
                  {locationForm.values.name.length}/50 characters
                </Text>
              </Stack>
            </form>
          </Paper>

          {/* Tips Section */}
          <Alert
            icon={<IconInfoCircle size={16} />}
            title="Tips for naming locations"
            color="grape"
            variant="light"
            radius="md"
          >
            <Text size="sm">
              Use clear, descriptive names like &quot;Main Dining&quot;, &quot;Bar Menu&quot;, or
              &quot;Catering Orders&quot; to help your team easily identify different menu
              categories.
            </Text>
          </Alert>
        </Stack>
      </CommonModal>
    </Paper>
  );
}
