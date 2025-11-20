import { useEffect, useState } from "react";
import { GetServerSidePropsContext } from "next";
import PrivatePage from "@Components/PrivatePage/PrivatePage";
import AppHeader from "@Components/Header";
import { getTemplateVersionData } from "@Helpers/EditorData";
import { ITemplate, IUserDetails } from "@Interfaces/";
import { getLogedInUser } from "@Helpers/getLogedInUser";
import { getRestaurantsByLogedInUser } from "@Helpers/getRestaurantsByLogedInUser";
import { useRouter } from "next/router";
import HistoryEditor from "@Components/Editor/HistoryEditor";

const HistoryMenu = ({ user }: { user: IUserDetails }) => {
  const router = useRouter();
  const { id } = router.query;
  const [loader, setloader] = useState<boolean>(false);
  const [data, setData] = useState<ITemplate | null>(null);
  const version = router.query.v;

  useEffect(() => {
    if (!id) return;

    const initializeData = async () => {
      setloader(true);
      try {
        const editorData = await getTemplateVersionData(Number(id), version);
        setData(editorData.props.data);
      } catch (error) {
        console.error("Error initializing data:", error);
        setData(null);
      } finally {
        setloader(false);
      }
    };

    initializeData();
  }, [id, version]);

  if (!user) {
    return <PrivatePage login={true} />;
  }

  if (loader) {
    return <AppHeader loader={true} />;
  }

  if (!data) {
    return <PrivatePage text="The dog ate this menu!" />;
  }

  if (
    user?.role !== "flapjack" &&
    !data.isGlobal &&
    user?.restaurant_id !== data.restaurant_id
  ) {
    return <PrivatePage login={true} />;
  }

  return (
    <>
      <AppHeader loader={loader} />
      <HistoryEditor templateData={data} />
    </>
  );
};
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const logedInUser = await getLogedInUser(context);
  const restaurantList = await getRestaurantsByLogedInUser(logedInUser);
  return {
    props: {
      user: logedInUser,
      restaurantList,
    },
  };
}

export default HistoryMenu;
