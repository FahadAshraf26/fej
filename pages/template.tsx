import { useEffect, useState } from "react";
import { GetServerSidePropsContext } from "next";
import { IRestaurantList, ITemplateDetails } from "@Interfaces/";
import { canCreateTemplate } from "@Hooks/index";
import Editor from "@Components/Editor/Editor";
import PrivatePage from "@Components/PrivatePage/PrivatePage";
import { getEditorData } from "@Helpers/EditorData";
import { useUserContext } from "@Context/UserContext";
import { getRestaurantsByLogedInUser } from "@Helpers/getRestaurantsByLogedInUser";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

export const WRAPPER_PADDING = 10;

const Template = ({ data }: { data: ITemplateDetails }) => {
  const { user } = useUserContext();
  const [loader, setloader] = useState(false);
  const [restaurantList, setRestaurantList] = useState<IRestaurantList[]>([]);

  if (typeof window !== "undefined") {
    if (!canCreateTemplate(user)) {
      return <PrivatePage login={!user} />;
    }
  }
  if (typeof window === "undefined") {
    return null;
  }

  // Check user permissions
  if (!canCreateTemplate(user)) {
    return <PrivatePage login={!user} />;
  }

  if (user) {
    return (
      <>
        <Editor
          template={data}
          user={user}
          loader={loader}
          setloader={setloader}
        />
      </>
    );
  }

  return null;
};
export async function getServerSideProps(context: GetServerSidePropsContext) {
  return getEditorData(context);
}
export default Template;
