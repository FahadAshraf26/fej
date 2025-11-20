/* pages/menu/embed/[id]/[menu_id].tsx 
This route displays a branded rendering of the menu
**/
import { GetServerSidePropsContext } from "next";
import React, { useEffect, useState } from "react";
import { Flex, Text, Box, Button } from "@mantine/core";
import { useRouter } from "next/router";
import { getLogedInUser } from "../../../../tests/helpers/database.helper";
import { IUserDetails } from "../../../../interfaces";
import { createClient } from "@supabase/supabase-js";
import { useMediaQuery } from "@mantine/hooks";
import Image from "next/image";

type ImageType = {
  publicUrl: string;
};
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const PdfPage = ({ user }: { user: IUserDetails }) => {
  const router = useRouter();
  const [menuImages, setMenuImages] = useState<ImageType[]>([]);
  const smallScreen = useMediaQuery("(max-width: 400px)");
  const mediumScreen = useMediaQuery(
    "(min-width: 401px) and (max-width: 600px)"
  );

  let transform = "scale(0.8)";
  let padding = "10px 20px";
  if (smallScreen) {
    transform = "scale(0.5)";
    padding = "0px";
  } else if (mediumScreen) {
    transform = "scale(0.8)";
  }

  const styles = {
    transform: transform,
    padding: padding,
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error: _ } = await supabase.storage
          .from("JPEGs")
          .list(`${router.query.id}/${router.query.menu_id}`, {
            limit: 20,
            offset: 0,
            sortBy: { column: "name", order: "asc" },
          });
        if (data) {
          const imgArray = data.map((image) => {
            return {
              publicUrl: `${
                process.env.NEXT_PUBLIC_SUPABASE_URL
              }/storage/v1/object/public/JPEGs/${router.query.id}/${
                router.query.menu_id
              }/${image.name}?version=${Date.now()}`,
            };
          });
          setMenuImages(imgArray);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
      }
    };

    fetchData();
  }, [router.query.id, router.query.menu_id]);
  return (
    <div
      style={{
        backgroundColor: "#e7ebee",
        display: "block",
        padding: "0",
      }}
    >
      {menuImages.map((img: ImageType, index: number) => (
        <div
          key={index}
          style={{
            display: "block",
            width: "100%",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          <img
            src={img.publicUrl}
            alt={`Menu page ${index + 1}`}
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      ))}
    </div>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const logedInUser = await getLogedInUser(context);
  return {
    props: {
      user: logedInUser,
    },
  };
}

export default PdfPage;
