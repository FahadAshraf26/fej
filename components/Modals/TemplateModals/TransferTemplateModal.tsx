import React, { useCallback, useEffect, useState } from "react";
import { Box, Flex, Select, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconTransferOut } from "@tabler/icons";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import CommonModal from "../../CommonComponents/Modal";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { Location } from "../../../interfaces/IRestaurantList";
import { fetchResturantLocations } from "@Hooks/useUser";
import { APP_CONFIG } from "@Contants/app";

interface TransferTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ITemplateDetails;
}

const TransferTemplateModal: React.FC<TransferTemplateModalProps> = ({
  isOpen,
  onClose,
  template,
}) => {
  // Get transfer function and restaurant options from store
  const transferTemplate = useTemplateStore((state) => state.transferTemplate);
  const restaurantOptions = useTemplateStore((state) => state.restaurantOptions);
  const fetchTemplatesByRestaurantId = useTemplateStore(
    (state) => state.fetchTemplatesByRestaurantId
  );
  const [restaurantLocations, setRestaurantLocations] = useState<Location[]>([]);

  // Initialize form with Mantine's useForm hook
  const form = useForm({
    initialValues: {
      restaurantId: "",
      locationId: "",
      isSubmitting: false,
    },
    validate: {
      restaurantId: (value) => (!value ? "Restaurant is required" : null),
      locationId: (value) => (!value ? "Location is required" : null),
    },
  });

  // Fetch locations when restaurant changes
  const fetchLocations = async (restaurantId: string) => {
    try {
      const locations = await fetchResturantLocations(restaurantId);
      setRestaurantLocations(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setRestaurantLocations([]);
    }
  };

  // Handle restaurant change
  const handleRestaurantChange = (value: string) => {
    form.setFieldValue("restaurantId", value);
    form.setFieldValue("locationId", "");
    if (value) {
      fetchLocations(value);
    } else {
      setRestaurantLocations([]);
    }
  };

  // Reset form when modal opens with new template
  useEffect(() => {
    if (isOpen) {
      form.reset();
      form.setValues({
        restaurantId: "",
        locationId: "",
        isSubmitting: false,
      });
      setRestaurantLocations([]);
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (values: { restaurantId: string; locationId: string }) => {
      if (!template) return;

      try {
        form.setFieldValue("isSubmitting", true);
        await transferTemplate(template.id, values.restaurantId, values.locationId);
        if (template.restaurant_id) {
          await fetchTemplatesByRestaurantId(template.restaurant_id);
        }
        form.setFieldValue("isSubmitting", false);
        onClose();
      } catch (error) {
        console.error("Error transferring template:", error);
        form.setFieldError("restaurantId", "An error occurred. Please try again.");
        form.setFieldValue("isSubmitting", false);
      }
    },
    [template, transferTemplate, fetchTemplatesByRestaurantId, onClose]
  );

  // Custom modal title with icon
  const modalTitle = (
    <Flex align="center" gap="xs">
      <IconTransferOut size={24} color="#ff9800" />
      <Text size="lg" weight={600}>
        Transfer Template
      </Text>
    </Flex>
  );

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      submitLabel="Transfer"
      submitLabelColor="orange"
      onSubmit={form.onSubmit(handleSubmit)}
      loading={form.values.isSubmitting}
    >
      <Box sx={{ width: "100%", padding: "16px 0" }}>
        <Text align="center" size="md" mb="md">
          Transfer this template to another restaurant?
        </Text>

        <form>
          <Select
            label="Select Restaurant"
            placeholder="Choose a restaurant"
            data={restaurantOptions.map((restaurant) => ({
              value: restaurant.value || "",
              label: restaurant.label || "",
            }))}
            required
            size="md"
            mb="md"
            mt="md"
            searchable
            clearable
            nothingFound="No restaurants found"
            error={form.errors.restaurantId}
            styles={{
              label: {
                fontWeight: 600,
                marginBottom: 8,
              },
            }}
            value={form.values.restaurantId}
            onChange={handleRestaurantChange}
          />

          {restaurantLocations.length > 0 && (
            <Select
              label="Select Location"
              placeholder="Choose a location"
              data={restaurantLocations.map((location) => ({
                value: location.id,
                label:
                  location.name === APP_CONFIG.LOCATION.DEFAULT
                    ? APP_CONFIG.LOCATION.REPLACEMENT
                    : location.name,
              }))}
              required
              size="md"
              mb="md"
              error={form.errors.locationId}
              styles={{
                label: {
                  fontWeight: 600,
                  marginBottom: 8,
                },
              }}
              {...form.getInputProps("locationId")}
            />
          )}
        </form>
      </Box>
    </CommonModal>
  );
};

export default TransferTemplateModal;
