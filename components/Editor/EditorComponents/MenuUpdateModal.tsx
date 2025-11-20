import React, { useState } from "react";
import Image from "next/image";
import { Modal, Checkbox, Button, Grid, Col, Text, Space } from "@mantine/core";
import ApplyChangesImage from "@Public/Images/applyChanges.jpg";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { supabase } from "@database/client.connection";

export const MenuUpdateModal = () => {
  const isMenuUpdateModalOpen = useInitializeEditor((state) => state.isMenuUpdateModalOpen);

  const user = useInitializeEditor((state) => state.user);
  const setUserData = useInitializeEditor((state) => state.setUserData);
  const setIsMenuUpdatedModalOpen = useInitializeEditor((state) => state.setIsMenuUpdatedModalOpen);

  const [isChecked, setIsChecked] = useState<boolean>(false);

  return (
    <Modal
      centered
      opened={isMenuUpdateModalOpen}
      onClose={() => {
        setIsMenuUpdatedModalOpen(false);
        setIsChecked(false);
      }}
      size="460px"
      styles={{
        header: {
          marginBottom: "0",
        },
      }}
    >
      <Grid px="lg" pb="xs">
        <Col span={12}>
          <Text
            style={{
              textAlign: "center",
              justifyContent: "center",
              fontFamily: "Satoshi-bold-700",
              fontSize: 16,
            }}
          >
            You have updated this menu!
          </Text>
        </Col>
        <Col span={12} py="0 !important">
          <Text
            style={{
              textAlign: "center",
              justifyContent: "center",
              fontFamily: "Satoshi-regular-400",
              fontSize: 14,
            }}
          >
            Please click &quot;Apply Changes&quot; to see your <br /> changes reflected in the menu
            preview.
          </Text>
        </Col>
        <Col span={12}>
          <div
            style={{
              width: "100%",
              height: "168px",
              position: "relative",
              boxShadow: "rgba(0, 0, 0, 0.2) 0px 0px 4px 1px",
              marginTop: "10px",
              marginBottom: "10px",
            }}
          >
            <Image
              src={ApplyChangesImage}
              alt="Apply changes instruction"
              layout="fill"
              objectFit="cover"
              quality={100}
            />
          </div>
        </Col>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <Checkbox
            label="Got it, do NOT show this notification again"
            checked={isChecked}
            color="orange"
            onChange={(event) => {
              setIsChecked(event.target.checked);
            }}
            styles={{
              body: {
                margin: 0,
                padding: 0,
              },
              label: {
                fontFamily: "Satoshi-regular-400 !important",
                fontSize: "12px !important",
                paddingLeft: "4px !important",
                marginTop: "-1px !important",
              },
              input: {
                padding: 0,
                margin: 0,
                maxWidth: 18,
                maxHeight: 18,
              },
              icon: {
                maxWidth: 16,
                maxHeight: 16,
              },
            }}
          />
          <Space w="md" />
          <Button
            disabled={!isChecked}
            size={"xs"}
            color="orange"
            onClick={async () => {
              setIsMenuUpdatedModalOpen(false);
              if (isChecked) {
                const newUser = {
                  ...user,
                  showMenuChange: isChecked,
                };
                setUserData(newUser);

                const updateQuery = supabase.from("profiles").update({ showMenuChange: isChecked });

                if (user.email) {
                  await updateQuery.eq("email", user.email);
                } else if (user.phone) {
                  await updateQuery.eq("phone", user.phone);
                } else {
                  console.error("No email or phone available for update");
                }
              }
            }}
          >
            Save selection
          </Button>
        </div>
      </Grid>
    </Modal>
  );
};
