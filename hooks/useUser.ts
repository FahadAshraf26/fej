import { useContext } from "react";
import { v4 as uuidv4 } from "uuid";
import { UserContext } from "@Context/UserContext";
import { IRestaurantDetail, ITemplateDetails, IUserDetails } from "@Interfaces/";
import { supabase } from "@database/client.connection";
import { APP_CONFIG } from "@Contants/app";
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error(`useUser must be used within a UserContextProvider.`);
  }
  return context.user;
};
export const fetchTemplates = async (): Promise<ITemplateDetails[]> => {
  let user = getUser();
  let templateData;
  if (user?.role === "flapjack") {
    const { data: globalTemplates, error: globalTemplatesError } = await supabase
      .from("templates")
      .select(
        "id, updatedAt, createdBy, name, description, content, tags, isGlobal, menuSize,restaurant_id, location,isAutoLayout"
      )
      .order("templateOrder", { ascending: true });

    if (globalTemplatesError) {
      throw globalTemplatesError;
    }

    templateData = globalTemplates;
  } else if (user?.restaurant_id) {
    // Find restaurant-specific templates based on the restaurant ID
    const { restaurant_id } = user; // Replace 'restaurantId' with the actual field name

    const { data: restaurantTemplates, error: restaurantTemplatesError } = await supabase
      .from("templates")
      .select(
        "id, createdBy, updatedAt, name, description, tags, content, isGlobal, menuSize,restaurant_id, location,isAutoLayout"
      )
      .or(`restaurant_id.eq.${restaurant_id},isGlobal.eq.true`)
      .order("templateOrder", { ascending: true });

    if (restaurantTemplatesError) {
      throw restaurantTemplatesError;
    }

    templateData = restaurantTemplates;
  } else {
    const { data: restaurantTemplates, error: restaurantTemplatesError } = await supabase
      .from("templates")
      .select(
        "id, createdBy, name, updatedAt, description, tags, content, isGlobal, menuSize,restaurant_id, location,isAutoLayout"
      )
      .order("templateOrder", { ascending: true });

    if (restaurantTemplatesError) {
      throw restaurantTemplatesError;
    }

    templateData = restaurantTemplates?.filter(
      (item) => item?.isGlobal || item?.createdBy == user?.id
    );
  }
  return (templateData as ITemplateDetails[]) ?? [];
};

export const fetchAssets = async (user: IUserDetails): Promise<any[]> => {
  let templateData;
  if (user) {
    const { restaurant_id, role, id } = user;
    if (role === "flapjack") {
      const { data: globalTemplates, error: globalTemplatesError } = await supabase
        .from("assets")
        .select("id, createdBy, content ,restaurant_id, height, width")
        .order("created_at", { ascending: false });

      if (globalTemplatesError) {
        throw globalTemplatesError;
      }
      templateData = globalTemplates;
    } else if (restaurant_id) {
      const { data: globalTemplatesResturantId, error: globalTemplatesError } = await supabase
        .from("assets")
        .select("id, createdBy, content ,restaurant_id, height, width")
        .or(`restaurant_id.eq.${restaurant_id}`);

      if (globalTemplatesError) {
        throw globalTemplatesError;
      }

      templateData = globalTemplatesResturantId;
    } else if (id) {
      const { data: globalTemplatesUser, error: globalTemplatesError } = await supabase
        .from("assets")
        .select("id, createdBy, content ,restaurant_id, height, width")
        .or(`createdBy.eq.${id}`);

      if (globalTemplatesError) {
        throw globalTemplatesError;
      }

      templateData = globalTemplatesUser;
    }
  }

  return templateData ?? [];
};

export const fetchResturants = async (user: IUserDetails | null): Promise<IRestaurantDetail[]> => {
  let restaurants;
  if (user) {
    const { role } = user;
    if (role === "flapjack") {
      try {
        const { data: restaurantsData, error: restaurantsDataError } = await supabase.rpc(
          "get_restaurant_subscriptions"
        );
        if (restaurantsDataError) {
          console.error("Error fetching restaurants:", restaurantsDataError);
          return [];
        }
        const reseturantOptions = restaurantsData.map((item: any) => {
          return {
            label: item?.name,
            value: item?.id?.toString(),
            location: item?.locations,
            isAutoLayout: item?.isAutoLayout,
            subscriptionStatus: item?.subscription_status || "Unknown",
          };
        });
        let flapjackRestaurant;
        let otherRestaurants: any = [];
        reseturantOptions.forEach((item: any) => {
          if (item?.value === "2") {
            flapjackRestaurant = item;
          } else {
            otherRestaurants.push(item);
          }
        });
        restaurants = [flapjackRestaurant, ...otherRestaurants];
      } catch (error) {
        console.error("Error in fetchResturants:", error);
        return [];
      }
    }
  }

  return restaurants?.filter(Boolean) ?? [];
};
export const fetchResturantLocations = async (id: string) => {
  const { data: locations, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .eq("restaurantId", id)
    .is("deletedAt", null)
    .order("createdAt", { ascending: true });
  if (locationError) {
    throw locationError;
  }

  // Handle empty locations
  if (!locations || locations.length === 0) {
    return [];
  }

  // Sort with "Default" last, others alphabetically
  return locations.sort((a, b) => {
    if (a.name === APP_CONFIG.LOCATION.DEFAULT) return 1;
    if (b.name === APP_CONFIG.LOCATION.DEFAULT) return -1;
    return a.name.localeCompare(b.name);
  });
};

export const fetchTemplatesByRestaurantId = async (id: string): Promise<ITemplateDetails[]> => {
  const { data: templateData, error: templateDataError } = await supabase
    .from("templates")
    .select("*, locationInformation:locations!locationId(*)")
    .eq("restaurant_id", id)
    .neq("id", 2044);

  if (templateDataError) {
    throw templateDataError;
  }

  return templateData;
};

export const transferTemplate = async (
  templateId: number,
  restaurant_id: string,
  location: string
) => {
  try {
    const { error } = await supabase
      .from("templates")
      .update({
        restaurant_id,
        locationId: location,
      })
      .eq("id", templateId);
    if (error) throw error;
    const { error: updateAssetsError } = await supabase
      .from("assets")
      .update({
        restaurant_id,
      })
      .eq("template_id", templateId);
    const { error: updateFontsErr } = await supabase
      .from("fonts")
      .update({
        restaurant_id,
      })
      .eq("template_id", templateId);
    if (updateFontsErr) throw updateFontsErr;
  } catch (error) {}
};

export const uploadCustomFont = async (
  file: any,
  template: ITemplateDetails | null,
  titleFont: string,
  content: string
) => {
  const user = getUser();

  const { data, error }: { data: any; error: any } = await supabase.storage
    .from("fonts")
    .upload(content, file);
  if (error) {
    console.error("error uploading file");
    return error;
  }
  await supabase.from("fonts").insert({
    content,
    createdBy: user?.id,
    restaurant_id: template !== null ? template.restaurant_id : user?.restaurant_id,
    template_id: template?.id,
    name: titleFont,
  });
};
export const fetchFonts = async (user: IUserDetails): Promise<any[]> => {
  let templateFonts;
  if (user) {
    const { restaurant_id, role, id } = user;
    if (role === "flapjack") {
      const { data: globalFonts, error: globalFontsError } = await supabase
        .from("fonts")
        .select("*");
      if (globalFontsError) {
        throw globalFontsError;
      }
      templateFonts = globalFonts;
    } else if (restaurant_id) {
      const { data: globalFontsResturantId, error: globalFontsError } = await supabase
        .from("fonts")
        .select("*")
        .or(`restaurant_id.eq.${restaurant_id}`);

      if (globalFontsError) {
        throw globalFontsError;
      }

      templateFonts = globalFontsResturantId;
    } else if (id) {
      const { data: globalFontsUser, error: globalFontsError } = await supabase
        .from("fonts")
        .select("*")
        .or(`createdBy.eq.${id}`);

      if (globalFontsError) {
        throw globalFontsError;
      }

      templateFonts = globalFontsUser;
    }
  }
  return templateFonts ?? [];
};
export const canCreateTemplate = (user: IUserDetails | null) => {
  return user && (user.role === "flapjack" || user.role === "owner" || user.role === "user");
};

export const templateArchive = async (template: ITemplateDetails) => {
  try {
    if (!template?.id) return;
    const { data: archiveTemplate } = await supabase
      .from("archive_templates")
      .select("*")
      .eq("id", template?.id);
    const newLocation = uuidv4();
    const { error: coppyError }: { data: any; error: any } = await supabase.storage
      .from("templates")
      .copy(template.content, newLocation);
    if (coppyError) throw coppyError;
    let archiveTemplateData = archiveTemplate?.[0];
    if (archiveTemplateData) {
      if (archiveTemplateData?.content?.length <= 4) {
        const content = [
          ...archiveTemplateData.content,
          { content: newLocation, time: new Date() },
        ];
        await supabase.from("archive_templates").update({ content }).eq("id", template?.id);
      } else {
        const content = archiveTemplateData.content;
        const { error } = await supabase.storage
          .from("templates")
          .remove([archiveTemplateData.content?.[0]?.content]);
        if (error) throw error;
        content.shift();
        content.push({ content: newLocation, time: new Date() });
        await supabase.from("archive_templates").update({ content }).eq("id", template?.id);
      }
    } else {
      const { error: archiveError } = await supabase
        .from("archive_templates")
        .insert({
          ...template,
          content: [{ content: newLocation, time: new Date() }],
        })
        .select();
      if (archiveError) throw archiveError; // if error it will return erro
    }
  } catch (err) {
    console.error(err);
  }
};

export function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(blob);

    image.onload = () => {
      const width = image.width;
      const height = image.height;
      resolve({ width, height });
    };

    image.onerror = (error) => {
      reject(error);
    };
  });
}

export const getUser = () => {
  const user = localStorage.getItem("userData");
  if (user) {
    const userData = JSON.parse(user);
    return userData;
  }
  return null;
};

// export const setAllAssetsHeightWidth = async () => {
//   const { data } = await supabase.from("assets").select("*");
//   if (data) {
//     data.forEach(async (item: any) => {
//       const { width, height } = await getImageDimensionsFromUrl(
//         `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templateImages/${item?.content}`
//       );
//       await supabase
//         .from("assets")
//         .update({ width, height })
//         .eq("id", item?.id);
//       console.log("Updated Width", item?.id);
//     });
//   }
// };

// function getImageDimensionsFromUrl(
//   url: string
// ): Promise<{ width: number; height: number }> {
//   console.log("Test132156", url);
//   return new Promise((resolve, reject) => {
//     const image = new Image();
//     image.src = url;

//     image.onload = () => {
//       const width = image.width;
//       const height = image.height;
//       resolve({ width, height });
//     };

//     image.onerror = (error) => {
//       reject(error);
//     };
//   });
// }
