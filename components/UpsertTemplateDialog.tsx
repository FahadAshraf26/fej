import { Button, Flex, Modal, TextInput, Center, Box, Text, Input, Select } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "next/router";
import { getUser, templateArchive } from "../hooks";
import { ITemplateDetails, IUserDetails } from "@Interfaces/";
import { v4 as uuidv4 } from "uuid";
import { IconPhotoPlus } from "@tabler/icons";
import { useEffect, useRef, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { removeSpecialCharacters } from "../helpers/CommonFunctions";
import { toast } from "react-toastify";
import { updateMenuSectionData } from "./Editor/menuDataOperations";
import { supabase } from "@database/client.connection";
import { updateMenuStates } from "./Editor/Utils";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import Image from "next/image";

interface IUpsertTemplateDialogProps {
  template?: ITemplateDetails | null;
  loader: boolean;
  setIsPreviewLink: (value: boolean) => void;
  setloader: (value: boolean) => void;
  restaurantsOptions: any;
  cesdkInstance?: any;
  user: IUserDetails | null;
}

const UpsertTemplateDialog = ({
  template,
  loader,
  setIsPreviewLink,
  setloader,
  restaurantsOptions,
  cesdkInstance,
  user,
}: IUpsertTemplateDialogProps) => {
  const content = useInitializeEditor((state) => state.content);
  const setTemplateModal = useInitializeEditor((state) => state.setTemplateModal);
  const templateModal = useInitializeEditor((state) => state.templateModal);
  const [isFileEsist, setisFileEsist] = useState(false);
  const userData = getUser();
  const userLocation = userData?.restaurant?.location?.length
    ? user?.restaurant?.location?.map((item: string) => {
        return {
          label: item,
          value: item,
        };
      })
    : [];
  const router = useRouter();
  const imageRef = useRef<HTMLInputElement | null>(null);
  const [locations, setlocations] = useState(userLocation);
  const [restaurantId, setRestaurantId] = useState(template?.restaurant_id || "");
  const [location, setLocation] = useState(template?.location || "");
  const [isModalOpen, { open, close }] = useDisclosure(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [values, setValues] = useState();
  const filUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/renderings/${
    router.query.id
  }/coverImage?${Date.now()}`;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (loader) {
      e.preventDefault();
      e.returnValue = "Unsaved template. Going back may lose changes.";
    }
  };

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loader]);

  const form = useForm({
    initialValues: {
      name: removeSpecialCharacters(template?.name) || "",
      description: removeSpecialCharacters(template?.description) || "",
      coverImage: null,
    },
    validate: {
      name: (value: string) => (value ? null : "Required"),
      description: (value: string) => (value ? null : "Required"),
    },
  });

  const onSubmit = async (values: any) => {
    abortControllerRef.current = new AbortController(); // Create a new abort controller
    const signal = abortControllerRef.current.signal;

    try {
      setloader(true);
      usePageStore.getState().setMenuName(values.name);
      const isUpdating = router.query.id;
      const file = new Blob([content], { type: "text/plain" });
      timeoutRef.current = setTimeout(() => {
        setTemplateModal(false);
        toast.info("Menu is saving", {
          hideProgressBar: true,
          autoClose: 3000,
        });
      }, 500);

      let contentUpload = "";
      const userCanUpdate =
        user?.role === "flapjack" ||
        (!template?.isGlobal && user?.subscriptionActive) ||
        user?.role === "owner" ||
        user?.role === "user";

      if (isUpdating && template?.content && userCanUpdate) {
        templateArchive(template);

        // No signal passed here, manually check if operation should proceed
        const { data, error } = await supabase.storage
          .from("templates")
          .update(`${template?.content}`, file);

        if (error) return;

        await supabase
          .from("templates")
          .update({
            name: removeSpecialCharacters(values?.name),
            description: removeSpecialCharacters(values?.description),
            updatedAt: new Date(),
            restaurant_id: restaurantId,
            location,
          })
          .eq("id", template?.id);

        updateMenuStates(cesdkInstance);

        if (values?.coverImage) {
          const folderPath = `renderings/${router.query.id}`;
          const isEsist = await checkFileExists();
          if (isEsist) {
            await supabase.storage.from(folderPath).update("coverImage", values?.coverImage);
          } else {
            await supabase.storage.from(folderPath).upload("coverImage", values?.coverImage);
          }
        }
      } else {
        const { data, error } = await supabase.storage.from("templates").upload(uuidv4(), file);

        if (error) return;
        contentUpload = data?.path;
      }

      if (!isUpdating) {
        const { error, data } = await supabase
          .from("templates")
          .insert({
            name: removeSpecialCharacters(values?.name),
            description: removeSpecialCharacters(values?.description),
            content: contentUpload,
            isGlobal: user?.role === "flapjack" ? false : true,
            restaurant_id: restaurantId || user?.restaurant_id,
            createdBy: user?.id,
            created_at: new Date(),
            updatedAt: new Date(),
            location,
          })
          .select();

        if (error) throw error;

        await updateMenuSectionData(data?.[0]?.id, data?.[0]?.isAutoLayout);

        if (values?.coverImage) {
          const folderPath = `renderings/${data?.[0]?.id}`;
          await supabase.storage.from(folderPath).upload("coverImage", values?.coverImage);
        }

        await router.push(`/menu/${data?.[0]?.id}`);
      } else {
        await updateMenuSectionData(template?.id, template!.isAutoLayout);
      }

      if (window.location.href.includes("/menu/")) {
        timeoutRef.current = setTimeout(() => {
          toast.success("Save completed", {
            hideProgressBar: true,
            autoClose: 2000,
          });
        }, 500);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        throw err; // Only throw if it's not due to the abort signal
      }
    } finally {
      setloader(false);
      close();
      // if (alsoPublish && user) {
      //    onPublish({ user, router });
      // }
      setTemplateModal(false);
      abortControllerRef.current = null; // Reset abort controller
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file: any = e.target.files && e.target.files[0];
    if (file) {
      setisFileEsist(false);
      form.setFieldValue("coverImage", file);
    } else {
      form.setFieldValue("coverImage", null);
    }
  };

  const checkFileExists = async () => {
    const response = await fetch(filUrl);
    return response?.status === 200;
  };

  useEffect(() => {
    checkFileExists().then((res) => {
      setisFileEsist(res);
    });
  }, [router.query.id]);

  const handleModal = (values: any) => {
    setValues(values);
    open();
  };

  return (
    <Modal
      title={template ? "Update Template" : "Add Template"}
      opened={templateModal}
      withCloseButton
      onClose={() => setTemplateModal(false)}
      size="xl"
      radius="md"
      centered
    >
      <form
        onSubmit={form.onSubmit(
          user?.role === "flapjack" && template?.isGlobal ? handleModal : onSubmit
        )}
      >
        <Input
          accept="image/*"
          onChange={handleCoverImageChange}
          style={{ marginBottom: "20px", display: "none" }}
          type="file"
          ref={imageRef}
        />
        <Center>
          <Box
            style={{
              width: "100px",
              height: "100px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#f0f0f0",
            }}
            onClick={() => {
              if (imageRef?.current) {
                imageRef?.current.click();
              }
            }}
          >
            {form.values.coverImage || isFileEsist ? (
              <Image
                src={
                  isFileEsist
                    ? filUrl
                    : form?.values?.coverImage
                    ? URL.createObjectURL(form?.values?.coverImage)
                    : ""
                }
                alt="Selected"
                style={{
                  height: "100px",
                  width: "100px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Text align="center">
                <IconPhotoPlus size={56} />
              </Text>
            )}
          </Box>
        </Center>
        <TextInput
          withAsterisk
          label="Template Name"
          placeholder="Template name"
          {...form.getInputProps("name")}
          value={removeSpecialCharacters(form.getInputProps("name").value)}
        />
        <TextInput
          withAsterisk
          label="Template Description"
          placeholder="Template Description"
          {...form.getInputProps("description")}
          value={removeSpecialCharacters(form.getInputProps("description").value)}
        />
        {user?.role === "flapjack" && (
          <>
            <Select
              label="Select a restaurant"
              placeholder="Select a restaurant"
              data={restaurantsOptions}
              searchable
              value={restaurantId}
              onChange={(value: string) => {
                let locationExist: any = restaurantsOptions?.filter(
                  (item: any) => item?.value === value
                );
                let location = locationExist[0]?.location;
                if (location?.length) {
                  const locationMap = location.map((item: string) => {
                    return {
                      label: item,
                      value: item,
                    };
                  });
                  setlocations(locationMap);
                } else {
                  setlocations([]);
                }
                setRestaurantId(value);
              }}
              maxDropdownHeight={400}
              nothingFound="Restaurant not found"
              filter={(value: string, item: any) =>
                item.label.toLowerCase().includes(value.toLowerCase().trim())
              }
            />
            {locations?.length ? (
              <Select
                label="Select a restaurant location"
                placeholder="Select a restaurant location"
                data={locations}
                value={location}
                onChange={(value: string) => {
                  setLocation(value);
                }}
              />
            ) : (
              <></>
            )}
          </>
        )}
        <Flex justify="flex-end" mt="lg">
          <Button variant="filled" type="submit" loading={loader}>
            {template ? "Update" : "Save"}
          </Button>
        </Flex>
      </form>
      <Modal
        centered
        size={411}
        opened={isModalOpen}
        onClose={close}
        styles={{
          header: {
            marginBottom: 0,
          },
        }}
      >
        <Text size={14} weight={300} px="sm">
          Warning: this menu is live. Saving changes to this menu will automatically show to the
          customer. Are you REALLY sure this is what you are trying to do?
        </Text>

        <Flex mt="xl" justify="center">
          <Button
            color="yellow.9"
            size="sm"
            onClick={() => onSubmit(values)}
            disabled={loader}
            mr="md"
          >
            {loader ? "Loading..." : "Yes, let me save"}
          </Button>
          <Button variant="outline" color="dark" size="sm" onClick={close}>
            No, take me back
          </Button>
        </Flex>
      </Modal>
    </Modal>
  );
};

export default UpsertTemplateDialog;
