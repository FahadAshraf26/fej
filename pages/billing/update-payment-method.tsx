import { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import UpdatePaymentMethod from "@Components/billing/UpdatePaymentMethod";
import { Container, Title } from "@mantine/core";
import { useUserContext } from "@Context/UserContext";

const UpdatePaymentMethodPage: NextPage = () => {
  const { user, isLoading } = useUserContext();
  const router = useRouter();

  // useEffect(() => {
  //   if (!isLoading && !user) {
  //     router.push("/login");
  //   }
  // }, [user, isLoading, router]);

  if (isLoading) {
    return null;
  }

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="lg">
        Update Payment Method
      </Title>
      <UpdatePaymentMethod />
    </Container>
  );
};

export default UpdatePaymentMethodPage;
