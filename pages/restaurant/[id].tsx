import { Tabs, Container, Paper, Button, Flex, Center, Loader, createStyles } from "@mantine/core";
import { useState, useEffect } from "react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useUser } from "../../hooks";
import { useRouter } from "next/router";
import { UsersTable } from "../../components/restaurant/UsersTable";
import { RestaurantLocationTable } from "../../components/restaurant/RestaurantLocationTable";
import { SubscriptionTab } from "@Components/Dashboard/subscriptions/SubscriptionTab";
import { CheckoutLinksTab } from "@Components/Dashboard/subscriptions/CheckoutLinksTab";
import CommonModal from "../../components/CommonComponents/Modal";
import InviteUserDesign from "../../components/restaurant/InviteUser";
import RemoveUser from "../../components/restaurant/RemoveUser";
import PrivatePage from "../../components/PrivatePage/PrivatePage";
import { IRestaurantList, IUserDetails } from "../../interfaces";
import { RestaurantType } from "../../interfaces/RestaurantType";
import { GetServerSidePropsContext } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { IconMapPin, IconUsers, IconCreditCard, IconLink } from "@tabler/icons";
import RemoveUserModal from "../../components/restaurant/RemoveUser";
import InviteUserModal from "../../components/restaurant/InviteUser";
import { toast } from "react-toastify";
import { DATA_TEST_IDS } from "@Contants/dataTestIds";
import { supabase } from "@database/client.connection";
import { useSubscriptionContext } from "../../context/SubscriptionContext";

const useStyles = createStyles((theme) => ({
  tabsList: {
    borderBottom: `1px solid ${theme.colors.gray[2]}`,
  },
  tab: {
    "&[data-active]": {
      borderBottom: `2px solid ${theme.colors.orange[5]}`,
    },
  },
  tabIcon: {
    color: theme.colors.orange[5],
  },
  tabPanel: {
    padding: theme.spacing.md,
  },
  inviteButton: {
    backgroundColor: theme.colors.orange[5],
    "&:hover": {
      backgroundColor: theme.colors.orange[6],
    },
  },
}));

type ModalType = "empty" | "inviteUser" | "removeUser";

const ResturantManage = ({
  profiles,
  resturantDetail,
}: {
  profiles: [];
  resturantDetail: IRestaurantList;
}) => {
  const { supabaseClient: supabase } = useSessionContext();
  const { classes } = useStyles();
  const user = useUser();
  const router = useRouter();
  const { handleAction } = useSubscriptionContext();
  const [modalType, setmodalType] = useState<ModalType>("empty");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUserDetails | null>(null);
  const [allUsers, setAllUsers] = useState<IUserDetails[]>(profiles);
  const [isLoading, setIsLoading] = useState(false);

  // Handle tab access control
  useEffect(() => {
    const currentTab = router.query.tab as string;

    // If user is not flapjack and trying to access checkout-links tab, redirect to users
    if (user && user.role !== "flapjack" && currentTab === "checkout-links") {
      const newQuery = { ...router.query, tab: "users" };
      router.push({ pathname: router.pathname, query: newQuery }, undefined, {
        shallow: true,
      });
    }
  }, [user, router.query.tab, router]);

  // Get the default tab value based on user role and current tab
  const getDefaultTab = () => {
    const currentTab = router.query.tab as string;

    // If user is not flapjack and trying to access checkout-links, default to users
    if (user && user.role !== "flapjack" && currentTab === "checkout-links") {
      return "users";
    }

    // Otherwise use the current tab or default to users
    return currentTab || "users";
  };

  if (!user) {
    return (
      <Center h="100vh">
        <Loader color="orange" size={"lg"} variant="dots" />
      </Center>
    );
  }

  const hasAccess =
    user.role === "flapjack" || // is flapjack user
    user.role === "owner" ||
    user.restaurant_id === router?.query?.id; // is owner or user with same restaurant

  if (!hasAccess) {
    return <PrivatePage />;
  }

  const handleRemoveUser = async () => {
    if (!selectedUser) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      setAllUsers((prevUsers) => prevUsers.filter((user) => user.id !== selectedUser.id));
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error("Something went wrong when removing the user");
    } finally {
      setIsLoading(false);
      setIsRemoveModalOpen(false);
      setSelectedUser(null);
    }
  };

  const handleUserDelete = (user: IUserDetails) => {
    setSelectedUser(user);
    setIsRemoveModalOpen(true);
  };

  const handleInviteModalOpen = () => {
    setIsInviteModalOpen(true);
  };

  return (
    <Paper bg="white" mih="100%">
      <Container size="xl" pt={20}>
        <Tabs
          defaultValue={getDefaultTab()}
          color="orange"
          onTabChange={(value) => {
            const newQuery = { ...router.query, tab: value };
            router.push({ pathname: router.pathname, query: newQuery }, undefined, {
              shallow: true,
            });
          }}
        >
          <Tabs.List position="left" mb="md" className={classes.tabsList}>
            <Tabs.Tab
              icon={<IconUsers size={14} className={classes.tabIcon} />}
              value="users"
              className={classes.tab}
            >
              Users
            </Tabs.Tab>
            <Tabs.Tab
              value="locations"
              icon={<IconMapPin size={14} className={classes.tabIcon} />}
              className={classes.tab}
            >
              Locations
            </Tabs.Tab>
            <Tabs.Tab
              value="subscription"
              icon={<IconCreditCard size={14} className={classes.tabIcon} />}
              className={classes.tab}
            >
              Subscription
            </Tabs.Tab>
            {user.role === "flapjack" && (
              <Tabs.Tab
                value="checkout-links"
                icon={<IconLink size={14} className={classes.tabIcon} />}
                className={classes.tab}
              >
                Checkout Links
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="users" className={classes.tabPanel}>
            <Flex justify="flex-end" my={10}>
              <Button
                size="xs"
                color="orange"
                data-test-id={DATA_TEST_IDS.ID.BUTTON_1}
                onClick={handleInviteModalOpen}
                className={classes.inviteButton}
                sx={{ marginRight: "1rem" }}
              >
                Invite a user
              </Button>
            </Flex>
            <UsersTable data={allUsers} onDelete={handleUserDelete} handleAction={handleAction} />
          </Tabs.Panel>

          <Tabs.Panel value="locations" className={classes.tabPanel}>
            <RestaurantLocationTable data={resturantDetail} handleAction={handleAction} />
          </Tabs.Panel>

          <Tabs.Panel value="subscription" className={classes.tabPanel}>
            <SubscriptionTab restaurantId={router.query.id as string} />
          </Tabs.Panel>

          {user.role === "flapjack" && (
            <Tabs.Panel value="checkout-links" className={classes.tabPanel}>
              <CheckoutLinksTab restaurantId={router.query.id as string} />
            </Tabs.Panel>
          )}
        </Tabs>

        {/* Modals */}
        <RemoveUserModal
          isOpen={isRemoveModalOpen}
          onClose={() => setIsRemoveModalOpen(false)}
          user={selectedUser}
          onRemove={handleRemoveUser}
          isLoading={isLoading}
        />

        <InviteUserModal
          isOpen={isInviteModalOpen}
          onClose={() => {
            setIsInviteModalOpen(false);
          }}
          restaurantDetail={resturantDetail}
          allUsers={allUsers}
        />
      </Container>
    </Paper>
  );
};

export default ResturantManage;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    const { id } = context.query;
    console.log("Context ID: ", id);
    console.log("context.query: ", context.query);
    const restaurantId = typeof id === "string" ? parseInt(id, 10) : id;
    console.log('Restaurant ID: ', restaurantId)
    // Fetch profiles and restaurant details with locations in parallel
    const [profilesResponse, restaurantWithLocationsResponse] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .neq("role", "flapjack"),

      supabase
        .from("restaurants")
        .select(
          `
          *,
          locations!restaurantId(*)
        `
        )
        .eq("id", restaurantId)
        .single(),
    ]);
    console.log(profilesResponse.data);
    console.log(restaurantWithLocationsResponse.data);
    return {
      props: {
        profiles: profilesResponse.data || [],
        resturantDetail: restaurantWithLocationsResponse.data || null,
      },
    };
  } catch (error) {
    return {
      props: {
        profiles: [],
        resturantDetail: null,
      },
    };
  }
}
