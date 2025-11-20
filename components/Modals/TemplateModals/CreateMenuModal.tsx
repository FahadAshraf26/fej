// components/Modals/Forms/CreateMenuModal.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  TextInput,
  Select,
  Textarea,
  Box,
  Stack,
  Group,
  Text,
  Alert,
  Divider,
  ThemeIcon,
  Flex,
  Input,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";
import {
  IconTemplate,
  IconFileDescription,
  IconBuildingStore,
  IconMapPin,
  IconLayoutGrid,
  IconInfoCircle,
  IconAlertCircle,
  IconPlus,
} from "@tabler/icons";
import { supabase } from "@database/client.connection";
import { Location } from "../../../interfaces/IRestaurantList";
import { useUserContext } from "../../../context/UserContext";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { fetchResturantLocations } from "@Hooks/useUser";
import CommonModal from "../../CommonComponents/Modal";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import { APP_CONFIG } from "@Contants/app";

interface CreateMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  basicTemplate?: ITemplateDetails;
}

const CreateMenuModal: React.FC<CreateMenuModalProps> = ({ isOpen, onClose, basicTemplate }) => {
  const router = useRouter();
  const { user } = useUserContext();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [restaurantLocations, setRestaurantLocations] = useState<Location[]>([]);
  const [isRestaurantAutoLayout, setIsRestaurantAutoLayout] = useState<boolean>(false);

  // Get restaurant options from store
  const restaurantsOptions = useInitializeEditor((state) => state.restaurantOptions);
  const setRestaurantsOptions = useInitializeEditor((state) => state.setRestaurantOptions);

  // Initialize form with Mantine's useForm hook
  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      isSubmitting: false,
      selectedRestaurantId: user?.role !== "flapjack" ? user?.restaurant_id : "",
      selectedLocationId: "",
    },
    validate: {
      name: (value) => (value.trim().length === 0 ? "Name is required" : null),
      description: (value) => (!value.trim() ? "Description is required" : null),
      selectedRestaurantId: (value) =>
        !value && user?.role === "flapjack" ? "Restaurant is required" : null,
      selectedLocationId: (value, values) => {
        if (user?.role === "flapjack" && restaurantLocations?.length > 0 && !value) {
          return "Location is required";
        }
        return null;
      },
    },
  });

  // Get selected location object
  const selectedLocation = form.values.selectedLocationId
    ? restaurantLocations.find((loc: Location) => loc.id === form.values.selectedLocationId) || null
    : null;

  // Fetch restaurant locations when restaurant changes
  const fetchLocations = async (restaurantId: string) => {
    try {
      const locations: Location[] = await fetchResturantLocations(restaurantId);
      setRestaurantLocations(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setRestaurantLocations([]);
    }
  };

  // Initialize restaurants and locations
  useEffect(() => {
    const fetchData = async () => {
      // Only load data when modal is open
      if (!isOpen) return;

      try {
        // For non-flapjack users, fetch locations for their restaurant
        if (user?.role !== "flapjack" && user?.restaurant_id) {
          setIsRestaurantAutoLayout(user.restaurant?.isAutoLayout || false);
          await fetchLocations(user.restaurant_id);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        setError("Failed to load initial data. Please try again.");
      }
    };

    fetchData();
  }, [isOpen, user]);

  // Handle restaurant change
  const handleRestaurantChange = (value: string) => {
    form.setFieldValue("selectedRestaurantId", value);
    form.setFieldValue("selectedLocationId", "");

    if (!value) {
      setRestaurantLocations([]);
      return;
    }

    const selectedRestaurant = restaurantsOptions.find((r) => r.value === value);
    if (selectedRestaurant) {
      setIsRestaurantAutoLayout(selectedRestaurant.isAutoLayout);
    }

    fetchLocations(value);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      form.reset();
      form.setValues({
        name: "",
        description: "",
        isSubmitting: false,
        selectedRestaurantId: user?.role !== "flapjack" ? user?.restaurant_id : "",
        selectedLocationId: "",
      });
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: { name: string; description: string }) => {
      if (!basicTemplate) return;

      try {
        form.setFieldValue("isSubmitting", true);
        setIsLoading(true);
        setError("");

        // Generate new content ID
        const newContentId = uuidv4();

        // Copy template content
        const { error: copyError } = await supabase.storage
          .from("templates")
          .copy(basicTemplate.content, newContentId);

        if (copyError) throw copyError;

        // Create new template
        const { data: newTemplate, error: createError } = await supabase
          .from("templates")
          .insert({
            name: values.name,
            description: values.description,
            content: newContentId,
            isGlobal: user?.role === "flapjack" ? false : true,
            restaurant_id: form.values.selectedRestaurantId,
            createdBy: user?.id,
            created_at: new Date(),
            updatedAt: new Date(),
            location: selectedLocation?.name || null,
            locationId: selectedLocation?.id || null,
            isAutoLayout: isRestaurantAutoLayout,
          })
          .select();

        if (createError) throw createError;

        // Create initial page
        const page = basicTemplate.pages?.[0];
        if (!page) {
          throw new Error("Template has no pages");
        }
        const { error: pageError } = await supabase.from("pages").insert({
          ...page,
          id: undefined,
          menu_id: newTemplate[0].id,
          pageUniqueId: uuidv4(),
        });

        if (pageError) throw pageError;

        // Navigate to new menu
        router.push(`/menu/${newTemplate[0].id}`);
        onClose();
      } catch (error) {
        console.error("Error creating menu:", error);
        setError("Failed to create menu. Please try again.");
      } finally {
        setIsLoading(false);
        form.setFieldValue("isSubmitting", false);
      }
    },
    [basicTemplate, form, user, router, onClose, selectedLocation, isRestaurantAutoLayout]
  );

  // Prepare restaurant options
  const sanitizedRestaurantOptions = restaurantsOptions.map((restaurant) => ({
    ...restaurant,
    label: restaurant.label || `Restaurant ${restaurant.value}`,
  }));

  // Prepare location options
  const locationOptions = restaurantLocations.map((location: Location) => ({
    value: location.id,
    label:
      location.name === APP_CONFIG.LOCATION.DEFAULT
        ? APP_CONFIG.LOCATION.REPLACEMENT
        : location.name,
  }));

  // Custom modal title with icon
  const modalTitle = (
    <Flex align="center" gap="xs">
      <IconPlus size={24} color="#ff9800" />
      <Text size="lg" weight={600}>
        Create Menu
      </Text>
    </Flex>
  );

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      submitLabel="Create"
      submitLabelColor="orange"
      onSubmit={form.onSubmit(handleSubmit)}
      loading={form.values.isSubmitting || isLoading}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <Text align="center" size="md" mb="md">
          Create a new menu from this template
        </Text>

        <form>
          <Input.Wrapper
            label="Menu Name"
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
              placeholder="Enter menu name"
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
            placeholder="Provide a brief description of this menu"
          />

          {/* Restaurant Details Section - Only for flapjack role */}
          {user?.role === "flapjack" && (
            <>
              <Divider my="xs" />

              <Box>
                <Text size="sm" weight={600} color="dimmed" mb={4}>
                  RESTAURANT DETAILS
                </Text>

                <Select
                  label="Restaurant"
                  placeholder="Select restaurant"
                  withAsterisk
                  icon={<IconBuildingStore size={16} stroke={1.5} />}
                  data={sanitizedRestaurantOptions}
                  {...form.getInputProps("selectedRestaurantId")}
                  onChange={handleRestaurantChange}
                  searchable
                  clearable
                  nothingFound="No restaurants found"
                  styles={(theme) => ({
                    label: {
                      fontWeight: 500,
                      marginBottom: 6,
                    },
                    input: {
                      "&:focus": {
                        borderColor: theme.colors.orange[6],
                      },
                    },
                    item: {
                      "&[data-selected]": {
                        backgroundColor: theme.colors.orange[6],
                      },
                      "&[data-selected]:hover": {
                        backgroundColor: theme.colors.orange[7],
                      },
                    },
                  })}
                  mb="sm"
                />

                {restaurantLocations?.length > 0 && (
                  <Select
                    label="Location"
                    placeholder="Select location"
                    withAsterisk
                    icon={<IconMapPin size={16} stroke={1.5} />}
                    data={locationOptions}
                    {...form.getInputProps("selectedLocationId")}
                    searchable
                    clearable
                    nothingFound="No locations available"
                    styles={(theme) => ({
                      label: {
                        fontWeight: 500,
                        marginBottom: 6,
                      },
                      input: {
                        "&:focus": {
                          borderColor: theme.colors.orange[6],
                        },
                      },
                      item: {
                        "&[data-selected]": {
                          backgroundColor: theme.colors.orange[6],
                        },
                        "&[data-selected]:hover": {
                          backgroundColor: theme.colors.orange[7],
                        },
                      },
                    })}
                  />
                )}
              </Box>
            </>
          )}

          {/* Restaurant Auto-Layout Badge */}
          {isRestaurantAutoLayout && form.values.selectedRestaurantId && (
            <Group spacing="xs" mt={4}>
              <ThemeIcon size="sm" color="blue" radius="xl">
                <IconLayoutGrid size={12} />
              </ThemeIcon>
              <Text size="sm" color="dimmed">
                Auto Layout is enabled for this menu
              </Text>
            </Group>
          )}

          {/* Error Display */}
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              <Text size="sm">{error}</Text>
            </Alert>
          )}

          {/* For non-flapjack users, show restaurant info */}
          {user?.role !== "flapjack" && (
            <Alert color="blue" icon={<IconInfoCircle size={16} />} variant="light">
              <Text size="sm">
                This menu will be created for <b>{user?.restaurant?.name}</b>
                {selectedLocation?.name && ` at location: ${selectedLocation.name}`}
              </Text>
            </Alert>
          )}
        </form>
      </Box>
    </CommonModal>
  );
};

export default CreateMenuModal;
