// components/TemplateGallery/TemplateView/RestaurantAccordion.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Accordion,
  Group,
  Text,
  Box,
  Tooltip,
  ActionIcon,
  SimpleGrid,
  Loader,
  Transition,
  Badge,
} from "@mantine/core";
import { IconTrash, IconLayoutDashboard, IconMistOff } from "@tabler/icons";
import _ from "lodash";

import { ITemplateDetails } from "../../../interfaces/ITemplate";
import TemplateCard from "../TemplateCard";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { useUserContext } from "../../../context/UserContext";
import { useModal } from "../../../context/ModalContext";
import { APP_CONFIG } from "@Contants/app";

interface RestaurantAccordionProps {
  onEditThumbnail: (template: ITemplateDetails) => void;
  onDeleteRestaurant: (restaurantId: string, restaurantName: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  deletingRestaurantId?: string | null;
}

// Add status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "green";
      case "trialing":
        return "blue";
      case "partially active":
        return "yellow";
      case "past due":
        return "orange";
      case "inactive":
        return "red";
      case "failed":
        return "red";
      case "unknown":
        return "gray";
      default:
        return "gray";
    }
  };

  const getStatusLabel = (status: string) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  let parsedStatuses = null;

  try {
    const maybeParsed = JSON.parse(status);
    if (maybeParsed && typeof maybeParsed === "object") {
      parsedStatuses = maybeParsed;
    }
  } catch (error) {
    console.error("Error parsing status:", error);
  }

  if (parsedStatuses) {
    const keys = Object.keys(parsedStatuses).sort((a, b) => {
      if (a === "Editor") return 1;
      if (b === "Editor") return -1;
      return 0;
    });
    // If no keys, return unknown
    if (keys.length === 0) {
      return (
        <Badge
          color={getStatusColor("unknown")}
          variant="light"
          size="sm"
          sx={{ marginRight: "0.5rem" }}
        >
          {getStatusLabel("unknown")}
        </Badge>
      );
    }

    return (
      <>
        {keys.map((key, index) => {
          return (
            <Group key={key} spacing="xs" align="center">
              <Text size="xs" color="dimmed">
                {key}:
              </Text>
              <Badge
                color={getStatusColor(parsedStatuses[key])}
                variant="light"
                size="sm"
                sx={{ marginRight: "0.5rem" }}
              >
                {getStatusLabel(parsedStatuses[key])}
              </Badge>
              {index < keys.length - 1 && (
                <Text style={{ color: "#d6d4d4" }} size="sm">
                  |
                </Text>
              )}
            </Group>
          );
        })}
      </>
    );
  }
};

export const RestaurantAccordion = React.memo(
  ({
    onEditThumbnail,
    onDeleteRestaurant,
    containerRef,
    deletingRestaurantId,
  }: RestaurantAccordionProps) => {
    const { user } = useUserContext();
    const { openModal } = useModal();

    // Get state and actions from the store
    const {
      filteredRestaurants,
      openAccordionTab,
      setOpenAccordionTab,
      loadingMenus,
      groupedMenus,
      hasMenus,
      visibleCards,
      setLoadingMenus,
      setHasMenus,
      setVisibleCards,
      setTemplates,
      updateGroupedMenus,
      fetchTemplatesByRestaurantId,
      getThumbnailUrl,
    } = useTemplateStore((state) => ({
      filteredRestaurants: state.filteredRestaurants,
      openAccordionTab: state.openAccordionTab,
      setOpenAccordionTab: state.setOpenAccordionTab,
      loadingMenus: state.loadingMenus,
      groupedMenus: state.groupedMenus,
      hasMenus: state.hasMenus,
      visibleCards: state.visibleCards,
      setLoadingMenus: state.setLoadingMenus,
      setGroupedMenus: state.setGroupedMenus,
      setHasMenus: state.setHasMenus,
      setVisibleCards: state.setVisibleCards,
      setTemplates: state.setTemplates,
      updateGroupedMenus: state.updateGroupedMenus,
      fetchTemplatesByRestaurantId: state.fetchTemplatesByRestaurantId,
      getThumbnailUrl: state.getThumbnailUrl,
    }));
    // Refs for components
    const accordionItemRefs = useRef<{
      [key: string]: React.RefObject<HTMLDivElement>;
    }>({});
    const mountedRef = useRef(true);

    // Get store state and actions
    const templates = useTemplateStore((state) => state.templates);

    // Initialize refs for accordion items
    useEffect(() => {
      filteredRestaurants?.forEach((restaurant) => {
        if (restaurant?.value && !accordionItemRefs.current[restaurant.value]) {
          accordionItemRefs.current[restaurant.value] = React.createRef();
        }
      });
    }, [filteredRestaurants]);

    // Track if we've already fetched data for each tab
    const hasFetchedRef = useRef<{ [key: string]: boolean }>({});

    // Handle template actions
    const handleTemplateAction = useCallback(
      (action: string, template: ITemplateDetails) => {
        openModal(action as any, template);
      },
      [openModal]
    );

    // Update groupedMenus and hasMenus whenever templates change
    useEffect(() => {
      if (templates && templates.length > 0) {
        updateGroupedMenus(templates);
      } else {
        updateGroupedMenus([]);
      }
    }, [templates, updateGroupedMenus]);

    const fetchTemplatesForRestaurant = useCallback(
      async (restaurantId: string) => {
        if (!restaurantId) return;

        setLoadingMenus(restaurantId, true);
        setVisibleCards(restaurantId, false);
        setHasMenus(false);
        setTemplates([]);
        updateGroupedMenus([]);

        try {
          const templatesData = await fetchTemplatesByRestaurantId(restaurantId);

          if (mountedRef.current) {
            setLoadingMenus(restaurantId, false);
            setTemplates(templatesData || []);

            // Ensure state updates are synchronized
            setTimeout(() => {
              if (mountedRef.current) {
                setVisibleCards(restaurantId, true);
              }
            }, 100);
          }

          return true;
        } catch (error) {
          console.error("Error fetching templates:", error);
          if (mountedRef.current) {
            setLoadingMenus(restaurantId, false);
            setHasMenus(false);
            setTemplates([]);
            updateGroupedMenus([]);
          }
        }
      },
      [
        fetchTemplatesByRestaurantId,
        setLoadingMenus,
        setVisibleCards,
        setHasMenus,
        setTemplates,
        updateGroupedMenus,
      ]
    );

    // Track component mount status and handle initial load
    useEffect(() => {
      mountedRef.current = true;
      // If there's an open accordion tab when component mounts, fetch its templates
      if (openAccordionTab && openAccordionTab.trim() !== "") {
        fetchTemplatesForRestaurant(openAccordionTab);
      }
      return () => {
        mountedRef.current = false;
      };
    }, [openAccordionTab, fetchTemplatesForRestaurant]);

    // Effect for scrolling to active accordion
    useEffect(() => {
      if (
        openAccordionTab &&
        accordionItemRefs.current[openAccordionTab]?.current &&
        containerRef.current
      ) {
        // Small delay to allow accordion to expand
        setTimeout(() => {
          const element = accordionItemRefs.current[openAccordionTab]?.current;
          if (!element || !containerRef.current) return;

          // Get element position relative to the container
          const containerRect = containerRef.current.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();

          // Calculate the element's position relative to the container's scroll position
          const elementTop = element.offsetTop;
          const containerScrollTop = containerRef.current.scrollTop;
          const headerHeight = 60;

          // Scroll the container to position the element at the top
          containerRef.current.scrollTo({
            top: elementTop - headerHeight,
            behavior: "smooth",
          });
        }, 300);
      }
    }, [openAccordionTab, containerRef]);

    // Add effect to preserve accordion state when switching tabs
    useEffect(() => {
      // Get the active tab from the store
      const activeTab = useTemplateStore.getState().activeTab;

      // If we have an open accordion tab and we're switching to a view that uses the accordion
      if (openAccordionTab && (activeTab === "myMenu" || activeTab === "customerMenus")) {
        // Ensure the accordion is expanded
        const accordionElement = accordionItemRefs.current[openAccordionTab]?.current;
        if (accordionElement) {
          // Force the accordion to be visible
          setTimeout(() => {
            if (containerRef.current) {
              const elementTop = accordionElement.offsetTop;
              containerRef.current.scrollTo({
                top: elementTop - 60,
                behavior: "smooth",
              });
            }
          }, 100);
        }
      }
    }, [openAccordionTab, containerRef]);

    // Handle accordion change
    const handleAccordionChange = useCallback(
      async (value: string) => {
        setOpenAccordionTab(value);
        if (value && value.trim() !== "") {
          await fetchTemplatesForRestaurant(value);
        }
      },
      [setOpenAccordionTab, fetchTemplatesForRestaurant]
    );

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        mountedRef.current = false;
      };
    }, []);

    // Reset states when component unmounts
    useEffect(() => {
      return () => {
        // Don't reset the templates or hasMenus state when unmounting
        // This helps preserve the state when switching between views
        // setTemplates([]);
        // setHasMenus(false);
        // updateGroupedMenus([]);

        // Reset loading and visible states for all restaurants
        filteredRestaurants?.forEach((restaurant) => {
          if (restaurant?.value) {
            setLoadingMenus(restaurant.value, false);
            setVisibleCards(restaurant.value, false);
          }
        });
      };
    }, [setLoadingMenus, setVisibleCards, filteredRestaurants]);

    // Memoized styles
    const emptyContainerStyles = useMemo(
      () => ({
        minHeight: "160px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        padding: "32px 0",
        boxSizing: "border-box" as const,
      }),
      []
    );

    const emptyContentStyles = useMemo(
      () => ({
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }),
      []
    );

    // Timestamp for cache busting
    const timestamp = useMemo(() => Date.now(), []);

    return (
      <Accordion
        onChange={async (value: string) => {
          await handleAccordionChange(value);
        }}
      >
        {filteredRestaurants
          ?.filter((restaurant) => restaurant?.value !== "2")
          .map((filteredRestaurant, i) => {
            const isAccordionOpen = openAccordionTab === filteredRestaurant?.value;
            const isLoading =
              openAccordionTab === filteredRestaurant?.value &&
              loadingMenus[filteredRestaurant?.value];

            return (
              <Accordion.Item
                key={i}
                value={filteredRestaurant?.value as string}
                sx={{
                  position: "relative",
                  boxShadow: isAccordionOpen ? "0 2px 8px rgba(0, 0, 0, 0.08)" : "none",
                  borderRadius: isAccordionOpen ? "4px" : "0",
                  margin: isAccordionOpen ? "4px 0" : "0",
                  transition: "box-shadow 0.3s ease, margin 0.3s ease, border-radius 0.3s ease",
                  overflow: "hidden",
                  border: isAccordionOpen ? "1px solid #f0f0f0" : "none",
                  borderBottom: "1px solid #E9ECEF",
                }}
                ref={accordionItemRefs.current[filteredRestaurant?.value as string]}
              >
                <Accordion.Control
                  sx={{
                    boxShadow: isAccordionOpen ? "0 2px 8px rgba(0, 0, 0, 0.08)" : "none",
                    ":hover": {
                      backgroundColor: isAccordionOpen ? "transparent" : "#FFF8F0",
                    },
                  }}
                >
                  <Text>{filteredRestaurant?.label}</Text>
                </Accordion.Control>
                {/* Right-side controls: status badge and action buttons */}
                <Box
                  sx={{
                    position: "absolute",
                    right: "2rem",
                    top: "1.1rem",
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    pointerEvents: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <StatusBadge status={filteredRestaurant?.subscriptionStatus || "unknown"} />
                  {isAccordionOpen && (
                    <>
                      <Tooltip
                        label={`Open ${filteredRestaurant.label}'s Dashboard`}
                        position="top"
                        withArrow
                      >
                        <a
                          href={`/restaurant/${filteredRestaurant.value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${filteredRestaurant.label}'s Dashboard`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            color: "inherit",
                          }}
                        >
                          <IconLayoutDashboard size={18} stroke={1.5} color="orange" />
                        </a>
                      </Tooltip>
                      <ActionIcon
                        size="md"
                        variant="filled"
                        color="orange"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteRestaurant(
                            filteredRestaurant.value as string,
                            filteredRestaurant.label as string
                          );
                        }}
                        aria-label={`Delete ${filteredRestaurant.label}`}
                        disabled={deletingRestaurantId === filteredRestaurant.value}
                        sx={{
                          "&:hover": {
                            backgroundColor: "#ff8c00",
                          },
                          "&:disabled": {
                            backgroundColor: "#ff6b35",
                            opacity: 0.7,
                            cursor: "not-allowed",
                          },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {deletingRestaurantId === filteredRestaurant.value ? (
                          <Loader size="xs" color="white" />
                        ) : (
                          <IconTrash size="1rem" />
                        )}
                      </ActionIcon>
                    </>
                  )}
                </Box>

                <Accordion.Panel>
                  {isLoading ? (
                    <div style={emptyContainerStyles}>
                      <div style={emptyContentStyles}>
                        <Loader color="orange" size="md" variant="dots" />
                      </div>
                    </div>
                  ) : (
                    <>
                      {!hasMenus ? (
                        <div style={emptyContainerStyles}>
                          <div style={emptyContentStyles}>
                            <IconMistOff color="gray" size={24} stroke={1.5} />
                            <Text color="dimmed" size="sm" mt="md">
                              No menu found
                            </Text>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isAccordionOpen &&
                            Object.entries(groupedMenus).map(
                              ([location, menus]: [string, Array<any>], menuIndex) => {
                                // Skip empty "Other Menus" section
                                const isOtherMenus =
                                  location === APP_CONFIG.LOCATION.REPLACEMENT ||
                                  location === APP_CONFIG.LOCATION.DEFAULT;
                                const hasNoMenus = !menus.length;

                                if (isOtherMenus && hasNoMenus) {
                                  return null;
                                }

                                if (isOtherMenus) {
                                  location = APP_CONFIG.LOCATION.REPLACEMENT;
                                }

                                return (
                                  <Transition
                                    key={menuIndex}
                                    mounted={isAccordionOpen && !isLoading}
                                    transition="slide-up"
                                    duration={400}
                                    timingFunction="ease"
                                    exitDuration={200}
                                  >
                                    {(styles) => (
                                      <div
                                        style={{
                                          ...styles,
                                          transitionDelay: `${menuIndex * 100}ms`,
                                        }}
                                      >
                                        {Object.keys(groupedMenus).length > 1 && (
                                          <Text size="xl" weight="normal" my="md">
                                            {location}
                                          </Text>
                                        )}

                                        {menus?.length ? (
                                          <SimpleGrid
                                            cols={4}
                                            breakpoints={[
                                              {
                                                maxWidth: 1120,
                                                cols: 3,
                                                spacing: "md",
                                              },
                                              {
                                                maxWidth: 991,
                                                cols: 2,
                                                spacing: "sm",
                                              },
                                              {
                                                maxWidth: 600,
                                                cols: 1,
                                                spacing: "sm",
                                              },
                                            ]}
                                            sx={{ marginBottom: 40 }}
                                          >
                                            {menus.map((template: any, templateIndex: number) => {
                                              if (!isAccordionOpen) return null;

                                              // Create delay for staggered animation
                                              const cardDelay =
                                                menuIndex * 100 + templateIndex * 50;

                                              return (
                                                <Transition
                                                  key={templateIndex}
                                                  mounted={
                                                    visibleCards[
                                                      filteredRestaurant.value as string
                                                    ] === true
                                                  }
                                                  transition="pop"
                                                  duration={400}
                                                  timingFunction="ease"
                                                >
                                                  {(cardStyles) => (
                                                    <div
                                                      style={{
                                                        ...cardStyles,
                                                        transitionDelay: `${cardDelay}ms`,
                                                      }}
                                                    >
                                                      <TemplateCard
                                                        template={template}
                                                        thumbnail={
                                                          template.hasThumbnail
                                                            ? getThumbnailUrl(template.id) ??
                                                              undefined
                                                            : undefined
                                                        }
                                                        onAction={(action) =>
                                                          handleTemplateAction(action, template)
                                                        }
                                                        onEditThumbnail={() =>
                                                          onEditThumbnail(template)
                                                        }
                                                      />
                                                    </div>
                                                  )}
                                                </Transition>
                                              );
                                            })}
                                          </SimpleGrid>
                                        ) : (
                                          <div style={emptyContainerStyles}>
                                            <div style={emptyContentStyles}>
                                              <IconMistOff color="gray" size={24} stroke={1.5} />
                                              <Text color="dimmed" size="sm" mt="md">
                                                No menu found
                                              </Text>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </Transition>
                                );
                              }
                            )}
                        </>
                      )}
                    </>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
      </Accordion>
    );
  }
);

RestaurantAccordion.displayName = "RestaurantAccordion";
