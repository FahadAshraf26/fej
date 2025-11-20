// components/TemplateGallery/TemplateCardOverlay.tsx
import React, { useCallback, useState, useEffect, useMemo } from "react";
import { ActionIcon, Button, CloseButton, Flex, Menu, Overlay, Box } from "@mantine/core";
import {
  IconDots,
  IconPencil,
  IconTrash,
  IconCopy,
  IconArrowsExchange,
  IconMapPin,
  IconGlobe,
  IconPhoto,
  IconLayoutRows,
  IconEdit,
} from "@tabler/icons";
import { useRouter } from "next/router";
import { ITemplateDetails } from "../../interfaces/ITemplate";
import TemplateCardModal, { ModalType } from "./TemplateCardModal";
import { useUserContext } from "../../context/UserContext";
import { useTemplateStore } from "../../stores/Template/Template.store";
import { supabase } from "@database/client.connection";
import { useSubscriptionContext } from "../../context/SubscriptionContext";

// Minimal props - only what can't come from global store
interface TemplateCardOverlayProps {
  handleEditThumbnail: (template: ITemplateDetails) => void;
  showOverlay: boolean;
  setShowOverlay: (showOverlay: boolean) => void;
  template: ITemplateDetails;
  setTransferedTemplate?: (data: { templateId: number; restaurantId: string }) => void;
  onModalStateChange?: (isOpen: boolean) => void;
  onMenuStateChange?: (isOpen: boolean) => void;
}

const TemplateCardOverlay = React.memo(
  ({
    handleEditThumbnail,
    showOverlay,
    setShowOverlay,
    template,
    setTransferedTemplate,
    onModalStateChange,
    onMenuStateChange,
  }: TemplateCardOverlayProps) => {
    const router = useRouter();
    const { user } = useUserContext();
    const { handleAction } = useSubscriptionContext();

    // Get state from store selectively to prevent unnecessary re-renders
    const activeTab = useTemplateStore((state) => state.activeTab);
    const updateAutoLayoutStatus = useTemplateStore((state) => state.updateAutoLayoutStatus);
    const setTemplates = useTemplateStore((state) => state.setTemplates);
    const templates = useTemplateStore((state) => state.templates);

    // Local UI state
    const [menuIsOpened, setMenuIsOpened] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeModal, setActiveModal] = useState<{
      type: ModalType;
      isOpen: boolean;
    }>({ type: "delete", isOpen: false });

    // Permissions check with memoization to prevent unnecessary recalculation
    const canUpdate = useMemo(() => {
      if (!user || !router.pathname.includes("templates")) return false;

      const flapjackCanUpdate =
        user?.role === "flapjack" || user?.role === "owner" || !!user?.restaurant_id;
      const isUserTemplate = user?.id === template.createdBy && user?.role === "user";

      return flapjackCanUpdate || isUserTemplate;
    }, [user, router.pathname, template.isGlobal, template.createdBy]);

    // Auto layout status from the template
    const isAutoLayout = template.isAutoLayout ?? true;

    // Notify parent component of menu state changes
    useEffect(() => {
      if (onMenuStateChange) {
        onMenuStateChange(menuIsOpened);
      }
    }, [menuIsOpened, onMenuStateChange]);

    // Close both menu and modal when overlay loses focus
    const handleOverlayMouseLeave = useCallback(() => {
      // Only close if not interacting with menu
      if (!menuIsOpened && !activeModal.isOpen) {
        setShowOverlay(false);
      }
    }, [menuIsOpened, activeModal.isOpen]);

    // Notify parent of modal state changes
    useEffect(() => {
      if (onModalStateChange) {
        onModalStateChange(activeModal.isOpen);
      }
    }, [activeModal.isOpen, onModalStateChange]);

    // Menu handlers with stopPropagation to prevent overlay hiding
    const handleOpenMenu = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setMenuIsOpened(true);
    }, []);

    const closeMenu = useCallback(() => {
      setMenuIsOpened(false);
    }, []);

    // Modal handlers
    const openModal = useCallback(
      (type: ModalType) => {
        setActiveModal({ type, isOpen: true });
        closeMenu();
      },
      [closeMenu]
    );

    const closeModal = useCallback(() => {
      setActiveModal((prev) => ({ ...prev, isOpen: false }));
    }, []);

    // Handle menu item click without propagation
    const handleMenuItemClick = useCallback(
      (callback: Function) => (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        callback();
      },
      []
    );

    // Handle auto layout toggle
    const handleAutoLayout = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          setLoading(true);
          await updateAutoLayoutStatus(template.id, !isAutoLayout);
          setLoading(false);
        } catch (error) {
          console.error("Failed to update auto layout:", error);
          setLoading(false);
        }
      },
      [template.id, isAutoLayout, updateAutoLayoutStatus]
    );

    // Handle modal completion
    const handleModalComplete = useCallback(() => {
      if (setTransferedTemplate && activeModal.type === "transfer") {
        setTransferedTemplate({
          templateId: template.id,
          restaurantId: template.restaurant_id || "",
        });
      }
    }, [activeModal.type, setTransferedTemplate, template.id, template.restaurant_id]);

    // Handle global status toggle
    const handleGlobal = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
          setLoading(true);
          // Call the API to toggle global status
          const { error } = await supabase
            .from("templates")
            .update({ isGlobal: !template.isGlobal })
            .eq("id", template.id);

          if (error) throw error;

          // Update local state
          const updatedTemplates = templates.map((t) =>
            t.id === template.id ? { ...t, isGlobal: !template.isGlobal } : t
          );
          setTemplates(updatedTemplates);
        } catch (error) {
          console.error("Error toggling global status:", error);
        } finally {
          setLoading(false);
        }
      },
      [template.id, template.isGlobal, setTemplates, templates]
    );

    if (!showOverlay && !activeModal.isOpen) {
      return null;
    }

    return (
      <>
        {/* Template Operation Modal */}
        <TemplateCardModal
          isOpened={activeModal.isOpen}
          closeModal={closeModal}
          type={activeModal.type}
          template={template}
          onComplete={handleModalComplete}
        />

        {/* Only render the overlay part if showOverlay is true */}
        {showOverlay && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="overlay-content"
            onClick={(e) => {
              // Prevent clicks inside overlay from propagating to card
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseLeave={handleOverlayMouseLeave}
          >
            {canUpdate && (
              <Menu
                position="bottom-end"
                width={200}
                withinPortal={true}
                opened={menuIsOpened}
                onChange={setMenuIsOpened}
                shadow="md"
                styles={(theme) => ({
                  item: {
                    fontSize: 14,
                    padding: "8px 12px",
                    borderRadius: 4,
                    "&:hover": {
                      backgroundColor:
                        theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[0],
                    },
                  },
                  dropdown: {
                    padding: 6,
                    cursor: "pointer",
                    zIndex: 20,
                    border: `1px solid ${
                      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[2]
                    }`,
                    borderRadius: 8,
                  },
                  divider: {
                    margin: "6px 0",
                  },
                })}
                closeOnItemClick={true}
                closeOnClickOutside={true}
              >
                <Menu.Target>
                  <Flex
                    justify="right"
                    right={18}
                    top={10}
                    pos="absolute"
                    onClick={handleOpenMenu}
                    sx={{ zIndex: 15 }}
                  >
                    {menuIsOpened ? (
                      <CloseButton
                        iconSize={20}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          closeMenu();
                        }}
                        variant="filled"
                        color="orange"
                        style={{
                          background: "#ff9f43",
                          color: "#fff",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                      />
                    ) : (
                      <ActionIcon
                        variant="filled"
                        radius="xl"
                        size="md"
                        style={{
                          background: "#ff9f43",
                          color: "#fff",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}
                        className="menu-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleOpenMenu(e);
                        }}
                      >
                        <IconDots size={20} />
                      </ActionIcon>
                    )}
                  </Flex>
                </Menu.Target>

                <Menu.Dropdown>
                  {user?.role === "flapjack" && (
                    <Menu.Item onClick={handleGlobal} icon={<IconGlobe size={16} stroke={1.5} />}>
                      <Box sx={{ fontSize: 14, padding: "0" }}>
                        {template.isGlobal ? "Unpublish Menu" : "Publish Menu"}
                      </Box>
                    </Menu.Item>
                  )}
                  {user?.role === "flapjack" && (
                    <Menu.Item
                      onClick={handleMenuItemClick(() => openModal("transfer"))}
                      icon={<IconArrowsExchange size={16} stroke={1.5} />}
                      sx={{ fontSize: 14, padding: "8px 12px" }}
                    >
                      Transfer Template
                    </Menu.Item>
                  )}
                  {(template?.isGlobal || activeTab === "myMenu" || user?.role === "flapjack") && (
                    <Menu.Item
                      onClick={handleMenuItemClick(() => openModal("duplicate"))}
                      icon={<IconCopy size={16} stroke={1.5} />}
                      sx={{ fontSize: 14, padding: "8px 12px" }}
                    >
                      Duplicate
                    </Menu.Item>
                  )}
                  {user?.role !== "flapjack" &&
                    !!user?.restaurant_id &&
                    user?.restaurant?.location?.length > 1 && (
                      <Menu.Item
                        onClick={handleMenuItemClick(() => openModal("changeLocation"))}
                        icon={<IconMapPin size={16} stroke={1.5} />}
                        sx={{ fontSize: 14, padding: "8px 12px" }}
                      >
                        Change Location
                      </Menu.Item>
                    )}
                  <Menu.Item
                    onClick={handleMenuItemClick(() => openModal("rename"))}
                    icon={<IconPencil size={16} stroke={1.5} />}
                    sx={{ fontSize: 14, padding: "8px 12px" }}
                  >
                    Rename
                  </Menu.Item>
                  {user?.role === "flapjack" && (
                    <Menu.Item
                      onClick={handleMenuItemClick(() => handleEditThumbnail(template))}
                      icon={<IconPhoto size={16} stroke={1.5} />}
                      sx={{ fontSize: 14, padding: "8px 12px" }}
                    >
                      Edit Thumbnail
                    </Menu.Item>
                  )}
                  {user?.role === "flapjack" && (
                    <Menu.Item
                      onClick={handleAutoLayout}
                      disabled={loading}
                      icon={<IconLayoutRows size={16} stroke={1.5} />}
                      sx={{ fontSize: 14, padding: "8px 12px" }}
                    >
                      {isAutoLayout ? "Turn off Autolayout" : "Turn on Autolayout"}
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item
                    onClick={handleMenuItemClick(() => openModal("delete"))}
                    icon={<IconTrash size={16} stroke={1.5} color="red" />}
                    color="red"
                    sx={{ fontSize: 14, padding: "8px 12px" }}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}

            <Flex justify="center" h="100%" align="center">
              <Button
                variant="outline"
                color="gray.2"
                radius="xl"
                size="md"
                leftIcon={<IconEdit size={18} />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAction(() => {
                    window.location.href = `/menu/${template.id}`;
                  });
                }}
                styles={{
                  root: {
                    border: "2px solid rgba(255, 255, 255, 0.7)",
                    color: "#fff",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    padding: "8px 24px",
                    fontWeight: 600,
                    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.25)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 12px rgba(0,0,0,0.25)",
                    },
                  },
                }}
              >
                Edit Template
              </Button>
            </Flex>
          </Box>
        )}
      </>
    );
  }
);

TemplateCardOverlay.displayName = "TemplateCardOverlay";

export default TemplateCardOverlay;
