import {
  Avatar,
  Button,
  Flex,
  Header,
  Menu,
  Text,
  Box,
  Loader,
  Overlay,
  Center,
} from "@mantine/core";
import { useRouter } from "next/router";
import {
  IconChevronDown,
  IconDashboard,
  IconDownload,
  IconLogout,
  IconMail,
  IconSettings,
  IconCreditCard,
} from "@tabler/icons";

import { useSessionContext, useSupabaseClient } from "@supabase/auth-helpers-react";
import { canCreateTemplate, useDialog, useUpsell } from "../hooks";
import { useUserContext } from "../context/UserContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { removeAllCookies } from "../helpers/EditorData";
import { toast } from "react-toastify";
import AuthDialog from "../components/AuthDialog";
import theme from "config/theme";
import Image from "next/image";
import { InitialCreateMenuModal } from "./InitialCreateMenuModal";
import { DATA_TEST_IDS } from "@Contants/dataTestIds";

interface HeaderProps {
  onTemplateDownload?: () => void;
  onTemplateSaveUpdate?: () => void;
  setNavMenu?: (value: string) => void;
  navMenu?: string;
  loader?: boolean;
  children?: React.ReactNode;
}

const AppHeader = ({
  onTemplateDownload,
  onTemplateSaveUpdate,
  setNavMenu,
  navMenu,
  loader,
  children,
}: HeaderProps) => {
  const router = useRouter();
  const [authDialog, openAuthDialog, closeAuthDialog] = useDialog(false);
  const { session, isLoading } = useSessionContext();
  const [isCreateMenu, setIsCreateMenu] = useState<boolean>(false);
  const supabase = useSupabaseClient();
  const { isAuthenticated, user } = useUserContext();
  const [isCheckoutPage, setIsCheckoutPage] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [basicTemplate, setBasicTemplate] = useState<any>(null);
  const { triggerUpsellOr } = useUpsell(user?.subscriptionActive, user?.id);

  useEffect(() => {
    const checkoutPaths = ["/checkout", "/subscription-checkout", "/status", "/checkoutCC"];
    const isSubscriptionPage = router.pathname.startsWith("/subscription/");
    setIsCheckoutPage(checkoutPaths.includes(router.pathname) || isSubscriptionPage);

    // Set active tab from localStorage if available
    const activeTab = localStorage.getItem("activeTab");
    if (activeTab && setNavMenu) {
      setNavMenu(activeTab);
    }
  }, [router.pathname, setNavMenu]);

  const activeClassFun = (value: string) => {
    if (navMenu && setNavMenu) {
      setNavMenu(value);
      localStorage.setItem("activeTab", value);
    }
  };

  useEffect(() => {
    const fetchBasicTemplate = async () => {
      const { error, data } = await supabase.from("templates").select("*, pages(*)").eq("id", 2044);

      if (data && data!.length) {
        setBasicTemplate(data![0]);
      }
    };
    fetchBasicTemplate();
  }, []);

  // Helper functions for user display
  const getUserInitials = (user: any) => {
    if (!user) return "";
    if (user.customer_name) {
      return user.customer_name.charAt(0).toUpperCase();
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    } else {
      return "";
    }
  };
  const logout = async () => {
    await supabase.auth.signOut();
    removeAllCookies();
  };
  const getUserDisplayName = (user: any) => {
    if (!user) return "User";

    if (user.name) {
      return user.name;
    } else if (user.email) {
      // Get name part from email
      const emailName = user.email.split("@")[0];
      // Convert email usernames like "john.doe" or "john_doe" to "John Doe"
      return emailName
        .replace(/[._-]/g, " ")
        .split(" ")
        .map((part: any) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    } else if (user.phone) {
      // Format phone number for display (last 4 digits)
      return `User (${user.phone.slice(-4)})`;
    }

    return "User";
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loader) {
      toast.warn(
        "Please wait until this menu finishes saving. We will notify you when it is safe to leave the page.",
        { hideProgressBar: true, autoClose: 5000 }
      );
    } else {
      router.push("/templates");
    }
  };

  const handleDashboardClick = () => {
    setIsDashboardLoading(true);
    router
      .push("/dashboard")
      .then(() => {
        // Set loading to false after navigation is complete
        setIsDashboardLoading(false);
      })
      .catch(() => {
        // Also set loading to false if navigation fails
        setIsDashboardLoading(false);
      });
  };

  const showTemplatesPage = router.pathname.includes("/templates");
  const shouldShowNavMenu = !isCheckoutPage && user?.role !== undefined && showTemplatesPage;
  const canSave = !!onTemplateSaveUpdate && !isCheckoutPage;
  const isEditorPage =
    router.pathname.includes("/editor") || router.pathname.includes("/template/");

  return (
    <>
      {isDashboardLoading && (
        <Overlay
          color="#fff"
          opacity={0.85}
          zIndex={1000}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Center>
            <Flex direction="column" align="center" gap="md">
              <Loader size="xl" color="orange" variant="dots" />
            </Flex>
          </Center>
        </Overlay>
      )}
      <Header height={64}>
        <Flex p="md" sx={{ height: "100%" }} justify="space-between" align="center">
          <Flex align="center">
            <Box sx={{ cursor: "pointer" }} onClick={handleLogoClick}>
              <Flex align={"center"} style={{ cursor: "pointer" }}>
                <Image src={"/logo.svg"} alt="" width={31} height={35} />
                <div data-test-id={DATA_TEST_IDS.INDEX.FIELD_1}>
                  <Text fw={700} ml={4} className="cursor-pointer">
                    flapjack
                  </Text>
                </div>
              </Flex>
            </Box>

            {shouldShowNavMenu && (
              <Flex sx={{ marginLeft: "2rem" }}>
                {/* Navigation Menu Items */}
                {user && user?.role !== "flapjack" && (
                  <Text
                    style={{
                      ...(!user?.restaurant_id && {
                        color: "gray",
                        cursor: "default",
                      }),
                    }}
                    className={`myMenu ${navMenu === "myMenu" ? "active" : ""} cursor-pointer`}
                    fz="sm"
                    onClick={() => {
                      if (!user?.restaurant_id) return;
                      activeClassFun("myMenu");
                    }}
                  >
                    <span
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#EDF2FF",
                        borderRadius: "5px",
                        marginRight: "5px",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="#4C6EF5"
                        className="bi bi-file-earmark-text"
                        viewBox="0 0 16 16"
                        style={{ verticalAlign: "sub" }}
                      >
                        <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                        <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                      </svg>
                    </span>
                    My Menus
                  </Text>
                )}

                {/* Templates menu item */}
                {((user?.role === "user" && !user?.subscriptionActive && !user?.restaurant_id) ||
                  !["owner", "user"].includes(user?.role || "")) && (
                  <Text
                    className={`templates ${
                      navMenu === "templates" ? "active" : ""
                    } cursor-pointer`}
                    fz="sm"
                    ml="sm"
                    onClick={() => {
                      activeClassFun("templates");
                    }}
                  >
                    <span
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#FFF9DB",
                        borderRadius: "5px",
                        marginRight: "5px",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="#FAB005"
                        className="bi bi-columns"
                        viewBox="0 0 16 16"
                        style={{ verticalAlign: "sub" }}
                      >
                        <path d="M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V2zm8.5 0v8H15V2H8.5zm0 9v3H15v-3H8.5zm-1-9H1v3h6.5V2zM1 14h6.5V6H1v8z" />
                      </svg>
                    </span>
                    Templates
                  </Text>
                )}

                {/* Flapjack admin menu items */}
                {user?.role === "flapjack" && (
                  <>
                    <Text
                      className={`myMenu ${
                        navMenu === "customerMenus" ? "active" : ""
                      } cursor-pointer`}
                      ml="sm"
                      fz="sm"
                      onClick={() => {
                        activeClassFun("customerMenus");
                      }}
                    >
                      <span
                        style={{
                          padding: "6px 8px",
                          backgroundColor: "#EDF2FF",
                          borderRadius: "5px",
                          marginRight: "5px",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="#4C6EF5"
                          className="bi bi-file-earmark-text"
                          viewBox="0 0 16 16"
                          style={{ verticalAlign: "sub" }}
                        >
                          <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z" />
                          <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z" />
                        </svg>
                      </span>
                      Customer Menus
                    </Text>
                    <Text
                      className={`myMenu cursor-pointer`}
                      ml="sm"
                      fz="sm"
                      onClick={() => {
                        window.open(
                          "https://flapjack.streamlit.app/#restaurant-menu-analysis-web-tool",
                          "_blank"
                        );
                      }}
                    >
                      <span
                        style={{
                          padding: "6px 8px",
                          backgroundColor: "#ebfbee",
                          borderRadius: "5px",
                          marginRight: "5px",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="#40c057"
                          className="bi bi-bar-chart-line"
                          viewBox="0 0 16 16"
                          style={{ verticalAlign: "sub" }}
                        >
                          <path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zm1 12h2V2h-2zm-3 0V7H7v7zm-5 0v-3H2v3z" />
                        </svg>
                      </span>
                      Analysis
                    </Text>
                  </>
                )}
              </Flex>
            )}

            {/* Custom children passed to header */}
            {children}
          </Flex>

          <Flex align="center">
            {router.pathname.includes("templates") ? (
              canCreateTemplate(user) && (
                <Button
                  data-test-id={DATA_TEST_IDS.HEADER.BUTTON_1}
                  size="xs"
                  color="orange"
                  onClick={() => setIsCreateMenu(true)}
                  sx={{ marginRight: "1rem" }}
                >
                  Create New Menu
                </Button>
              )
            ) : (
              <>
                {/* <Button
                  size="xs"
                  variant="subtle"
                  onClick={
                    session
                      ? triggerUpsellOr(onTemplateDownload)
                      : openAuthDialog
                  }
                  sx={{
                    "&:hover": {
                      backgroundColor: "white",
                    },
                  }}
                >
                  <IconDownload />
                </Button> */}
              </>
            )}
            {isEditorPage && (
              <>
                {onTemplateDownload && (
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={session ? onTemplateDownload : openAuthDialog}
                    sx={{
                      "&:hover": {
                        backgroundColor: "white",
                      },
                    }}
                  >
                    <IconDownload />
                  </Button>
                )}

                {canSave && (
                  <Button
                    size="xs"
                    color="orange"
                    onClick={session ? onTemplateSaveUpdate : openAuthDialog}
                    sx={{ marginRight: "1rem" }}
                  >
                    {router.query.id
                      ? user?.role === "flapjack"
                        ? "Update"
                        : "Save Menu"
                      : user
                      ? "Save"
                      : "Save Menu"}
                  </Button>
                )}
              </>
            )}

            {/* User profile menu or sign in button */}
            {!isCheckoutPage ? (
              isAuthenticated ? (
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <Flex
                      align="center"
                      sx={{
                        cursor: "pointer",
                        padding: "6px 10px",
                        borderRadius: "20px",
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #e9ecef",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: "#f1f3f5",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        },
                      }}
                    >
                      <Avatar radius="xl" size="sm" color="orange">
                        {getUserInitials(user)}
                      </Avatar>
                      {/* <Text ml="xs" mr="xs" size="sm" fw={500} color="gray.7">
                        {getUserDisplayName(user)}
                      </Text> */}
                      <IconChevronDown size={16} color="#adb5bd" />
                    </Flex>
                  </Menu.Target>

                  <Menu.Dropdown
                    sx={{
                      padding: "8px 0",
                      borderRadius: "12px",
                      boxShadow:
                        "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
                      border: "1px solid #f1f1f1",
                    }}
                  >
                    <Menu.Label
                      sx={{
                        padding: "8px 12px",
                        color: "#909296",
                        fontSize: "12px",
                        fontWeight: 500,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      Menu
                    </Menu.Label>

                    {user?.role === "owner" && (
                      <Link
                        href={`/restaurant/${user?.restaurant_id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Menu.Item
                          icon={<IconSettings size={16} stroke={1.5} />}
                          sx={{
                            padding: "10px 12px",
                            borderRadius: "4px",
                            margin: "0 4px",
                            borderLeft: "3px solid transparent",
                            "&:hover": {
                              backgroundColor: "#fff8ee",
                              borderLeftColor: "#f97316",
                            },
                          }}
                        >
                          Settings
                        </Menu.Item>
                      </Link>
                    )}

                    {user?.role === "flapjack" && !router.pathname.includes("/dashboard") && (
                      <Menu.Item
                        icon={
                          <IconDashboard size={16} stroke={1.5} color={theme.colors.green[5]} />
                        }
                        onClick={handleDashboardClick}
                        sx={{
                          padding: "10px",
                          borderRadius: 0,
                          borderLeft: "3px solid transparent",
                          "&:hover": {
                            backgroundColor: theme.colors.orange[0],
                            borderLeftColor: theme.colors.orange[6],
                          },
                        }}
                      >
                        Dashboard
                      </Menu.Item>
                    )}

                    {user?.role === "flapjack" && (
                      <Link href="/billing" passHref>
                        <Menu.Item
                          icon={
                            <IconCreditCard size={16} stroke={1.5} color={theme.colors.blue[5]} />
                          }
                          sx={{
                            padding: "10px",
                            borderRadius: 0,
                            borderLeft: "3px solid transparent",
                            "&:hover": {
                              backgroundColor: theme.colors.orange[0],
                              borderLeftColor: theme.colors.orange[6],
                            },
                          }}
                        >
                          Billing
                        </Menu.Item>
                      </Link>
                    )}

                    {user?.role !== "flapjack" && (
                      <a href="https://www.flapjack.co/contact" target="_blank" rel="noreferrer">
                        <Menu.Item
                          icon={<IconMail size={16} stroke={1.5} color={theme.colors.orange[5]} />}
                          sx={{
                            padding: "10px",
                            borderRadius: 0,
                            borderLeft: "3px solid transparent",
                            "&:hover": {
                              backgroundColor: theme.colors.orange[0],
                              borderLeftColor: theme.colors.orange[6],
                            },
                          }}
                        >
                          Contact Us
                        </Menu.Item>
                      </a>
                    )}

                    <Menu.Item
                      icon={<IconLogout size={16} stroke={1.5} color={theme.colors.red[5]} />}
                      onClick={logout}
                      sx={{
                        padding: "10px",
                        borderRadius: 0,
                        borderLeft: "3px solid transparent",
                        "&:hover": {
                          backgroundColor: theme.colors.orange[0],
                          borderLeftColor: theme.colors.orange[6],
                        },
                      }}
                    >
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <Button onClick={openAuthDialog} color="orange" size="xs" className="sign-up">
                  Sign In
                </Button>
              )
            ) : null}
          </Flex>
        </Flex>
        {/* Auth dialog for non-authenticated users */}
        {!isLoading && !isCheckoutPage && (
          <AuthDialog opened={!session} onClose={closeAuthDialog} />
        )}
        {isCreateMenu && (
          <>
            <InitialCreateMenuModal
              basicTemplate={basicTemplate}
              user={user}
              setIsCreateMenu={setIsCreateMenu}
              isCreateMenu={isCreateMenu}
            />
          </>
        )}
      </Header>
    </>
  );
};

export default AppHeader;
