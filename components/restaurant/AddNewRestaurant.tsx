import React, { useState } from "react";
import { TextInput, Textarea, Group, Box, Title, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IRestaurantDetail } from "@Interfaces/";
import { showNotification } from "@mantine/notifications";
import { supabase } from "@database/client.connection";
import CommonModal from "@Components/CommonComponents/Modal";
import { IconPlaylistAdd, IconX } from "@tabler/icons";
import { useModalStyles } from "@Components/Dashboard/modals.styles";
import { DATA_TEST_IDS } from "@Contants/dataTestIds";

interface Props {
  onClose: () => void;
}

const AddNewRestaurant = ({ onClose }: Props) => {
  const { classes } = useModalStyles();
  const [isLoading, setisLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && input.trim()) {
      event.preventDefault();
      if (!tags.includes(input.trim())) {
        setTags([...tags, input.trim()]);
        setInput("");
      }
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const form = useForm({
    initialValues: {
      name: "",
      location: "",
      description: "",
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
      },
    },

    validate: {
      name: (value) => (value ? null : "Restaurant Name is required"),
      // address: {
      //   street: (value) => (value ? null : "Street is required"),
      //   city: (value) => (value ? null : "City is required"),
      //   state: (value) => (value ? null : "State is required"),
      //   zip: (value) => (value ? null : "Zip is required"),
      // },
    },
  });

  const handleSubmit = async (values: IRestaurantDetail) => {
    try {
      setisLoading(true);
      const input = {
        name: values.name,
        location: tags,
        description: values.description,
        address: `${values.address.street}, ${values.address.city} ${values.address.state}, ${values.address.zip}`,
      };
      const response = await supabase.from("restaurants").insert(input);
      if (response.status === 201) {
        form.reset();
        setisLoading(false);
        showNotification({
          title: "Successful",
          message: "Restaurant saved successfully!",
          color: "green",
        });
        setTags([]);
        setInput("");
        onClose();
      } else {
        showNotification({
          title: "Error",
          message: response.error!.message,
          color: "red",
        });
      }
    } catch (error: any) {
      showNotification({
        title: "Error",
        message: error.message,
        color: "red",
      });
    }
  };

  const formattedTitle = (
    <div className={classes.header}>
      <div className={classes.icon}>
        <IconPlaylistAdd size={20} />
      </div>
      <Title order={5} className={classes.title}>
        Add New Restaurant
      </Title>
    </div>
  );

  return (
    <CommonModal
      onSubmit={form.onSubmit(handleSubmit)}
      loading={isLoading}
      isOpen={true}
      onClose={onClose}
      submitLabel="Add"
      dataTestId={DATA_TEST_IDS.ADDNEWRESTAURANT.BUTTON_1}
      title={formattedTitle}
    >
      <Box sx={{ maxWidth: 430 }} my={4} p={4} mx="auto">
        <form>
          <TextInput
            required
            label="Restaurant Name"
            data-test-id={DATA_TEST_IDS.ADDNEWRESTAURANT.FIELD_1}
            placeholder="Enter restaurant name"
            {...form.getInputProps("name")}
            mb={15}
          />

          <div style={{ marginBottom: 15 }}>
            <Group position="apart" mb={5}>
              <Text size="sm" weight={500} color="#212529">
                Locations
              </Text>
              {tags.length > 0 && (
                <Text size="xs" color="dimmed" style={{ fontStyle: "italic" }}>
                  Press Enter to add locations
                </Text>
              )}
            </Group>
            <div
              style={{
                border: "1px solid #ced4da",
                padding: "8px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                borderRadius: "4px",
                minHeight: "36px",
                backgroundColor: "#fff",
              }}
            >
              {tags.map((tag, index) => (
                <div
                  key={index}
                  style={{
                    padding: "3px 10px",
                    backgroundColor: "#fff3e0",
                    color: "#d84315",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    fontWeight: 500,
                    height: "24px",
                    margin: "3px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    border: "1px solid #ffcc80",
                  }}
                >
                  <span style={{ marginRight: "8px", lineHeight: "1" }}>{tag}</span>
                  <div
                    onClick={() => removeTag(index)}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(255,0,0,0.1)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,0,0,0.2)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,0,0,0.1)";
                    }}
                  >
                    <IconX size={10} stroke={2} color="#ff0000" />
                  </div>
                </div>
              ))}
              <input
                type="text"
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                style={{
                  flex: tags.length > 0 ? "1" : "1 1 100%",
                  padding: "4px",
                  border: "none",
                  outline: "none",
                  minHeight: "24px",
                  fontSize: "13px",
                  backgroundColor: "transparent",
                }}
                placeholder={tags.length > 0 ? "Add more..." : "Type and press Enter"}
                data-test-id={DATA_TEST_IDS.ADDNEWRESTAURANT.FIELD_2}
              />
            </div>
          </div>

          <Textarea
            label="Description"
            placeholder="Enter description"
            data-test-id={DATA_TEST_IDS.ADDNEWRESTAURANT.FIELD_3}
            {...form.getInputProps("description")}
            mt={15}
            mb={10}
          />

          <Group grow>
            <TextInput
              // required
              label="Street"
              placeholder="123 Main St"
              data-test-id={DATA_TEST_IDS.ADDNEWRESTAURANT.FIELD_4}
              {...form.getInputProps("address.street")}
            />
            <TextInput
              // required
              label="City"
              placeholder="Anytown"
              data-test-id={DATA_TEST_IDS.ADDNEWRESTAURANT.FIELD_5}
              {...form.getInputProps("address.city")}
            />
          </Group>
          <Group grow>
            <TextInput
              // required
              label="State"
              placeholder="State"
              data-test-id={DATA_TEST_IDS.ADDNEWRESTAURANT.FIELD_6}
              {...form.getInputProps("address.state")}
            />
            <TextInput
              // required
              label="Zip Code"
              placeholder="12345"
              data-test-id={DATA_TEST_IDS.ADDNEWRESTAURANT.FIELD_7}
              {...form.getInputProps("address.zip")}
            />
          </Group>
        </form>
      </Box>
    </CommonModal>
  );
};

export default AddNewRestaurant;
