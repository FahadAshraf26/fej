import { GetServerSidePropsContext } from "next";
import { supabaseServer as supabase } from "@database/server.connection";

export async function getLogedInUser(context: GetServerSidePropsContext) {
  const refreshToken = context?.req.cookies["supabase-refresh-token"] ?? "";
  const accessToken = context?.req.cookies["supabase-auth-token"] ?? "";
  await supabase.auth.setSession({
    refresh_token: refreshToken,
    access_token: accessToken,
  });
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  const reesponse = await supabase.from("profiles").select("*").eq("id", data?.user?.id).single();
  if (reesponse?.error) {
    return null;
  }
  let userDetail = {
    ...data?.user,
    ...reesponse?.data,
  };
  return userDetail;
}
