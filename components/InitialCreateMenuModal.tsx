import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  TextInput,
  Select,
  Textarea,
  Box,
  Stack,
  Group,
  Text,
  Alert,
  Divider,
  ThemeIcon,
  Button,
  Tabs,
  Loader,
} from "@mantine/core";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@database/client.connection";
import { IUserDetails } from "interfaces/IUserDetails";
import { useRouter } from "next/router";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { fetchResturants, fetchResturantLocations } from "@Hooks/useUser";
import CommonModal from "./CommonComponents/Modal";
import {
  IconBuildingStore,
  IconMapPin,
  IconTemplate,
  IconFileDescription,
  IconInfoCircle,
  IconLayoutGrid,
  IconAlertCircle,
  IconFile,
  IconPlus,
} from "@tabler/icons";
import { Location } from "interfaces/IRestaurantList";
import { APP_CONFIG } from "@Contants/app";
import { PSDImportModal } from "./PSDImport/PSDImportModal";

const onCreateMenu = async (
  basicTemplate: any,
  user: IUserDetails,
  router: any,
  setIsCreateMenu: Dispatch<SetStateAction<boolean>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  menuName: string,
  menuDescription: string,
  selectedRestaurantId: string,
  selectedLocation: Location | null,
  isRestaurantAutoLayout: boolean,
  setError: Dispatch<SetStateAction<string>>
) => {
  setIsLoading(true);
  try {
    if (!basicTemplate) {
      throw new Error("Template data is not available. Please try again.");
    }

    if (!basicTemplate.content) {
      throw new Error("Template content is missing. Please try again.");
    }

    const newContentId = uuidv4();
    const { data: storageLink, error: coppyError } = await supabase.storage
      .from("templates")
      .copy(basicTemplate.content, newContentId);

    if (coppyError) throw coppyError;

    const { data: duplicateData, error: duplicateError } = await supabase
      .from("templates")
      .insert({
        name: menuName,
        description: menuDescription,
        content: newContentId,
        isGlobal: user?.role === "flapjack" ? false : true,
        restaurant_id: selectedRestaurantId,
        createdBy: user?.id,
        created_at: new Date(),
        updatedAt: new Date(),
        location: selectedLocation?.name || null,
        locationId: selectedLocation?.id || null,
        isAutoLayout: isRestaurantAutoLayout,
      })
      .select();

    if (duplicateError) throw duplicateError;

    if (!basicTemplate.pages || basicTemplate.pages.length === 0) {
      throw new Error("Template pages are missing. Please try again.");
    }

    const page = basicTemplate.pages[0];
    const { data: newPage, error: pageError } = await supabase.from("pages").insert({
      ...page,
      id: undefined,
      menu_id: duplicateData[0].id,
      pageUniqueId: uuidv4(),
    });

    if (pageError) throw pageError;

    router.push(`/menu/${duplicateData[0].id}`);
    setIsLoading(false);
    setIsCreateMenu(false);
  } catch (error) {
    console.error("Error creating menu:", error);
    setError("Failed to create menu. Please try again.");
    setIsLoading(false);
  }
};

const onCreateMenuFromPSD = async (
  psdScene: any,
  fileName: string,
  user: IUserDetails,
  router: any,
  setIsCreateMenu: Dispatch<SetStateAction<boolean>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  menuName: string,
  menuDescription: string,
  selectedRestaurantId: string,
  selectedLocation: Location | null,
  isRestaurantAutoLayout: boolean,
  setError: Dispatch<SetStateAction<string>>
) => {
  setIsLoading(true);
  try {
    const newContentId = uuidv4();

    if (psdScene.meta?.isSplitFile && psdScene.meta?.chunkUrls) {
      console.log("Creating menu from split PSD file with chunks:", psdScene.meta.chunkUrls.length);

      const sceneData = {
        version: "1.0.0",
        meta: {
          name: psdScene.meta.name,
          created: psdScene.meta.created,
          isPSDImport: true,
          isSplitFile: true,
          chunkUrls: psdScene.meta.chunkUrls,
          totalChunks: psdScene.meta.totalChunks,
          originalFileName: psdScene.meta.originalFileName,
          fileSize: psdScene.meta.fileSize,
        },
        pages: psdScene.pages,
      };

      const sceneJson = JSON.stringify(sceneData);

      const { data: duplicateData, error: duplicateError } = await supabase
        .from("templates")
        .insert({
          name: menuName,
          description: menuDescription,
          content: newContentId,
          isGlobal: user?.role === "flapjack" ? false : true,
          restaurant_id: selectedRestaurantId,
          createdBy: user?.id,
          created_at: new Date(),
          updatedAt: new Date(),
          location: selectedLocation?.name || null,
          locationId: selectedLocation?.id || null,
          isAutoLayout: false,
          isPSDImport: true,
        })
        .select();

      if (duplicateError) throw duplicateError;

      const { error: sceneUploadError } = await supabase.storage
        .from("templates")
        .upload(`${newContentId}.json`, sceneJson, {
          contentType: "application/json",
          upsert: false,
        });

      if (sceneUploadError) throw sceneUploadError;

      router.push(`/menu/${duplicateData[0].id}`);
      setIsLoading(false);
      setIsCreateMenu(false);
      return;
    }

    if (!psdScene?.meta?.processedArchiveBlob && !psdScene?.meta?.isSplitFile) {
      throw new Error(
        "Invalid PSD scene data. Expected processedArchiveBlob or split file chunks."
      );
    }

    const blobKey = `psd_archive_${newContentId}`;
    if (psdScene.meta.processedArchiveBlob) {
      const { storeBlobInIndexedDB } = await import("@Helpers/IndexedDBStorage");
      await storeBlobInIndexedDB(blobKey, psdScene.meta.processedArchiveBlob);
    }

    const sceneData = {
      version: "1.0.0",
      meta: {
        name: psdScene.meta.name,
        created: psdScene.meta.created,
        isPSDImport: true,
        processedArchiveFileName: psdScene.meta.processedArchiveFileName,
        fileSize: psdScene.meta.fileSize,
        originalFileName: psdScene.meta.originalFileName,
        isProcessedArchive: true,
        needsFirstSave: true,
        processingMessages: psdScene.meta.processingMessages || [],
        ...(psdScene.meta.isSplitFile && {
          isSplitFile: true,
          chunkUrls: psdScene.meta.chunkUrls,
          totalChunks: psdScene.meta.totalChunks,
        }),
        ...(psdScene.meta.isMultiPSDImport && {
          isMultiPSDImport: true,
          pageNames: psdScene.meta.pageNames || [],
        }),
      },
      pages: psdScene.pages,
    };

    const sceneJson = JSON.stringify(sceneData);

    const { data: duplicateData, error: duplicateError } = await supabase
      .from("templates")
      .insert({
        name: menuName,
        description: menuDescription,
        content: newContentId,
        isGlobal: user?.role === "flapjack" ? false : true,
        restaurant_id: selectedRestaurantId,
        createdBy: user?.id,
        created_at: new Date(),
        updatedAt: new Date(),
        location: selectedLocation?.name || null,
        locationId: selectedLocation?.id || null,
        isAutoLayout: false,
        isPSDImport: true,
      })
      .select();

    if (duplicateError) throw duplicateError;

    const { error: sceneUploadError } = await supabase.storage
      .from("templates")
      .upload(`${newContentId}.json`, sceneJson, {
        contentType: "application/json",
        upsert: false,
      });

    if (sceneUploadError) throw sceneUploadError;

    router.push(`/menu/${duplicateData[0].id}`);
    setIsLoading(true);
  } catch (error) {
    console.error("Error creating menu from PSD:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to create menu from PSD. Please try again.";
    setError(message);
    toast(message, { type: "error" });
    setIsLoading(false);
  }
};

export const InitialCreateMenuModal = ({
  basicTemplate,
  user,
  setIsCreateMenu,
  isCreateMenu,
}: {
  basicTemplate: any;
  user: any;
  setIsCreateMenu: Dispatch<SetStateAction<boolean>>;
  isCreateMenu: boolean;
}) => {
  const router = useRouter();
  const [loading, setIsLoading] = useState<boolean>(false);
  const [menuName, setMenuName] = useState<string>(basicTemplate?.name || "");
  const [menuDescription, setMenuDescription] = useState<string>("Basic Description");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>();
  const [restaurantLocations, setRestaurantLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string | null>("template");
  const [isPSDImportModalOpen, setIsPSDImportModalOpen] = useState<boolean>(false);
  const [psdScene, setPsdScene] = useState<any>(null);
  const [psdFileName, setPsdFileName] = useState<string>("");

  const setRestaurantsOptions = useInitializeEditor((state) => state.setRestaurantOptions);
  const [isRestaurantAutoLayout, setIsRestaurantAutoLayout] = useState<boolean>(false);
  const restaurantsOptions = useInitializeEditor((state) => state.restaurantOptions);

  // Fetch restaurant locations when restaurant changes
  const fetchLocations = async (restaurantId: string) => {
    try {
      const locations: Location[] = await fetchResturantLocations(restaurantId);
      setRestaurantLocations(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setRestaurantLocations([]);
    }
  };

  useEffect(() => {
    // Fetch restaurants and set up initial values
    fetchResturants(user).then((restaurants: any) => {
      const transformedRestaurants = restaurants.map((restaurant: any) => ({
        ...restaurant,
        label: restaurant.label || `Restaurant ${restaurant.value}`,
      }));
      setRestaurantsOptions(transformedRestaurants);
    });

    // Pre-fill for non-flapjack users
    if (user.role !== "flapjack" && user.restaurant_id) {
      setSelectedRestaurantId(user.restaurant_id);
      setIsRestaurantAutoLayout(user.restaurant?.isAutoLayout || false);

      // Fetch locations for the user's restaurant
      fetchLocations(user.restaurant_id);
    }
  }, []);

  // Update menuName when basicTemplate loads
  useEffect(() => {
    if (basicTemplate?.name && activeTab === "template") {
      setMenuName(basicTemplate.name);
    }
  }, [basicTemplate, activeTab]);

  // Reset to template tab if non-flapjack user tries to access PSD tab
  useEffect(() => {
    if (user?.role !== "flapjack" && activeTab === "psd") {
      setActiveTab("template");
    }
  }, [user?.role, activeTab]);

  // Monitor editor readiness and close modal when editor is fully loaded
  useEffect(() => {
    // Only monitor if modal is open with loading state (PSD import in progress)
    if (!loading || !isCreateMenu) return;

    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const checkEditorReady = () => {
      try {
        // Check if editor is ready (not initializing)
        const isEditorReady = !useInitializeEditor.getState().isInitializeEditor;
        const hasEditorInstance = !!useInitializeEditor.getState().cesdkInstance?.current;
        const loadingEditor = useInitializeEditor.getState().loadingEditor;

        // Editor is ready when it's not initializing, has an instance, and not loading
        if (isEditorReady && hasEditorInstance && !loadingEditor) {
          // Editor is ready - close modal and stop loading
          setIsLoading(false);
          setIsCreateMenu(false);

          // Clean up interval
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      } catch (error) {
        // If store is not available yet, continue checking
        console.debug("Editor store not ready yet:", error);
      }
    };

    // Wait a bit for navigation to complete, then start checking
    timeoutId = setTimeout(() => {
      // Start checking immediately after navigation
      checkEditorReady();

      // Set up interval to check editor readiness every 500ms
      intervalId = setInterval(checkEditorReady, 500);

      // Also set a maximum timeout (30 seconds) to prevent infinite loading
      setTimeout(() => {
        if (intervalId) {
          console.warn("Editor loading timeout - closing modal");
          setIsLoading(false);
          setIsCreateMenu(false);
          if (intervalId) {
            clearInterval(intervalId);
          }
        }
      }, 30000);
    }, 1000); // Wait 1 second for navigation to complete

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, isCreateMenu]);

  const handleRestaurantChange = (value: string) => {
    if (!value) {
      setSelectedRestaurantId(undefined);
      setRestaurantLocations([]);
      setSelectedLocation(null);
      return;
    }

    setError("");

    const selectedRestaurant = restaurantsOptions.find((r) => r.value === value);

    if (!selectedRestaurant) return;

    setSelectedRestaurantId(value);
    setIsRestaurantAutoLayout(selectedRestaurant.isAutoLayout);
    setSelectedLocation(null); // Reset location when restaurant changes

    // Fetch locations for the selected restaurant
    fetchLocations(value);
  };

  const handleLocationChange = (locationId: string) => {
    setError("");
    const location = restaurantLocations.find((loc) => loc.id === locationId) || null;
    setSelectedLocation(location);
  };

  const sanitizedRestaurantOptions = restaurantsOptions.map((restaurant: any) => ({
    ...restaurant,
    label: restaurant.label || `Restaurant ${restaurant.value}`,
  }));

  const locationOptions = restaurantLocations.map((location: Location) => ({
    value: location.id,
    label:
      location.name === APP_CONFIG.LOCATION.DEFAULT
        ? APP_CONFIG.LOCATION.REPLACEMENT
        : location?.name,
  }));

  // Check if restaurant/location is selected (required before PSD import)
  const canImportPSD = () => {
    if (user.role === "flapjack") {
      if (!selectedRestaurantId) return false;
      const hasLocations = restaurantLocations?.length > 0;
      if (hasLocations && !selectedLocation) return false;
    }
    return true;
  };

  const handlePSDImport = async (scene: any, fileName: string) => {
    // Auto-create menu and open editor after PSD import
    setPsdScene(scene);
    setPsdFileName(fileName);

    // Use scene name or file name for menu name
    const finalMenuName = scene?.meta?.name || fileName.replace(".psd", "") || menuName;
    if (finalMenuName) {
      setMenuName(finalMenuName);
    }

    setIsPSDImportModalOpen(false);
    setIsLoading(true); // Show loader in modal

    // Automatically create menu and open editor
    await onCreateMenuFromPSD(
      scene,
      fileName,
      user,
      router,
      setIsCreateMenu,
      setIsLoading,
      finalMenuName || menuName,
      menuDescription,
      selectedRestaurantId!,
      selectedLocation,
      isRestaurantAutoLayout,
      setError
    );
  };

  const handlePSDError = (error: string) => {
    setError(error);
  };

  const handleSubmit = () => {
    // PSD imports are handled automatically in handlePSDImport - no need for submit button
    // Only handle template-based menu creation
    if (activeTab === "template") {
      // Check if basicTemplate is available before creating menu
      if (!basicTemplate) {
        setError("Template data is not loaded yet. Please wait and try again.");
        return;
      }
      onCreateMenu(
        basicTemplate,
        user,
        router,
        setIsCreateMenu,
        setIsLoading,
        menuName,
        menuDescription,
        selectedRestaurantId!,
        selectedLocation,
        isRestaurantAutoLayout,
        setError
      );
    }
  };

  const isSubmitDisabled = () => {
    // PSD tab doesn't need submit button (auto-creates on import)
    if (activeTab === "psd") return true;

    if (menuName.length < 1 || menuDescription.length < 1) return true;

    // For template tab, require basicTemplate to be loaded
    if (activeTab === "template" && !basicTemplate) return true;

    if (user.role === "flapjack") {
      if (!selectedRestaurantId) return true;

      const hasLocations = restaurantLocations?.length > 0;
      if (hasLocations && !selectedLocation) return true;
    }

    return false;
  };

  return (
    <>
      <CommonModal
        title={
          <Group spacing="xs">
            <IconTemplate size={24} color="#ff9800" />
            <Text>Create New Menu</Text>
          </Group>
        }
        isOpen={isCreateMenu}
        onClose={() => {
          // Prevent closing modal while loading (editor is opening)
          if (!loading) {
            setIsCreateMenu(false);
          }
        }}
        onSubmit={handleSubmit}
        size="lg"
        loading={loading && activeTab !== "psd"}
        disabled={isSubmitDisabled()}
        submitLabel="Create Menu"
        submitLabelColor="orange"
        hideFooter={activeTab === "psd"} // Hide submit button for PSD tab (auto-creates on import)
      >
        <Box py="xs" style={{ width: "100%" }}>
          <Tabs value={activeTab} onTabChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="template" icon={<IconTemplate size={16} />}>
                From Template
              </Tabs.Tab>
              {user?.role === "flapjack" && (
                <Tabs.Tab value="psd" icon={<IconFile size={16} />}>
                  From PSD File
                </Tabs.Tab>
              )}
            </Tabs.List>

            <Tabs.Panel value="template" pt="md">
              <Stack spacing="md">
                {/* Show loading state if basicTemplate is not loaded */}
                {!basicTemplate && (
                  <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                    <Text size="sm">Loading template data... Please wait a moment.</Text>
                  </Alert>
                )}

                {/* Menu Details Section */}
                <Box>
                  <TextInput
                    label="Menu Name"
                    placeholder="Enter a name for your menu"
                    withAsterisk
                    icon={<IconTemplate size={16} stroke={1.5} />}
                    value={menuName}
                    onChange={(e) => setMenuName(e.currentTarget.value)}
                    styles={(theme) => ({
                      label: {
                        fontWeight: 500,
                        marginBottom: 6,
                      },
                      input: {
                        "&:focus": {
                          borderColor: theme.colors.orange[6],
                        },
                      },
                    })}
                    mb="sm"
                  />

                  <Textarea
                    label="Description"
                    placeholder="Briefly describe your menu"
                    withAsterisk
                    icon={<IconFileDescription size={16} stroke={1.5} />}
                    value={menuDescription}
                    onChange={(e) => setMenuDescription(e.currentTarget.value)}
                    minRows={2}
                    maxRows={4}
                    styles={(theme) => ({
                      label: {
                        fontWeight: 500,
                        marginBottom: 6,
                      },
                      input: {
                        "&:focus": {
                          borderColor: theme.colors.orange[6],
                        },
                      },
                    })}
                  />
                </Box>

                {/* Restaurant Details Section - Only for flapjack role */}
                {user.role === "flapjack" && (
                  <>
                    <Divider my="xs" />

                    <Box>
                      <Text size="sm" weight={600} color="dimmed" mb={4}>
                        RESTAURANT DETAILS
                      </Text>

                      <Select
                        label="Restaurant"
                        placeholder="Select restaurant"
                        withAsterisk
                        icon={<IconBuildingStore size={16} stroke={1.5} />}
                        data={sanitizedRestaurantOptions}
                        value={selectedRestaurantId}
                        onChange={handleRestaurantChange}
                        searchable
                        clearable
                        nothingFound="No restaurants found"
                        styles={(theme) => ({
                          label: {
                            fontWeight: 500,
                            marginBottom: 6,
                          },
                          input: {
                            "&:focus": {
                              borderColor: theme.colors.orange[6],
                            },
                          },
                          item: {
                            "&[data-selected]": {
                              backgroundColor: theme.colors.orange[6],
                            },
                            "&[data-selected]:hover": {
                              backgroundColor: theme.colors.orange[7],
                            },
                          },
                        })}
                        mb="sm"
                      />

                      {restaurantLocations?.length > 0 && (
                        <Select
                          label="Location"
                          placeholder="Select location"
                          withAsterisk
                          icon={<IconMapPin size={16} stroke={1.5} />}
                          data={locationOptions}
                          value={selectedLocation?.id}
                          onChange={handleLocationChange}
                          searchable
                          clearable
                          nothingFound="No locations available"
                          styles={(theme) => ({
                            label: {
                              fontWeight: 500,
                              marginBottom: 6,
                            },
                            input: {
                              "&:focus": {
                                borderColor: theme.colors.orange[6],
                              },
                            },
                            item: {
                              "&[data-selected]": {
                                backgroundColor: theme.colors.orange[6],
                              },
                              "&[data-selected]:hover": {
                                backgroundColor: theme.colors.orange[7],
                              },
                            },
                          })}
                        />
                      )}
                    </Box>
                  </>
                )}

                {/* Restaurant Auto-Layout Badge */}
                {isRestaurantAutoLayout && selectedRestaurantId && (
                  <Group spacing="xs" mt={4}>
                    <ThemeIcon size="sm" color="blue" radius="xl">
                      <IconLayoutGrid size={12} />
                    </ThemeIcon>
                    <Text size="sm" color="dimmed">
                      Auto Layout is enabled for this menu
                    </Text>
                  </Group>
                )}

                {/* Error Display */}
                {error && (
                  <Alert color="red" icon={<IconAlertCircle size={16} />}>
                    <Text size="sm">{error}</Text>
                  </Alert>
                )}

                {/* For non-flapjack users, show restaurant info */}
                {user.role !== "flapjack" && (
                  <Alert color="blue" icon={<IconInfoCircle size={16} />} variant="light">
                    <Text size="sm">
                      This menu will be created for <b>{user.restaurant?.name}</b>
                      {selectedLocation?.name && ` at location: ${selectedLocation.name}`}
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="psd" pt="md">
              <Stack spacing="md">
                {/* Menu Name and Description are hidden for PSD imports - they're auto-filled from the PSD file */}

                {/* Restaurant Details Section - Required before PSD import */}
                {user.role === "flapjack" && (
                  <>
                    <Divider my="xs" />
                    <Box>
                      <Text size="sm" weight={600} color="dimmed" mb={4}>
                        RESTAURANT DETAILS (Required)
                      </Text>

                      <Select
                        label="Restaurant"
                        placeholder="Select restaurant"
                        withAsterisk
                        icon={<IconBuildingStore size={16} stroke={1.5} />}
                        data={sanitizedRestaurantOptions}
                        value={selectedRestaurantId}
                        onChange={handleRestaurantChange}
                        searchable
                        clearable
                        nothingFound="No restaurants found"
                        styles={(theme) => ({
                          label: {
                            fontWeight: 500,
                            marginBottom: 6,
                          },
                          input: {
                            "&:focus": {
                              borderColor: theme.colors.orange[6],
                            },
                          },
                          item: {
                            "&[data-selected]": {
                              backgroundColor: theme.colors.orange[6],
                            },
                            "&[data-selected]:hover": {
                              backgroundColor: theme.colors.orange[7],
                            },
                          },
                        })}
                        mb="sm"
                      />

                      {restaurantLocations?.length > 0 && (
                        <Select
                          label="Location"
                          placeholder="Select location"
                          withAsterisk
                          icon={<IconMapPin size={16} stroke={1.5} />}
                          data={locationOptions}
                          value={selectedLocation?.id}
                          onChange={handleLocationChange}
                          searchable
                          clearable
                          nothingFound="No locations available"
                          styles={(theme) => ({
                            label: {
                              fontWeight: 500,
                              marginBottom: 6,
                            },
                            input: {
                              "&:focus": {
                                borderColor: theme.colors.orange[6],
                              },
                            },
                            item: {
                              "&[data-selected]": {
                                backgroundColor: theme.colors.orange[6],
                              },
                              "&[data-selected]:hover": {
                                backgroundColor: theme.colors.orange[7],
                              },
                            },
                          })}
                        />
                      )}
                    </Box>
                  </>
                )}

                {/* PSD Import Section */}
                <Divider my="xs" />
                <Box>
                  <Alert color="blue" icon={<IconFile size={16} />} variant="light" mb="md">
                    <Text size="sm">
                      Import a Photoshop (.psd) file. After import, the menu will be created and the
                      editor will open automatically.
                    </Text>
                  </Alert>

                  {!canImportPSD() && (
                    <Alert color="orange" icon={<IconAlertCircle size={16} />} mb="md">
                      <Text size="sm">
                        Please select {!selectedRestaurantId ? "a restaurant" : "a location"} before
                        importing a PSD file.
                      </Text>
                    </Alert>
                  )}

                  <Button
                    leftIcon={loading ? <Loader size={16} color="white" /> : <IconPlus size={16} />}
                    onClick={() => setIsPSDImportModalOpen(true)}
                    color="orange"
                    size="md"
                    fullWidth
                    disabled={!canImportPSD() || loading}
                    loading={loading}
                  >
                    {loading ? "Opening Editor..." : "Import PSD File and Create Menu"}
                  </Button>
                </Box>

                {/* PSD Import Info */}
                <Group spacing="xs" mt={4}>
                  <ThemeIcon size="sm" color="orange" radius="xl">
                    <IconFile size={12} />
                  </ThemeIcon>
                  <Text size="sm" color="dimmed">
                    PSD imports create non-auto layout menus for maximum design flexibility
                  </Text>
                </Group>

                {/* Error Display */}
                {error && (
                  <Alert color="red" icon={<IconAlertCircle size={16} />}>
                    <Text size="sm">{error}</Text>
                  </Alert>
                )}

                {/* For non-flapjack users, show restaurant info */}
                {user.role !== "flapjack" && (
                  <Alert color="blue" icon={<IconInfoCircle size={16} />} variant="light">
                    <Text size="sm">
                      This menu will be created for <b>{user.restaurant?.name}</b>
                      {selectedLocation?.name && ` at location: ${selectedLocation.name}`}
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Box>
      </CommonModal>

      <PSDImportModal
        isOpen={isPSDImportModalOpen}
        onClose={() => setIsPSDImportModalOpen(false)}
        onPSDImport={handlePSDImport}
        onError={handlePSDError}
      />
    </>
  );
};
