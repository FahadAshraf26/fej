// components/TemplateGallery/TemplateCard.tsx
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  Card,
  Image,
  Text,
  Badge,
  Group,
  Box,
  Tooltip,
  ActionIcon,
  Menu,
  Flex,
  Button,
} from "@mantine/core";
import {
  IconDots,
  IconEdit,
  IconTrash,
  IconCopy,
  IconExchange,
  IconMap,
  IconGlobe,
  IconGlobeOff,
  IconCertificate,
  IconCertificateOff,
} from "@tabler/icons";
import { ITemplateDetails } from "../../interfaces/ITemplate";
import { useUserContext } from "../../context/UserContext";
import { useTemplateStore } from "../../stores/Template/Template.store";
import { IRestaurantDetail } from "interfaces/IRestaurantDetail";
import { useSubscriptionContext } from "../../context/SubscriptionContext";

// Simplified props for the card component
interface TemplateCardProps {
  template: ITemplateDetails;
  thumbnail?: string;
  onAction: (action: string) => void;
  onEditThumbnail: () => void;
}

// Truncated text component with tooltip
const TruncatedText = React.memo(
  ({ children, isTitle = false }: { children: React.ReactNode; isTitle?: boolean }) => {
    const [isTruncated, setIsTruncated] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    // Check if text is truncated
    useEffect(() => {
      const checkTruncation = () => {
        const element = textRef.current;
        if (element) {
          setIsTruncated(element.scrollHeight > element.clientHeight);
        }
      };

      checkTruncation();
      window.addEventListener("resize", checkTruncation);

      return () => window.removeEventListener("resize", checkTruncation);
    }, [children]);

    return (
      <Tooltip
        label={typeof children === "string" ? children : ""}
        disabled={!isTruncated}
        multiline
        maw={300}
        withArrow
        offset={10}
        position="top"
        withinPortal
      >
        <Text
          ref={textRef}
          size={isTitle ? "lg" : "sm"}
          color={isTitle ? "#2e2e2e" : "dimmed"}
          lineClamp={isTitle ? 1 : 2}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: isTitle ? 1 : 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {children}
        </Text>
      </Tooltip>
    );
  }
);

const TemplateCard = React.memo(
  ({ template, thumbnail, onAction, onEditThumbnail }: TemplateCardProps) => {
    const { user } = useUserContext();
    const { handleAction, returnUrl } = useSubscriptionContext();

    const updateTemplatePublishedStatus = useTemplateStore(
      (state) => state.updateTemplatePublishedStatus
    );
    const updateTemplateAutoLayout = useTemplateStore((state) => state.updateAutoLayoutStatus);
    const markThumbnailInvalid = useTemplateStore((state) => state.markThumbnailInvalid);
    const markThumbnailValid = useTemplateStore((state) => state.markThumbnailValid);
    const { restaurantOptions } = useTemplateStore((state) => state);
    const getThumbnailUrl = useTemplateStore((state) => state.getThumbnailUrl);
    // Local state for hover effects
    const [isHovered, setIsHovered] = useState(false);
    const [menuOpened, setMenuOpened] = useState(false);
    const [isMouseOverMenu, setIsMouseOverMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [restaurant, setRestaurant] = useState<IRestaurantDetail | null>(
      restaurantOptions.filter((r) => r.value == user?.restaurant_id)?.[0]
    );
    const isFlapjack = user?.role === "flapjack";
    // Determine if user can edit this template
    const canEdit = React.useMemo(() => {
      if (!user) return false;

      const isFlapjack = user.role === "flapjack";
      const isOwner = user.role === "owner";
      const isCreator = user.id === template.createdBy;

      return isFlapjack || isOwner || isCreator;
    }, [user, template.createdBy]);

    // Track mouse over menu
    useEffect(() => {
      const trackMenuHover = () => {
        if (!menuOpened) return;

        const menuElement = document.querySelector(".mantine-Menu-dropdown");
        if (!menuElement) return;

        const handleMenuMouseEnter = () => setIsMouseOverMenu(true);
        const handleMenuMouseLeave = () => setIsMouseOverMenu(false);

        menuElement.addEventListener("mouseenter", handleMenuMouseEnter);
        menuElement.addEventListener("mouseleave", handleMenuMouseLeave);

        return () => {
          menuElement.removeEventListener("mouseenter", handleMenuMouseEnter);
          menuElement.removeEventListener("mouseleave", handleMenuMouseLeave);
        };
      };

      const cleanup = trackMenuHover();
      return cleanup;
    }, [menuOpened]);

    // Event handlers
    const handleMouseEnter = useCallback(() => setIsHovered(true), []);

    const handleMouseLeave = useCallback(() => {
      // Only hide the overlay if the menu is closed or mouse is not over menu
      if (!menuOpened || !isMouseOverMenu) {
        // Small delay to allow checking if mouse moved to menu
        setTimeout(() => {
          if (!isMouseOverMenu) {
            setIsHovered(false);
            setMenuOpened(false);
          }
        }, 50);
      }
    }, [menuOpened, isMouseOverMenu]);

    // Listen for clicks outside to close menu and overlay
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuOpened) {
          const menuElement = document.querySelector(".mantine-Menu-dropdown");
          const menuButtonElement = menuRef.current;
          const cardElement = cardRef.current;

          const targetElement = event.target as Node;

          if (
            !menuElement?.contains(targetElement) &&
            !menuButtonElement?.contains(targetElement) &&
            !cardElement?.contains(targetElement)
          ) {
            setMenuOpened(false);
            setIsHovered(false);
            setIsMouseOverMenu(false);
          }
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [menuOpened]);

    // Handle menu state changes
    const handleMenuStateChange = useCallback((opened: boolean) => {
      setMenuOpened(opened);
      // Keep overlay visible when menu is open
      if (opened) {
        setIsHovered(true);
      }
    }, []);

    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        // Only navigate if not clicking on a menu item
        if ((e.target as HTMLElement).closest(".menu-container")) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        handleAction(() => onAction("edit"));
      },
      [onAction, handleAction]
    );

    const handleMenuItemClick = useCallback(
      (action: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpened(false);

        if (action === "editThumbnail") {
          handleAction(() => onEditThumbnail());
        } else if (action === "toggleGlobal") {
          handleAction(() => updateTemplatePublishedStatus(template.id, !template.isGlobal));
        } else if (action === "updateAutoLayout") {
          handleAction(() => updateTemplateAutoLayout(template.id, !template.isAutoLayout));
        } else {
          handleAction(() => onAction(action));
        }
      },
      [
        onAction,
        onEditThumbnail,
        handleAction,
        template.id,
        template.isGlobal,
        template.isAutoLayout,
        updateTemplatePublishedStatus,
        updateTemplateAutoLayout,
      ]
    );

    const handleImageError = useCallback(() => {
      markThumbnailInvalid(template.id);
    }, [template.id, markThumbnailInvalid]);
    const handleImageLoad = useCallback(() => {
      markThumbnailValid(template.id);
    }, [template.id, markThumbnailValid]);

    return (
      <Card
        ref={cardRef}
        shadow="sm"
        p="lg"
        radius="md"
        withBorder
        sx={(theme) => ({
          height: "100%",
          cursor: "pointer",
          transition: "all 0.3s ease",
          borderColor: theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3],
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: theme.shadows.md,
            borderColor: theme.colors.orange[4],
          },
        })}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          handleCardClick(e);
        }}
      >
        <Card.Section pos="relative">
          {/* Overlay shown on hover */}
          {isHovered && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Menu button */}
              <div
                ref={menuRef}
                className="menu-container"
                style={{ position: "absolute", top: 10, right: 10 }}
              >
                <Menu
                  opened={menuOpened}
                  onChange={handleMenuStateChange}
                  position="bottom-end"
                  withArrow
                  closeOnItemClick={false}
                  withinPortal
                >
                  <Menu.Target>
                    <ActionIcon
                      variant="filled"
                      radius="xl"
                      color="rgba(255, 255, 255, 0.2)"
                      sx={{
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.3)",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setMenuOpened(true);
                      }}
                    >
                      <IconDots color="white" size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {isFlapjack && (
                      <Menu.Item
                        icon={
                          template.isGlobal ? <IconGlobeOff size={16} /> : <IconGlobe size={16} />
                        }
                        onClick={handleMenuItemClick("toggleGlobal")}
                      >
                        {template.isGlobal ? "Unpublish" : "Publish"}
                      </Menu.Item>
                    )}
                    <Menu.Item
                      icon={<IconEdit size={16} />}
                      onClick={handleMenuItemClick("rename")}
                    >
                      Rename
                    </Menu.Item>

                    <Menu.Item
                      icon={<IconCopy size={16} />}
                      onClick={handleMenuItemClick("duplicate")}
                    >
                      Duplicate
                    </Menu.Item>

                    {isFlapjack && (
                      <>
                        <Menu.Item
                          icon={<IconExchange size={16} />}
                          onClick={handleMenuItemClick("transfer")}
                        >
                          Transfer Template
                        </Menu.Item>
                        <Menu.Item
                          icon={<IconEdit size={16} />}
                          onClick={handleMenuItemClick("editThumbnail")}
                        >
                          Edit Thumbnail
                        </Menu.Item>
                        <Menu.Item
                          icon={
                            template.isAutoLayout ? (
                              <IconCertificateOff size={16} color="red" />
                            ) : (
                              <IconCertificate size={16} color="green" />
                            )
                          }
                          onClick={handleMenuItemClick("updateAutoLayout")}
                        >
                          {template.isAutoLayout ? "Disable AutoLayout" : "Enable AutoLayout"}
                        </Menu.Item>
                      </>
                    )}
                    {!isFlapjack &&
                      // !!user?.restaurant_id &&
                      restaurant?.location?.length &&
                      restaurant?.location?.length > 1 && (
                        <Menu.Item
                          icon={<IconMap size={16} />}
                          onClick={handleMenuItemClick("changeLocation")}
                        >
                          Change Location
                        </Menu.Item>
                      )}

                    <Menu.Divider />

                    <Menu.Item
                      icon={<IconTrash size={16} />}
                      color="red"
                      onClick={handleMenuItemClick("delete")}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>
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

          <Image
            src={thumbnail}
            withPlaceholder={true}
            placeholder={
              <Image
                src="/thumbnail-placeholder.jpg"
                height={235}
                alt="Menu Thumbnail Placeholder"
              />
            }
            height={235}
            alt={`${template.name} Thumbnail`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            sx={{
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "scale(1.03)",
              },
              borderBottom: "1px solid #e0e0e0",
            }}
          />

          {isFlapjack && (
            <Group
              position="apart"
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "10px",
              }}
            >
              <Badge
                color={template?.isGlobal ? "green" : "orange"}
                variant="filled"
                size="md"
                sx={{
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                {template?.isGlobal ? "Live" : "Draft"}
              </Badge>
            </Group>
          )}
        </Card.Section>

        <Box mt="md" mb="xs">
          <Text weight={700} size="lg" lineClamp={1}>
            <TruncatedText isTitle>{template.name}</TruncatedText>
          </Text>
        </Box>

        <Flex dir="column" gap="xs" wrap={"wrap"}>
          <TruncatedText>{template.description}</TruncatedText>
          {isFlapjack && (
            <Text
              size="xs"
              color="dimmed"
              sx={{
                fontSize: "10px",
                position: "absolute",
                bottom: 0,
                right: 10,
              }}
            >
              {template.isAutoLayout ? "Auto Layout" : "Non Auto Layout"}
            </Text>
          )}
        </Flex>
      </Card>
    );
  }
);

TemplateCard.displayName = "TemplateCard";
TruncatedText.displayName = "TruncatedText";

export default TemplateCard;
