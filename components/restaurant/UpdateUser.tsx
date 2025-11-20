import React, { useState } from "react";
import { Paper, Text, Box, TextInput, Select, Title } from "@mantine/core";
import { IconEdit } from "@tabler/icons";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { IUserDetails } from "../../interfaces";
import CommonModal from "@Components/CommonComponents/Modal";
import { useModalStyles } from "@Components/Dashboard/modals.styles";

interface ILoginErrors {
  email?: string;
  phone?: string;
  apiError?: string;
}

const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};
interface Props {
  onClose: () => void;
  newUser: (user: IUserDetails) => void;
  selectedUser: IUserDetails | null;
  resturantsOptions: any;
}

const roleData = [
  {
    label: "owner",
    value: "1",
  },
  {
    label: "user",
    value: "2",
  },
  {
    label: "flapjack",
    value: "3",
  },
];

const UpdateUser = ({ onClose, newUser, selectedUser, resturantsOptions }: Props) => {
  const [isLoading, setisLoading] = useState(false);
  const [error, setError] = useState<ILoginErrors>({});
  const [resturantId, setResturantId] = useState(selectedUser?.restaurant_id);
  const [userRole, setuserRole] = useState<any>(
    roleData?.find((i) => i?.label === selectedUser?.role)
  );
  const [value, setValue] = useState<string>(selectedUser?.phone ? `+${selectedUser.phone}` : "");
  const { classes } = useModalStyles();
  const [email, setemail] = useState<string>(selectedUser?.email ?? "");

  const handleUpdateUser = async () => {
    if (!selectedUser) {
      setError({ apiError: "Something went wrong" });
      return;
    }
    try {
      setisLoading(true);
      setError({});
      const response = await fetch("/api/update-user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          phone: value.startsWith("+") ? value.slice(1) : value,
          resturantId,
          userRole,
          id: selectedUser?.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError({ apiError: data?.error ?? "Something went wrong" });
        return;
      }
      newUser(data);
      onClose();
    } catch (error: any) {
      setError({ apiError: error?.message ?? "Something went wrong" });
    } finally {
      setisLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError({});
    if (!value) {
      setError({ phone: "Phone number required" });
      return;
    }
    if (!isValidPhoneNumber(value)) {
      setError({ phone: "Invalid phone" });
      return;
    }
    if (!email) {
      setError({ email: "Email is required " });
      return;
    }
    if (email && !validateEmail(email)) {
      setError({ email: "Invalid email" });
      return;
    }
    await handleUpdateUser();
  };

  const safeFilter = (searchValue: string, item: any) => {
    if (!searchValue) return true;
    if (!item?.label || typeof item.label !== "string") return false;
    return item.label.toLowerCase().includes(searchValue.toLowerCase().trim());
  };

  const formattedTitle = (
    <div className={classes.header}>
      <div className={classes.icon}>
        <IconEdit size={20} />
      </div>
      <Title order={5} className={classes.title}>
        Edit User
      </Title>
    </div>
  );

  return (
    <CommonModal
      isOpen={true}
      title={formattedTitle}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={isLoading}
    >
      <Paper className={classes.container}>
        <Box>
          <label
            className="mantine-InputWrapper-label mantine-TextInput-label mantine-ittua2"
            style={{ color: "gray", marginBottom: "10px" }}
          >
            Phone
          </label>
          <PhoneInput
            placeholder="Enter user phone number"
            value={value}
            onChange={(phone: any) => setValue(phone)}
            className="input-phone"
            defaultCountry="US"
          />
          {error?.phone && (
            <Text fz={"sm"} color={"red"} mt={10}>
              {error?.phone}
            </Text>
          )}
        </Box>
        <Box mt={10}>
          <TextInput
            label="Email address"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setemail(e.target.value)}
            labelProps={{
              style: { color: "grey", marginBottom: "10px" },
            }}
          />
          {error?.email && (
            <Text fz={"sm"} color={"red"} mt={10}>
              {error?.email}
            </Text>
          )}
        </Box>
        <Box mt={10}>
          <Select
            label="Select a resturant"
            placeholder="Select a resturant"
            data={resturantsOptions}
            searchable
            onChange={(value: any) => setResturantId(value)}
            maxDropdownHeight={400}
            nothingFound="Resturant not found"
            filter={safeFilter}
            value={resturantId}
          />
        </Box>
        <Box mt={10}>
          <Select
            label="Select user role"
            placeholder="Select user role"
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
            filter={(value: string, item: any) =>
              item.label.toLowerCase().includes(value.toLowerCase().trim())
            }
            value={userRole?.value}
          />
        </Box>
        {error?.apiError && (
          <Text fz={"sm"} color={"red"} mt={10}>
            {error?.apiError}
          </Text>
        )}
      </Paper>
    </CommonModal>
  );
};

export default UpdateUser;
