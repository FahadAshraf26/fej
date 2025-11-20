import React from "react";
import { createStyles, Title, Box } from "@mantine/core";
import { IconUserPlus, IconEdit, IconBuildingStore } from "@tabler/icons";
import { IUserDetails } from "../../interfaces";
import CommonModal from "../CommonComponents/Modal";
import AddNewUser from "../restaurant/AddNewUser";
import UpdateUser from "../restaurant/UpdateUser";
import AddNewRestaurant from "../restaurant/AddNewRestaurant";

const useStyles = createStyles((theme) => ({
  header: {
    display: "flex",
    alignItems: "center",
  },
  icon: {
    marginRight: theme.spacing.sm,
    backgroundColor: theme.fn.rgba(theme.colors.orange[5], 0.1),
    color: theme.colors.orange[5],
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
}));

export interface ModalState {
  type: "empty" | "addUser" | "editUser" | "addRestaurant";
  data?: any;
}

interface ModalConfig {
  title: string;
  icon: React.ReactNode;
  submitLabel?: string;
  submitColor?: string;
  hideFooter?: boolean;
}

interface DashboardModalsProps {
  modalState: ModalState;
  onClose: () => void;
  onUserUpdate: (user: IUserDetails) => void;
  onUserAdd: (user: IUserDetails) => void;
  resturantsOptions: any[];
}

export const DashboardModals = ({
  modalState,
  onClose,
  onUserUpdate,
  onUserAdd,
  resturantsOptions,
}: DashboardModalsProps) => {
  const { classes } = useStyles();
  if (modalState.type === "empty") return null;

  // Define modal configurations
  const modalConfigs: Record<string, ModalConfig> = {
    addUser: {
      title: "Add New User",
      icon: <IconUserPlus size={20} />,
      submitLabel: "Add",
      submitColor: "orange",
    },
    editUser: {
      title: "Update User",
      icon: <IconEdit size={20} />,
      submitLabel: "Update",
      submitColor: "orange",
    },
    addRestaurant: {
      title: "Add New Restaurant",
      icon: <IconBuildingStore size={20} />,
      submitLabel: "Add",
      submitColor: "orange",
    },
  };

  // Get the current modal configuration
  const currentConfig = modalConfigs[modalState.type];

  if (!currentConfig) return null;

  // Format the title with icon
  const formattedTitle = (
    <div className={classes.header}>
      <div className={classes.icon}>{currentConfig.icon}</div>
      <Title order={5}>{currentConfig.title}</Title>
    </div>
  );

  // Define modal content based on type
  let modalContent;
  let onSubmit;
  let isLoading = false;

  switch (modalState.type) {
    case "addUser":
      modalContent = (
        <Box p="md">
          <AddNewUser
            onClose={onClose}
            newUser={onUserAdd}
            resturantsOptions={resturantsOptions}
          />
        </Box>
      );
      break;

    case "editUser":
      modalContent = (
        <Box p="md">
          <UpdateUser
            onClose={onClose}
            newUser={onUserUpdate}
            selectedUser={modalState.data}
            resturantsOptions={resturantsOptions}
          />
        </Box>
      );
      break;

    case "addRestaurant":
      modalContent = (
        <Box p="md">
          <AddNewRestaurant onClose={onClose} />
        </Box>
      );
      break;

    default:
      return null;
  }
  return (
    // <CommonModal title={formattedTitle} isOpen={true} onClose={onClose}>
    //   {modalContent}
    // </CommonModal>
    <>{modalContent}</>
  );
};

export default DashboardModals;
