import "reflect-metadata";
import { useState, useEffect } from "react";
import { AppProps } from "next/app";
import Head from "next/head";
import { MantineProvider, AppShell } from "@mantine/core";
import { SessionContextProvider, Session } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import theme from "../config/theme";
import Header from "../components/Header";
import "../styles/globals.css";
import { NotificationsProvider } from "@mantine/notifications";
import { GoogleAnalytics } from "nextjs-google-analytics";
import { UserContextProvider, useUserContext } from "../context/UserContext";
import { SubscriptionProvider } from "../context/SubscriptionContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NetworkStatus from "@Components/Editor/NetworkStatus";
import { supabase } from "@database/client.connection";
import PaymentFailureBanner from "@Components/billing/PaymentFailureBanner";
import WhitelistBanner from "@Components/WhitelistBanner";
import "../lib/container";
import { ModalProvider } from "../context/ModalContext";
import ModalRegistry from "../components/Modals/ModalRegistry";

export const HEADER_HEIGHT = 60;
export const BANNER_HEIGHT = 54;
export const TOTAL_HEIGHT_WITH_BANNER = HEADER_HEIGHT + BANNER_HEIGHT;

const BannerWrapper = ({
  setIsBannerVisible,
}: {
  setIsBannerVisible: (visible: boolean) => void;
}) => {
  const router = useRouter();
  const { user } = useUserContext();

  // Always ensure banner visibility is set correctly
  useEffect(() => {
    if (!user) {
      setIsBannerVisible(false);
    }
  }, [user, setIsBannerVisible]);

  if (
    !router.pathname.includes("preview") &&
    !router.pathname.includes("embed") &&
    !router.pathname.includes("tv/") &&
    !router.pathname.startsWith("/subscription/") &&
    user
  ) {
    return (
      <>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: user ? 202 : 0,
            transition: "transform 0.3s ease-in-out",
            transform: "translateY(0)",
            margin: 0,
            padding: 0,
            display: "block", // Ensure proper display
          }}
        >
          <PaymentFailureBanner isShown={setIsBannerVisible} />
        </div>
        <WhitelistBanner />
      </>
    );
  }
  return null;
};

// Custom Header component that adjusts position based on banner visibility
const PositionedHeader = ({ isBannerVisible }: { isBannerVisible: boolean }) => {
  const { user } = useUserContext();
  return (
    <div
      style={{
        position: "fixed",
        top: isBannerVisible ? BANNER_HEIGHT : 0,
        left: 0,
        right: 0,
        zIndex: user ? 201 : 0,
        height: HEADER_HEIGHT,
        transition: "top 0.3s ease-in-out", // Smooth position transition
        backgroundColor: "#fff", // Ensure no transparency causing grey area
      }}
    >
      <Header />
    </div>
  );
};

export default function App({
  Component,
  pageProps,
}: AppProps<{
  initialSession: Session;
}>) {
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [bannerAnimated, setBannerAnimated] = useState(false);
  const { user } = useUserContext();

  useEffect(() => {
    setInitialized(true);
    // Trigger banner animation after component mounts
    if (isBannerVisible) {
      setTimeout(() => setBannerAnimated(true), 50);
    }
  }, [isBannerVisible]);

  // Reset banner visibility when user logs out
  useEffect(() => {
    if (!user) {
      setIsBannerVisible(false);
    }
  }, [user]);

  if (!initialized) {
    return null;
  }

  const isSpecialRoute =
    router.pathname.includes("preview") ||
    router.pathname.includes("embed") ||
    router.pathname.includes("tv/") ||
    router.pathname.includes("billing/success") ||
    router.pathname.includes("billing/cancel") ||
    router.pathname.includes("menu/");

  const isCheckoutRoute =
    router.pathname.includes("checkout") || router.pathname.startsWith("/subscription/");
  const isTemplatesRoute = router.pathname.includes("templates");

  return (
    <>
      <Head>
        <title>Flapjack</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <MantineProvider withGlobalStyles withNormalizeCSS theme={theme}>
        <NotificationsProvider position="top-right" zIndex={2077}>
          <SessionContextProvider
            supabaseClient={supabase}
            initialSession={pageProps.initialSession}
          >
            <UserContextProvider>
              <ModalProvider>
                <SubscriptionProvider>
                  <ModalRegistry />
                  {/* Banner and Header outside AppShell for better control */}
                  {!isSpecialRoute && (
                    <>
                      <BannerWrapper setIsBannerVisible={setIsBannerVisible} />
                      <PositionedHeader isBannerVisible={isBannerVisible} />
                    </>
                  )}
                  <AppShell
                    padding={0}
                    styles={(theme) => ({
                      main: {
                        backgroundColor: isCheckoutRoute
                          ? "#fff"
                          : !isTemplatesRoute
                          ? "#e7ebee"
                          : "inherit",
                        minHeight: 0,
                        maxHeight: `calc(100vh - ${
                          isSpecialRoute
                            ? 0
                            : isBannerVisible
                            ? TOTAL_HEIGHT_WITH_BANNER
                            : HEADER_HEIGHT
                        }px)`,
                        paddingTop: isSpecialRoute
                          ? 0
                          : isBannerVisible
                          ? TOTAL_HEIGHT_WITH_BANNER
                          : HEADER_HEIGHT,
                        transition: "padding-top 0.3s ease-in-out, max-height 0.3s ease-in-out", // Smooth content adjustment
                      },
                    })}
                  >
                    <GoogleAnalytics trackPageViews />
                    <NetworkStatus />
                    <Component {...pageProps} />
                    <ToastContainer />
                  </AppShell>
                </SubscriptionProvider>
              </ModalProvider>
            </UserContextProvider>
          </SessionContextProvider>
        </NotificationsProvider>
      </MantineProvider>
    </>
  );
}
