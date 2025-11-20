// 1. Modified AddNewUser.tsx
import React, { useState, useMemo } from "react";
import { DATA_TEST_IDS } from '@Contants/dataTestIds'
import {
  Box,
  Text,
  Button,
  TextInput,
  Select,
  createStyles,
  Title,
} from "@mantine/core";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { IUserDetails } from "../../interfaces";
import { useUser } from "../../hooks";
import { toast } from "react-toastify";
import CommonModal from "@Components/CommonComponents/Modal";
import { useModalStyles } from "@Components/Dashboard/modals.styles";
import { IconUserPlus } from "@tabler/icons";

interface ILoginErrors {
  email?: string;
  phone?: string;
  apiError?: string;
}

interface RestaurantOption {
  label: string;
  value: string;
  isAutoLayout?: boolean;
  location?: string | null;
}

interface Props {
  onClose: () => void;
  newUser: (user: IUserDetails) => void;
  resturantsOptions: RestaurantOption[];
}

const AddNewUser = ({ onClose, newUser, resturantsOptions = [] }: Props) => {
  const { classes } = useModalStyles();
  const { supabaseClient: supabase } = useSessionContext();
  const [isLoading, setisLoading] = useState(false);
  const user = useUser();
  const [error, setError] = useState<ILoginErrors>({});
  const [value, setValue] = useState<string>("");
  const [email, setemail] = useState<string>("");
  const [resturantId, setResturantId] = useState<string | null>(null);
  const [userRole, setuserRole] = useState({
    label: "owner",
    value: "1",
  });

  // Clean the restaurant options data
  const cleanedRestaurants = useMemo(() => {
    return resturantsOptions
      .filter(
        (option) =>
          option &&
          typeof option.label === "string" &&
          typeof option.value === "string"
      )
      .map(({ label, value }) => ({
        label,
        value,
      }));
  }, [resturantsOptions]);

  const handleCreateUser = async () => {
    try {
      setisLoading(true);
      // Ensure values are trimmed before sending to API
      const trimmedPhone = value.trim();
      const trimmedEmail = email.trim();

      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: trimmedPhone,
          email: trimmedEmail,
          restaurant_id: resturantId,
          role: userRole?.label,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error);
        throw new Error(error.message);
      }
      const data = await response.json();
      newUser(data);
      onClose();
    } catch (error: any) {
      setError({ apiError: error?.message });
    } finally {
      setisLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError({});

    // Trim phone number
    const trimmedPhone = value.trim();
    if (value !== trimmedPhone) {
      setError({ phone: "Phone number cannot have leading or trailing spaces" });
      return;
    }

    if (!trimmedPhone) {
      setError({ phone: "Phone number required" });
      return;
    }
    if (!isValidPhoneNumber(trimmedPhone)) {
      setError({ phone: "Invalid phone" });
      return;
    }

    // Trim email
    const trimmedEmail = email.trim();
    if (email !== trimmedEmail && email) {
      setError({ email: "Email cannot have leading or trailing spaces" });
      return;
    }

    if (!validateEmail(trimmedEmail) && trimmedEmail) {
      setError({ email: "Invalid email" });
      return;
    }

    // Update state with trimmed values
    setValue(trimmedPhone);
    setemail(trimmedEmail);

    await handleCreateUser();
  };

  const roleData = [
    { label: "owner", value: "1" },
    { label: "user", value: "2" },
    { label: "flapjack", value: "3" },
  ];

  const safeFilter = (
    searchValue: string,
    item: { label: string; value: string }
  ) => {
    if (!searchValue) return true;
    if (!item?.label) return false;
    return item.label.toLowerCase().includes(searchValue.toLowerCase().trim());
  };

  const formattedTitle = (
    <div className={classes.header}>
      <div className={classes.icon}>
        <IconUserPlus size={20} />
      </div>
      <Title order={5} className={classes.title}>
        Add User
      </Title>
    </div>
  );

  return (
    <CommonModal
      title={formattedTitle}
      onClose={onClose}
      onSubmit={handleSubmit}
      isOpen={true}
      disabled={!resturantId || !value}
      loading={isLoading}
      submitLabel="Add User"
      dataTestId={DATA_TEST_IDS.ADDNEWUSER.BUTTON_2}
    >
      <Box className={classes.container}>
        <Box className={classes.inputWrapper}>
          <Text className={classes.label}>Phone</Text>
          <div className={classes.phoneInputWrapper}>
            <PhoneInput
              placeholder="Enter user phone number"
              data-test-id={DATA_TEST_IDS.ADDNEWUSER.FIELD_1}
              value={value}
              onChange={(phone: any) => {
                // Trim leading and trailing spaces as user types
                const trimmedValue = phone ? phone.trim() : "";
                setValue(trimmedValue);
              }}
              className="input-phone"
              defaultCountry="US"
            />
          </div>
          {error?.phone && <Text className={classes.error}>{error.phone}</Text>}
        </Box>

        <Box className={classes.inputWrapper}>
          <TextInput
            label="Email address"
            placeholder="Enter your email address"
            data-test-id={DATA_TEST_IDS.ADDNEWUSER.FIELD_2}
            value={email}
            onChange={(e) => {
              // Trim leading and trailing spaces as user types
              const trimmedValue = e.target.value.trim();
              setemail(trimmedValue);
            }}
            classNames={{ label: classes.label }}
          />
          {error?.email && <Text className={classes.error}>{error.email}</Text>}
        </Box>

        <Box className={classes.inputWrapper}>
          <Select
            label="Select a restaurant"
            data-test-id={DATA_TEST_IDS.ADDNEWUSER.FIELD_3}
            placeholder="Select a restaurant"
            data={cleanedRestaurants}
            searchable
            onChange={(value: string | null) => setResturantId(value)}
            maxDropdownHeight={400}
            nothingFound="Restaurant not found"
            filter={safeFilter}
            classNames={{ label: classes.label }}
          />
        </Box>

        <Box className={classes.inputWrapper}>
          <Select
            label="Select user role"
            placeholder="Select user role"
            data-test-id={DATA_TEST_IDS.ADDNEWUSER.FIELD_4}
            data={roleData}
            searchable
            onChange={(value: any) => {
              const findValue = roleData?.find((i) => i?.value === value);
              if (findValue) {
                setuserRole(findValue);
              }
            }}
            maxDropdownHeight={400}
            nothingFound="Role not found"
            filter={safeFilter}
            value={userRole?.value}
            classNames={{ label: classes.label }}
          />
        </Box>

        {error?.apiError && (
          <Text className={classes.error}>{error.apiError}</Text>
        )}
      </Box>
    </CommonModal>
  );
};

// Helper function
const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

export default AddNewUser;
