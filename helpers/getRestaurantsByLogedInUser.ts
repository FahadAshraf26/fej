import { IUserDetails } from "@Interfaces/*";
import { supabase } from "@database/client.connection";

export const getRestaurantsByLogedInUser = async (logedInUser: IUserDetails | null) => {
  if (logedInUser?.role === "flapjack") {
    const { data, error } = await supabase.from("restaurants").select("id,name,location");
    if (error) {
      return [];
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id,name,location")
      .eq("id", logedInUser?.restaurant_id);
    if (error) {
      return [];
    }
    return data;
  }
};
