import { getElementsWithRestaurant, translateToAssetResult } from "@Components/Editor/Utils";
import { IUserDetails } from "interfaces/IUserDetails";

export const getImagePanelData = async (loggedInUser: IUserDetails) => {
  const configData = await getElementsWithRestaurant(loggedInUser);

  const createCleanId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  return configData?.globalTemplates
    ?.map((element: any) => {
      if (element?.items?.length > 0 && element?.resturantDetail?.name) {
        const cleanId = createCleanId(element.resturantDetail.name);

        return {
          eleList: element?.items.map((item: any) => {
            const asset = translateToAssetResult(item);
            return asset;
          }),
          id: cleanId,
          restaurantName: element?.resturantDetail?.name,
        };
      }
      return null;
    })
    .filter((el: any) => el !== null);
};
