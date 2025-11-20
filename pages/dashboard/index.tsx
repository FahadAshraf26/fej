import { GetServerSidePropsContext } from "next";
import { IUserDetails } from "../../interfaces";
import { Button, Container, Flex, Paper, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons";
import { UsersTable } from "../../components/restaurant/UsersTable";
import { useCallback, useEffect, useState } from "react";
import PrivatePage from "../../components/PrivatePage/PrivatePage";
import { fetchResturants, useUser } from "../../hooks";
import { supabase } from "@database/client.connection";
import { DashboardModals, ModalState } from "@Components/Dashboard/modals";
import { CustomLoader } from "@Components/CommonComponents/CustomLoader";
import { DATA_TEST_IDS } from "@Contants/dataTestIds";
interface RestaurantOptions {
  isAutoLayout: boolean;
  label: string;
  localtion: string[];
  value: string;
}

const Dashboard = ({ profiles }: { profiles: [] }) => {
  const user = useUser();
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    selectedPlan: "editor",
  });
  const [modalState, setModalState] = useState<ModalState>({ type: "empty" });
  const [allUsers, setAllUsers] = useState<IUserDetails[]>(profiles);
  const [filteredUsers, setFilteredUsers] = useState<IUserDetails[]>(profiles);
  const [resturantsOptions, setResturantsOptions] = useState<RestaurantOptions[]>([]);
  const [expandedRestaurants, setExpandedRestaurants] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<IUserDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowPrivatePage, setShouldShowPrivatePage] = useState(false);

  const [planView, setPlanView] = useState<{
    isVisible: boolean;
    selectedPlan: string;
  }>({
    isVisible: false,
    selectedPlan: "editor",
  });
  // Filter users based on search query and filter type
  useEffect(() => {
    let filtered = [...allUsers];
    const query = searchQuery.toLowerCase();

    if (query) {
      // Get all matching users
      const matchingUsers = allUsers.filter(
        (user) =>
          user.phone?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          resturantsOptions
            .find((r: any) => r.value === user.restaurant_id)
            ?.label?.toLowerCase()
            .includes(query) ||
          user.subscriptionActive?.toString().toLowerCase().includes(query)
      );

      // Get unique restaurant IDs from matching users
      const matchingRestaurantIds = new Set(matchingUsers.map((user) => user.restaurant_id));

      // Include all users from matching restaurants
      filtered = allUsers.filter(
        (user) =>
          matchingRestaurantIds.has(user.restaurant_id) || // Include all users from matching restaurants
          matchingUsers.some((matchUser) => matchUser.id === user.id) // Include directly matching users
      );
    }

    setFilteredUsers(filtered);

    // If there are search results and they include nested users,
    // expand their parent rows automatically
    if (query && filtered.length > 0) {
      const restaurantIds = filtered
        .filter((user) => user.role !== "owner")
        .map((user) => user.restaurant_id);

      setExpandedRestaurants((prev): string[] => {
        const newExpanded = new Set([...prev, ...restaurantIds]);
        return Array.from(newExpanded) as string[];
      });
    } else if (!query) {
      // Clear expanded state when search is cleared
      setExpandedRestaurants([]);
    }
  }, [searchQuery, filterType, allUsers, resturantsOptions]);

  const handleToggleExpand = useCallback((restaurantId: string) => {
    setExpandedRestaurants((prev) =>
      prev.includes(restaurantId)
        ? prev.filter((id) => {
            setPlanView((prev) => ({ ...prev, isVisible: false }));
            return id !== restaurantId;
          })
        : [...prev, restaurantId]
    );
  }, []);
  const handleModalOpen = useCallback((type: ModalState["type"], data?: any) => {
    setModalState({ type, data });
  }, []);
  const handleModalClose = useCallback(() => {
    setModalState({ type: "empty" });
  }, []);

  const handleUserUpdate = useCallback((updatedUser: IUserDetails) => {
    setAllUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );
  }, []);

  const handleNewUser = useCallback((newUser: IUserDetails) => {
    setAllUsers((prevUsers) => [newUser, ...prevUsers]);
  }, []);

  const handleRowClick = useCallback((user: IUserDetails) => {
    setSelectedUser(user);
    setDrawerState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  useEffect(() => {
    if (user) {
      if (user?.role !== "flapjack") {
        setShouldShowPrivatePage(true);
        setIsLoading(false);
      } else {
        const getOptions = async () => {
          const options: any = await fetchResturants(user);
          setResturantsOptions(options);
          setIsLoading(false);
        };
        getOptions();
      }
    }
  }, [user]);
  if (isLoading) {
    return <CustomLoader />;
  }
  if (shouldShowPrivatePage) {
    return <PrivatePage subtitle="You are not Welcomed here!" />;
  }

  const onRemove = async () => {
    if (!selectedUser || !supabase) return;
    // setisLoading(true);
    // Update the user's restaurant_id to empty
    const { data, error } = await supabase.from("profiles").delete().eq("id", selectedUser.id);

    if (error) {
      alert("Something went wrong");
      // setisLoading(false);
      // setmodalType("empty");
      setModalState({ type: "empty" });
      return;
    }
    const res = await supabase.auth.admin.deleteUser(selectedUser.id);
    const filterList = allUsers?.filter((user) => user.id !== selectedUser.id);
    setAllUsers(filterList);
    // setisLoading(false);

    // setmodalType("empty");
    setModalState({ type: "empty" });
  };

  const handlePlanUpdate = async () => {
    // Implement plan update logic here
    console.log("Updating plan:", planView.selectedPlan);
  };
  return (
    <Paper bg="white" mih="100vh">
      <Container size="xl" pt={10}>
        {/* Reserve space for the plan view to prevent layout shifts */}
        {/* <PlanDrawer
          opened={drawerState.isOpen}
          onClose={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
          selectedUser={selectedUser}
          onUpdatePlan={handlePlanUpdate}
        /> */}

        {/* Search and action buttons */}
        <Flex justify="space-between" align="center" my={10}>
          <Flex gap="md">
            <TextInput
              placeholder="Search..."
              data-test-id={DATA_TEST_IDS.INDEX.FIELD_1}
              styles={(theme) => ({
                input: {
                  border: "none",
                  borderBottom: `1px solid ${theme.colors.orange[2]}`,
                  borderBottomRightRadius: 0,
                  borderBottomLeftRadius: 0,

                  transition: "box-shadow 0.2s ease",
                  "&::placeholder": {
                    color: `${theme.colors.orange[3]}`,
                  },
                  "&:focus, &:focus-within": {
                    outline: "none !important",
                    border: "none !important",
                    borderBottom: `1px solid ${theme.colors.orange[4]} !important`,
                    borderBottomRightRadius: 0,
                    borderBottomLeftRadius: 0,
                    boxShadow: `0px 0px 5px 0px ${theme.colors.orange[3]}`,
                  },
                },
              })}
              icon={<IconSearch size="1rem" />}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              w={1000}
              onFocus={() => {
                setPlanView((prev) => ({ ...prev, isVisible: false }));
              }}
            />
          </Flex>
          <Flex>
            <Button
              size="xs"
              data-test-id={DATA_TEST_IDS.ADDNEWUSER.BUTTON_1}
              color="orange"
              onClick={() => handleModalOpen("addUser")}
              sx={{ marginRight: "1rem" }}
            >
              Add User
            </Button>
            {/* <Button
              size="xs"
              color="orange"
              data-test-id={DATA_TEST_IDS.INDEX.BUTTON_1}
              onClick={() => handleModalOpen("addRestaurant")}
              sx={{ marginRight: "1rem" }}
            >
              Add Restaurant
            </Button> */}
          </Flex>
        </Flex>

        {/* Users table */}
        <UsersTable
          data={filteredUsers}
          resturantsOptions={resturantsOptions}
          onEdit={(user) => handleModalOpen("editUser", user)}
          onRowClick={handleRowClick}
          expandedRestaurants={expandedRestaurants}
          onToggleExpand={handleToggleExpand}
          isDashboard={true}
        />

        <DashboardModals
          modalState={modalState}
          onClose={handleModalClose}
          onUserUpdate={handleUserUpdate}
          onUserAdd={handleNewUser}
          resturantsOptions={resturantsOptions}
        />
      </Container>
    </Paper>
  );
};

export default Dashboard;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .neq("restaurant_id", null);

  return {
    props: {
      profiles: data,
    },
  };
}
