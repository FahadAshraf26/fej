import { useEffect, useState } from "react";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import Editor from "@Components/Editor/Editor";
import PrivatePage from "@Components/PrivatePage/PrivatePage";
import AppHeader from "@Components/Header";
import { getEditorData } from "@Helpers/EditorData";
import { IRestaurantList, ITemplate, IUserDetails } from "@Interfaces/";
import { getLogedInUser } from "@Helpers/getLogedInUser";
import { getRestaurantsByLogedInUser } from "@Helpers/getRestaurantsByLogedInUser";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { useTemplateStore } from "@Stores/Template/Template.store";
import { useSubscriptionContext } from "../../context/SubscriptionContext";
import { Box, Loader } from "@mantine/core";
import SubscriptionPopup from "@Components/CommonComponents/SubscriptionPopup";
import { HEADER_HEIGHT } from "pages/_app";

const Menu = ({
  data,
  initialUser,
  restaurantList = [],
}: {
  data: ITemplate;
  initialUser: IUserDetails | null;
  restaurantList: Array<IRestaurantList | []>;
}) => {
  const router = useRouter();
  const [user, setUser] = useState<IUserDetails | null>(initialUser);
  const [loader, setloader] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const {
    subscriptionStatus,
    isFlapjack,
    isLoading: isSubscriptionLoading,
  } = useSubscriptionContext();

  useEffect(() => {
    if (restaurantList.length) {
      useInitializeEditor.getState().setRestaurantList(restaurantList);
    }
  }, [restaurantList]);

  // Invalidate cache for the restaurant when the menu page loads
  useEffect(() => {
    if (data?.restaurant_id) {
      useTemplateStore.getState().invalidateRestaurantCache(data.restaurant_id);
    }
  }, [data?.restaurant_id]);

  // Render content based on conditions
  const renderContent = () => {
    if (!user) {
      return <PrivatePage login={true} />;
    }

    if (user?.role !== "flapjack") {
      if (!data?.isGlobal && user?.restaurant_id !== data?.restaurant_id) {
        return <PrivatePage login={!user} />;
      }
    }

    if (!data) {
      return (
        <PrivatePage
          title="Sorry"
          text="The dog ate this menu!"
          subtitle="Feel free to contact us for additional help"
        />
      );
    }

    // Show loading while subscription data is being fetched
    if (isSubscriptionLoading) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader variant="dots" size="lg" color="#ff6b35" />
        </Box>
      );
    }

    // Use centralized subscription logic
    if (!isFlapjack && !subscriptionStatus.canAccessFeatures && !isSubscriptionLoading) {
      return <SubscriptionPopup type="subscription-required" />;
    }

    if (!isFlapjack && subscriptionStatus.canAccessFeatures && subscriptionStatus.hasPaymentIssues && !isSubscriptionLoading) {
      return <SubscriptionPopup type="payment-issues" />;
    }

    // If we're still loading or don't have definitive data, show loading
    if (isSubscriptionLoading) {
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader variant="dots" size="lg" color="#ff6b35" />
        </Box>
      );
    }

    return (
      <Editor
        menuContent={data}
        template={data}
        user={user}
        loader={loader}
        setloader={setloader}
      />
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          // zIndex: user ? 1 : 0,
          height: HEADER_HEIGHT,
          transition: "top 0.3s ease-in-out", // Smooth position transition
          backgroundColor: "#fff", // Ensure no transparency causing grey area
        }}
      >
        <AppHeader loader={loader} />
      </div>
      <Box
        sx={{
          position: "relative",
          // zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginTop: HEADER_HEIGHT,
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    const editorData = await getEditorData(context);
    const logedInUser = await getLogedInUser(context);
    const restaurantList = logedInUser ? await getRestaurantsByLogedInUser(logedInUser) : [];

    return {
      props: {
        data: editorData.props.data,
        initialUser: logedInUser,
        restaurantList,
      },
    };
  } catch (error) {
    console.error("Error in getServerSideProps:", error);
    return {
      props: {
        data: null,
        initialUser: null,
        restaurantList: [],
      },
    };
  }
}

export default Menu;
