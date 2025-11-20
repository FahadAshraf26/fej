// components/TemplateGallery/TemplateCardModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Flex, Input, Text, Textarea, Alert, Box, Select } from "@mantine/core";
import { IconTrash, IconEdit, IconCopy, IconAlertCircle } from "@tabler/icons";
import CommonModal from "../CommonComponents/Modal";
import { ITemplateDetails } from "../../interfaces/ITemplate";
import { Location } from "../../interfaces/IRestaurantList";
import { useUserContext } from "../../context/UserContext";
import { useTemplateStore } from "../../stores/Template/Template.store";
import { APP_CONFIG } from "@Contants/app";
export type ModalType = "delete" | "rename" | "duplicate" | "transfer" | "changeLocation";

// Modal configuration based on type
const modalTypeContent = {
  delete: "Delete Template",
  rename: "Rename Template",
  duplicate: "Duplicate Menu",
  transfer: "Transfer Template",
  changeLocation: "Change Location",
};

const modalQuestions = {
  delete: "Are you sure you want to delete this menu?",
  rename: "Are you sure you want to rename this template?",
  duplicate: "Are you sure you want to duplicate this menu?",
  transfer: "Select a restaurant to transfer this template to",
  changeLocation: "Select a new location for this template",
};

const modalIcons = {
  delete: <IconTrash size={24} color="#fa5252" />,
  rename: <IconEdit size={24} color="#ff9800" />,
  duplicate: <IconCopy size={24} color="#ff9800" />,
  transfer: <IconEdit size={24} color="#ff9800" />,
  changeLocation: <IconEdit size={24} color="#ff9800" />,
};

// Minimal props - only what can't come from global store
interface TemplateCardModalProps {
  isOpened: boolean;
  closeModal: () => void;
  type: ModalType;
  template?: ITemplateDetails;
  onComplete?: () => void;
}

const TemplateCardModal = React.memo(
  ({ isOpened, closeModal, type, template, onComplete }: TemplateCardModalProps) => {
    const { user } = useUserContext();

    // Get state from store selectively
    const restaurantOptions = useTemplateStore((state) => state.restaurantOptions);

    // Only need to get the functions we're using directly
    const {
      deleteTemplate,
      renameTemplate,
      duplicateTemplate,
      transferTemplate,
      updateTemplateLocation,
      getRestaurantLocations,
    } = useTemplateStore();

    // Local form state
    const [name, setName] = useState(template?.name || "");
    const [description, setDescription] = useState(template?.description || "");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Restaurant transfer states
    const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
    const [restaurantLocations, setRestaurantLocations] = useState<Location[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [userLocationObjects, setUserLocationObjects] = useState<Location[]>([]);

    // Memoized modal properties to prevent recalculation
    const isDeleteModal = useMemo(() => type === "delete", [type]);
    const isDuplicateModal = useMemo(() => type === "duplicate", [type]);
    const isTransferModal = useMemo(() => type === "transfer", [type]);
    const isChangeLocationModal = useMemo(() => type === "changeLocation", [type]);
    const questionText = useMemo(() => modalQuestions[type], [type]);

    // Reset form when modal opens
    useEffect(() => {
      if (isOpened) {
        setName(isDuplicateModal ? `Copy of ${template?.name}` : template?.name || "");
        setDescription(template?.description || "");
        setError("");
        setSelectedRestaurantId("");
        setSelectedLocation(null);
        setRestaurantLocations([]);
      }
    }, [isOpened, isDuplicateModal, template]);

    // Load locations when a restaurant is selected
    useEffect(() => {
      const fetchLocations = async () => {
        if (isTransferModal && selectedRestaurantId) {
          try {
            const locations = await getRestaurantLocations(selectedRestaurantId);
            setRestaurantLocations(locations);
          } catch (error) {
            console.error("Error fetching restaurant locations:", error);
            setError("Failed to load locations. Please try again.");
            setRestaurantLocations([]);
          }
        }
      };

      fetchLocations();
    }, [isTransferModal, selectedRestaurantId, getRestaurantLocations]);

    // Load user locations for location change modal
    useEffect(() => {
      const fetchUserLocations = async () => {
        if (isChangeLocationModal && isOpened && template?.restaurant_id) {
          try {
            const locations = await getRestaurantLocations(template.restaurant_id);
            setUserLocationObjects(locations);
          } catch (error) {
            console.error("Error fetching user locations:", error);
            setError("Failed to load locations. Please try again.");
            setUserLocationObjects([]);
          }
        }
      };

      fetchUserLocations();
    }, [isChangeLocationModal, isOpened, template, getRestaurantLocations]);

    // Form input handlers
    const handleNameChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      []
    );

    const handleDescriptionChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
      []
    );

    // Select filter function
    const safeFilter = useCallback((searchValue: string, item: any) => {
      if (!searchValue) return true;
      if (!item?.label || typeof item.label !== "string") return false;
      return item.label.toLowerCase().includes((searchValue || "").toLowerCase().trim());
    }, []);

    // Handle restaurant selection
    const handleRestaurantChange = useCallback((value: string) => {
      setSelectedRestaurantId(value);
      setSelectedLocation(null);
      setError("");
    }, []);

    // Handle location selection
    const handleLocationChange = useCallback(
      (locationId: string) => {
        const location = restaurantLocations.find((loc) => loc.id === locationId) || null;
        setSelectedLocation(location);
        setError("");
      },
      [restaurantLocations]
    );

    // Handle location change selection
    const handleChangeLocationChange = useCallback(
      (locationId: string) => {
        const location = userLocationObjects.find((loc) => loc.id === locationId) || null;
        setSelectedLocation(location);
        setError("");
      },
      [userLocationObjects]
    );

    // Main form submission handler
    const handleModalSubmit = useCallback(async () => {
      if (!template) {
        setError("Template information is missing");
        return;
      }

      try {
        setIsLoading(true);
        setError("");

        // Different actions based on modal type
        if (isDeleteModal) {
          await deleteTemplate(template, user?.id || "");
        } else if (isDuplicateModal) {
          await duplicateTemplate(template.id, name, description, user?.id || "");
        } else if (type === "rename") {
          await renameTemplate(template.id, name, description);
        } else if (isTransferModal) {
          // Validate transfer inputs
          if (!selectedRestaurantId) {
            setError("Please select a restaurant");
            setIsLoading(false);
            return;
          }

          if (restaurantLocations.length && !selectedLocation) {
            setError("Please select a restaurant location");
            setIsLoading(false);
            return;
          }

          await transferTemplate(template.id, selectedRestaurantId, selectedLocation?.id || "");
        } else if (isChangeLocationModal) {
          // Validate location change
          if (!selectedLocation || !userLocationObjects.length) {
            setError("Please select a restaurant location");
            setIsLoading(false);
            return;
          }

          await updateTemplateLocation(template.id, selectedLocation.id);
        }

        // Call completion callback if provided
        if (onComplete) {
          onComplete();
        }

        closeModal();
      } catch (error) {
        console.error("Error in template operation:", error);
        setError("An error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }, [
      template,
      isDeleteModal,
      isDuplicateModal,
      isTransferModal,
      isChangeLocationModal,
      type,
      name,
      description,
      selectedRestaurantId,
      selectedLocation,
      restaurantLocations,
      userLocationObjects,
      user?.id,
      deleteTemplate,
      renameTemplate,
      duplicateTemplate,
      transferTemplate,
      updateTemplateLocation,
      closeModal,
      onComplete,
    ]);

    // Memoized options for select components
    const locationOptions = useMemo(
      () =>
        restaurantLocations.map((location) => ({
          value: location.id,
          label:
            location.name === APP_CONFIG.LOCATION.DEFAULT
              ? APP_CONFIG.LOCATION.REPLACEMENT
              : location.name,
        })),
      [restaurantLocations]
    );

    const userLocationOptions = useMemo(
      () =>
        userLocationObjects.map((location) => ({
          value: location.id,
          label:
            location.name === APP_CONFIG.LOCATION.DEFAULT
              ? APP_CONFIG.LOCATION.REPLACEMENT
              : location.name,
        })),
      [userLocationObjects]
    );

    // Memoized UI elements
    const modalTitle = useMemo(
      () => (
        <Flex align="center" gap="xs">
          {modalIcons[type]}
          <Text size="lg" weight={600}>
            {modalTypeContent[type]}
          </Text>
        </Flex>
      ),
      [type]
    );

    const submitButtonLabel = useMemo(() => {
      if (isDeleteModal) return "Delete";
      if (isDuplicateModal) return "Duplicate";
      if (isTransferModal) return isLoading ? "Transferring" : "Transfer";
      if (isChangeLocationModal) return isLoading ? "Saving" : "Save";
      return "Rename";
    }, [isDeleteModal, isDuplicateModal, isTransferModal, isChangeLocationModal, isLoading]);

    const submitColor = useMemo(() => (isDeleteModal ? "red" : "orange"), [isDeleteModal]);

    return (
      <CommonModal
        isOpen={isOpened}
        onClose={closeModal}
        title={modalTitle}
        submitLabel={submitButtonLabel}
        submitLabelColor={submitColor}
        onSubmit={handleModalSubmit}
        loading={isLoading}
      >
        <Box sx={{ width: "100%", padding: "16px 0" }}>
          <Text align="center" size="md" mb="md">
            {questionText}
          </Text>

          {isDeleteModal && (
            <Alert icon={<IconAlertCircle size={16} />} title="Alert!" color="red">
              This action cannot be undone. The template will be permanently deleted.
            </Alert>
          )}

          {/* Rename Template Form */}
          {type === "rename" && (
            <form>
              <Input.Wrapper
                label="Template Name"
                required
                size="md"
                mb="md"
                mt="md"
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
                  value={name}
                  onChange={handleNameChange}
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
                value={description}
                onChange={handleDescriptionChange}
              />
            </form>
          )}

          {/* Duplicate Template Form */}
          {isDuplicateModal && (
            <form>
              <Input.Wrapper
                label="New Template Name"
                required
                size="md"
                mb="md"
                mt="md"
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
                  value={name}
                  onChange={handleNameChange}
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
                value={description}
                onChange={handleDescriptionChange}
              />
            </form>
          )}

          {/* Transfer Template Form */}
          {isTransferModal && (
            <Box>
              <Select
                label="Select a restaurant"
                placeholder="Select a restaurant"
                data={restaurantOptions.map((restaurant) => ({
                  value: restaurant.id || "",
                  label: restaurant.name || "",
                }))}
                searchable
                value={selectedRestaurantId}
                onChange={handleRestaurantChange}
                maxDropdownHeight={400}
                nothingFound="Restaurant not found"
                filter={safeFilter}
                mb="md"
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
              />

              {restaurantLocations.length > 0 && (
                <Select
                  label="Select a location"
                  placeholder="Select a location"
                  data={restaurantLocations.map((location) => ({
                    value: location.id,
                    label:
                      location.name === APP_CONFIG.LOCATION.DEFAULT
                        ? APP_CONFIG.LOCATION.REPLACEMENT
                        : location.name,
                  }))}
                  value={selectedLocation?.id || ""}
                  onChange={(value) => {
                    const location = restaurantLocations.find((loc) => loc.id === value);
                    setSelectedLocation(location || null);
                  }}
                  maxDropdownHeight={400}
                  mb="md"
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
                />
              )}
            </Box>
          )}

          {/* Change Location Form */}
          {isChangeLocationModal && (
            <Box>
              <Select
                label="Select a location"
                placeholder="Select a location"
                data={userLocationOptions}
                value={selectedLocation?.id}
                onChange={handleChangeLocationChange}
                maxDropdownHeight={400}
                nothingFound="Please add a location first"
                mb="md"
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
              />
            </Box>
          )}

          {/* Error Message Display */}
          {error && (
            <Text color="red" size="sm" mt="xs">
              {error}
            </Text>
          )}
        </Box>
      </CommonModal>
    );
  }
);

TemplateCardModal.displayName = "TemplateCardModal";

export default TemplateCardModal;
