// components/TemplateGallery/TemplateView/DefaultUserView.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Container, Text, SimpleGrid, Transition, Group } from "@mantine/core";
import { useRouter } from "next/router";
import { IconMistOff } from "@tabler/icons";
import TemplateHeader from "@Components/Header";
import TemplateCard from "../TemplateCard";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { useModal } from "../../../context/ModalContext";
import { CustomLoader } from "@Components/CommonComponents/CustomLoader";
import { APP_CONFIG } from "@Contants/app";

const DefaultUserView = React.memo(() => {
  const router = useRouter();
  const { openModal } = useModal();

  // Get state from store with selective subscription to prevent unnecessary re-renders
  const activeTab = useTemplateStore((state) => state.activeTab);
  const setActiveTab = useTemplateStore((state) => state.setActiveTab);
  const groupedMenus = useTemplateStore((state) => state.groupedMenus);
  const loading = useTemplateStore((state) => state.loading);
  const search = useTemplateStore((state) => state.search);

  // Local animation state
  const [visibleCards, setVisibleCards] = useState<{ [key: string]: boolean }>({});
  const mountedRef = useRef(true);

  // Initialize animation on mount
  useEffect(() => {
    mountedRef.current = true;
    // Trigger card visibility animation after a short delay
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setVisibleCards({ default: true });
      }
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  // Handler for template actions
  const handleTemplateAction = useCallback(
    (action: string, template: ITemplateDetails) => {
      openModal(action as any, template);
    },
    [openModal]
  );

  // Handler for edit thumbnail
  const handleEditThumbnail = useCallback(
    (template: ITemplateDetails) => {
      openModal("coverImage", template);
    },
    [openModal]
  );

  // Memoize common styles to prevent object recreation on each render
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

  // Memoize filtered grouped menus
  const filteredGroupedMenus = useMemo(() => {
    const result: { [key: string]: ITemplateDetails[] } = {};

    Object.entries(groupedMenus).forEach(([location, menus]: [string, ITemplateDetails[]]) => {
      // Filter to only include global menus and apply search filter
      result[location] = menus.filter(
        (menu) =>
          menu.isGlobal === true &&
          (!search || menu.name?.toLowerCase().includes(search.toLowerCase()))
      );
    });

    return result;
  }, [groupedMenus, search]);

  // Memoize sorted locations
  const sortedLocations = useMemo(() => {
    return Object.entries(filteredGroupedMenus).sort(([locationA], [locationB]) => {
      // Check if either location is a special case that should go at the end
      const isOtherMenusA =
        locationA === APP_CONFIG.LOCATION.DEFAULT || locationA === APP_CONFIG.LOCATION.REPLACEMENT;
      const isOtherMenusB =
        locationB === APP_CONFIG.LOCATION.DEFAULT || locationB === APP_CONFIG.LOCATION.REPLACEMENT;

      // Put special cases at the end
      if (isOtherMenusA && !isOtherMenusB) return 1;
      if (!isOtherMenusA && isOtherMenusB) return -1;

      // For normal locations, sort alphabetically
      return locationA.localeCompare(locationB);
    });
  }, [filteredGroupedMenus]);

  // Check if there are any global menus across all locations
  const hasAnyGlobalMenus = useMemo(
    () =>
      Object.values(filteredGroupedMenus).some(
        (menus: ITemplateDetails[]) => menus && menus.length > 0
      ),
    [filteredGroupedMenus]
  );

  // Generate a timestamp for cache-busting image URLs
  const timestamp = useMemo(() => Date.now(), []);

  // Show loading state while templates are being fetched
  if (loading) {
    return (
      <>
        <TemplateHeader setNavMenu={setActiveTab} navMenu={activeTab} />
        <Container size="xl" px="xl" pt={16}>
          <div style={emptyContainerStyles}>
            <div style={emptyContentStyles}>
              <CustomLoader size={"lg"} />
            </div>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <TemplateHeader setNavMenu={setActiveTab} navMenu={activeTab} />
      <Container size="xl" px="xl" pt={16}>
        <Group position="apart" mb="md">
          <Text size={32} weight={200}>
            {router.query.myMenu && activeTab === "templates" ? "" : "My Menus"}
          </Text>
        </Group>

        {!hasAnyGlobalMenus ? (
          <div style={emptyContainerStyles}>
            <div style={emptyContentStyles}>
              <IconMistOff color="gray" size={24} stroke={1.5} />
              <Text color="dimmed" size="sm" mt="md">
                No global menus found
              </Text>
            </div>
          </div>
        ) : (
          <>
            {sortedLocations.map(([location, menus]: [string, ITemplateDetails[]], menuIndex) => {
              // Handle special location names
              const isOtherMenus =
                location === APP_CONFIG.LOCATION.REPLACEMENT ||
                location === APP_CONFIG.LOCATION.DEFAULT;
              const displayLocation = isOtherMenus ? APP_CONFIG.LOCATION.REPLACEMENT : location;

              // Create delay for staggered animation
              const sectionDelay = menuIndex * 100;

              return (
                <Transition
                  key={menuIndex}
                  mounted={true}
                  transition="slide-up"
                  duration={400}
                  timingFunction="ease"
                  exitDuration={200}
                >
                  {(styles) => (
                    <div
                      style={{
                        ...styles,
                        transitionDelay: `${sectionDelay}ms`,
                      }}
                    >
                      {sortedLocations.length > 1 && (
                        <Text size="xl" weight="normal" my="md">
                          {displayLocation}
                        </Text>
                      )}

                      {menus?.length ? (
                        <SimpleGrid
                          cols={4}
                          breakpoints={[
                            { maxWidth: 1120, cols: 3, spacing: "md" },
                            { maxWidth: 991, cols: 2, spacing: "sm" },
                            { maxWidth: 600, cols: 1, spacing: "sm" },
                          ]}
                          sx={{ marginBottom: 40 }}
                        >
                          {menus.map((template: ITemplateDetails, templateIndex: number) => {
                            // Create delay for staggered animation
                            const cardDelay = sectionDelay + templateIndex * 50;

                            return (
                              <Transition
                                key={templateIndex}
                                mounted={visibleCards.default === true}
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
                                      thumbnail={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/renderings/${template.id}/coverImage?${templateIndex}${timestamp}`}
                                      onAction={(action) => handleTemplateAction(action, template)}
                                      onEditThumbnail={() => handleEditThumbnail(template)}
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
                              No menus found
                            </Text>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Transition>
              );
            })}
          </>
        )}
      </Container>
    </>
  );
});

DefaultUserView.displayName = "DefaultUserView";

export default DefaultUserView;
