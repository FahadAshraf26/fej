import React, { useCallback, useEffect, useState } from "react";
import { Box, Flex, Select, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconFolder } from "@tabler/icons";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import CommonModal from "../../CommonComponents/Modal";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { Location } from "../../../interfaces/IRestaurantList";
import { APP_CONFIG } from "@Contants/app";

interface ChangeLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ITemplateDetails;
}

const ChangeLocationModal: React.FC<ChangeLocationModalProps> = ({ isOpen, onClose, template }) => {
  // Get update location function and getRestaurantLocations from store
  const updateTemplateLocation = useTemplateStore((state) => state.updateTemplateLocation);
  const getRestaurantLocations = useTemplateStore((state) => state.getRestaurantLocations);

  // State for locations
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Initialize form with Mantine's useForm hook
  const form = useForm({
    initialValues: {
      locationId: "",
      isSubmitting: false,
    },
    validate: {
      locationId: (value) => (!value ? "Location is required" : null),
    },
  });

  // Fetch locations when modal opens
  useEffect(() => {
    const fetchLocations = async () => {
      if (!isOpen || !template?.restaurant_id) return;

      try {
        setIsLoadingLocations(true);
        const fetchedLocations = await getRestaurantLocations(template.restaurant_id);
        setLocations(fetchedLocations || []);

        // Set initial value to the current location if it exists
        if (template.locationInformation?.id) {
          form.setFieldValue("locationId", template.locationInformation.id);
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
        form.setFieldError("locationId", "Failed to load locations. Please try again.");
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [isOpen, template?.restaurant_id, getRestaurantLocations]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: { locationId: string }) => {
      if (!template) return;

      try {
        form.setFieldValue("isSubmitting", true);
        await updateTemplateLocation(template.id, values.locationId);
        form.setFieldValue("isSubmitting", false);
        onClose();
      } catch (error) {
        console.error("Error updating template location:", error);
        form.setFieldError("locationId", "An error occurred. Please try again.");
        form.setFieldValue("isSubmitting", false);
      }
    },
    [template, updateTemplateLocation, onClose]
  );

  // Custom modal title with icon
  const modalTitle = (
    <Flex align="center" gap="xs">
      <IconFolder size={24} color="#ff9800" />
      <Text size="lg" weight={600}>
        Change Location
      </Text>
    </Flex>
  );

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      submitLabel="Move"
      submitLabelColor="orange"
      onSubmit={form.onSubmit(handleSubmit)}
      loading={form.values.isSubmitting || isLoadingLocations}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <Text align="center" size="md" mb="md">
          Move this template to a different location?
        </Text>

        <form>
          <Select
            label="Select Location"
            placeholder={isLoadingLocations ? "Loading locations..." : "Choose a location"}
            data={locations.map((location: Location) => ({
              value: location.id,
              label:
                location.name === APP_CONFIG.LOCATION.DEFAULT
                  ? APP_CONFIG.LOCATION.REPLACEMENT
                  : location.name,
            }))}
            required
            size="md"
            mb="md"
            mt="md"
            error={form.errors.locationId}
            disabled={isLoadingLocations}
            styles={{
              label: {
                fontWeight: 600,
                marginBottom: 8,
              },
            }}
            {...form.getInputProps("locationId")}
          />
        </form>
      </Box>
    </CommonModal>
  );
};

export default ChangeLocationModal;
