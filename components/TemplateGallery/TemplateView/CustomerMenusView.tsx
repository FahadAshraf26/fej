// components/TemplateGallery/TemplateView/CustomerMenusView.tsx
import React, { useCallback, useRef, useState } from "react";
import {
  Container,
  TextInput,
  Group,
  Box,
  Text,
  Badge,
  ActionIcon,
  Popover,
  Checkbox,
  Stack,
} from "@mantine/core";
import { IconSearch, IconFilter } from "@tabler/icons";
import TemplateHeader from "@Components/Header";
import { CollapsibleCustomerMenusInfo } from "@Components/TemplateGallery/TemplateInfoPanel";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { useUserContext } from "../../../context/UserContext";
import { RestaurantAccordion } from "./RestaurantAccordion";
import { useModal } from "../../../context/ModalContext";
import SkeletonLoader from "@Components/CommonComponents/Skeleton";
import { DeleteRestaurantModal } from "./DeleteRestaurantModal";

const CustomerMenusView = React.memo(() => {
  const { user } = useUserContext();
  const { openModal } = useModal();
  const accordionContainerRef = useRef<HTMLDivElement>(null);
  const [deletingRestaurantId, setDeletingRestaurantId] = useState<string | null>(null);

  // Get state and actions directly from the store
  const {
    activeTab,
    search,
    statusFilter,
    setActiveTab,
    setSearch,
    setStatusFilter,
    deleteRestaurant,
    userInput,
    deleteModalState,
    loading,
  } = useTemplateStore((state) => ({
    activeTab: state.activeTab,
    search: state.search,
    statusFilter: state.statusFilter,
    setActiveTab: state.setActiveTab,
    setSearch: state.setSearch,
    setStatusFilter: state.setStatusFilter,
    deleteRestaurant: state.deleteRestaurant,
    userInput: state.userInput,
    deleteModalState: state.deleteModalState,
    loading: state.loading,
  }));

  // Handle search input change
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(event.currentTarget.value);
    },
    [setSearch]
  );

  // Handle  status filter change
  const handleStatusFilterChange = useCallback(
    (status: string, checked: boolean) => {
      if (status === "all") {
        setStatusFilter([]);
      } else {
        const currentFilters = statusFilter.includes("all") ? [] : statusFilter;
        if (checked) {
          setStatusFilter([...currentFilters, status]);
        } else {
          setStatusFilter(currentFilters.filter((f) => f !== status));
        }
      }
    },
    [statusFilter, setStatusFilter]
  );

  // Get effective status filter (if empty, treat as "all")
  const effectiveStatusFilter = statusFilter.length === 0 ? ["all"] : statusFilter;

  // Get filter count for badge (exclude "all" from count)
  const filterCount = statusFilter.filter((f) => f !== "all").length;

  // Handle restaurant deletion
  const handleDeleteRestaurant = useCallback(async () => {
    const { restaurantId, restaurantName } = deleteModalState;

    if (!restaurantId || userInput !== restaurantName) {
      alert("The restaurant name you entered does not match. Please try again.");
      return;
    }

    try {
      await deleteRestaurant(restaurantId);
    } catch (error) {
      console.error("Error deleting restaurant:", error);
    }
  }, [deleteModalState, userInput, deleteRestaurant]);

  // Handle template edit thumbnail
  const handleEditThumbnail = useCallback(
    (template: ITemplateDetails) => {
      openModal("coverImage", template);
    },
    [openModal]
  );

  // Handle restaurant delete dialog
  const handleOpenDeleteRestaurant = useCallback((restaurantId: string, restaurantName: string) => {
    // Set loading state for this specific restaurant
    setDeletingRestaurantId(restaurantId);

    // This uses store actions to open the delete modal instead of modal context
    // because it's a special case that includes getting stats from the API first
    const getRestaurantStats = useTemplateStore.getState().getRestaurantStats;
    const openDeleteModal = async () => {
      try {
        // Get menu and user counts
        const stats = await getRestaurantStats(restaurantId);

        // Use store action to open modal
        useTemplateStore.getState().setDeleteModalState({
          isOpen: true,
          restaurantId,
          restaurantName,
          menuCount: stats.menuCount,
          userCount: stats.userCount,
        });
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
      } finally {
        // Clear loading state
        setDeletingRestaurantId(null);
      }
    };

    openDeleteModal();
  }, []);

  return (
    <>
      <TemplateHeader setNavMenu={setActiveTab} navMenu={activeTab} />

      {(user?.restaurant_id || user?.role === "flapjack") && (
        <Container size="xl" px="xl" pt={16}>
          <CollapsibleCustomerMenusInfo />

          {/* Enhanced Filters Section */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "32px",
              border: "1px solid #e1e5e9",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1)",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #FF6B35 0%, #ff8c00 100%)",
              },
            }}
          >
            <Group spacing="lg" align="flex-end" sx={{ flexWrap: "nowrap" }}>
              <TextInput
                placeholder="Search restaurants by name..."
                sx={{ flexGrow: 1 }}
                disabled={loading}
                icon={<IconSearch style={{ width: 18, height: 18 }} stroke={2} color="#6c757d" />}
                value={search}
                onChange={handleSearchChange}
                styles={{
                  input: {
                    border: "1px solid #e9ecef",
                    borderRadius: "8px",
                    fontSize: "14px",
                    padding: "12px 16px",
                    transition: "all 0.2s ease",
                    backgroundColor: "#ffffff",
                    "&:focus": {
                      // borderColor: "#FF6B35",
                      boxShadow: "0 0 0 3px rgba(255, 107, 53, 0.1)",
                      backgroundColor: "#ffffff",
                    },
                    "&:hover": {
                      borderColor: "#ced4da",
                    },
                    "&::placeholder": {
                      color: "#adb5bd",
                      fontWeight: 400,
                    },
                  },
                  icon: {
                    marginLeft: "6px",
                  },
                }}
              />

              <Popover
                position="bottom-end"
                width={280}
                closeOnClickOutside={true}
                withinPortal={true}
                transition="pop-top-right"
                transitionDuration={250}
                styles={{
                  dropdown: {
                    border: "1px solid #E9ECEF",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    padding: "12px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                    overflowY: "auto",
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": {
                      display: "none",
                    },
                  },
                }}
              >
                <Popover.Target>
                  <ActionIcon
                    size="lg"
                    variant="filled"
                    color="orange"
                    sx={{
                      border: "2px solid #e9ecef",
                      borderRadius: "8px",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#ff8c00",
                        boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                      },
                    }}
                  >
                    <IconFilter size={18} stroke={2} />
                    {filterCount > 0 && (
                      <Badge
                        color="orange"
                        variant="light"
                        sx={{
                          position: "absolute",
                          top: -5,
                          right: -5,
                          height: 18,
                          minWidth: 18,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "0 4px",
                          pointerEvents: "none",
                          border: "2px solid white",
                        }}
                      >
                        {filterCount}
                      </Badge>
                    )}
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack spacing={0}>
                    <Text size="sm" weight={600} color="#2c3e50" mb="sm">
                      Filter by Status
                    </Text>
                    {[
                      { value: "all", label: "All Statuses" },
                      { value: "active", label: "Active" },
                      { value: "trialing", label: "Trialing" },
                      { value: "partially active", label: "Partially Active" },
                      // { value: "past due", label: "Past Due" },
                      { value: "inactive", label: "Inactive" },
                      { value: "failed", label: "Failed" },
                      { value: "unknown", label: "Unknown" },
                    ].map((status) => (
                      <Box
                        key={status.value}
                        sx={(theme) => ({
                          padding: "8px 12px",
                          borderRadius: theme.radius.sm,
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          "&:hover": {
                            backgroundColor: theme.colors.gray[0],
                          },
                        })}
                      >
                        <Checkbox
                          label={status.label}
                          checked={
                            status.value === "all"
                              ? statusFilter.length === 0
                              : statusFilter.includes(status.value)
                          }
                          onChange={(event) =>
                            handleStatusFilterChange(status.value, event.currentTarget.checked)
                          }
                          styles={{
                            root: { width: "100%" },
                            label: {
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#495057",
                              cursor: "pointer",
                            },
                            input: {
                              cursor: "pointer",
                              "&:checked": { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            </Group>
          </Box>
          {loading ? (
            <SkeletonLoader showRowSkeletons={true} />
          ) : (
            <div
              ref={accordionContainerRef}
              style={{
                maxHeight: "calc(100vh - 200px)",
                overflowY: "auto",
                position: "relative",
              }}
            >
              <RestaurantAccordion
                onEditThumbnail={handleEditThumbnail}
                onDeleteRestaurant={handleOpenDeleteRestaurant}
                containerRef={accordionContainerRef}
                deletingRestaurantId={deletingRestaurantId}
              />
            </div>
          )}
        </Container>
      )}

      <DeleteRestaurantModal onDeleteRestaurant={handleDeleteRestaurant} />
    </>
  );
});

CustomerMenusView.displayName = "CustomerMenusView";

export default CustomerMenusView;
