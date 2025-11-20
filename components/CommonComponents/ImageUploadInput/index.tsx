import { useState, useRef, useEffect } from "react";
import {
  Input,
  Center,
  Box,
  Text,
  Group,
  ActionIcon,
  createStyles,
  useMantineTheme,
} from "@mantine/core";
import {
  IconPhotoPlus,
  IconTrash,
  IconRefresh,
  IconUpload,
} from "@tabler/icons";
import { ITemplateDetails } from "interfaces/ITemplate";
import { checkFileExists } from "@Components/Editor/Utils";
import Image from "next/image";

interface ImageUploadInputProps {
  template?: ITemplateDetails;
  form?: any;
}

const useStyles = createStyles((theme) => ({
  wrapper: {
    position: "relative",
    marginBottom: 0,
  },
  uploadBox: {
    width: "220px",
    height: "220px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.colors.dark[6]
        : theme.colors.gray[1],
    borderRadius: theme.radius.md,
    border: `2px dashed ${
      theme.colorScheme === "dark" ? theme.colors.dark[3] : theme.colors.gray[4]
    }`,
    cursor: "pointer",
    transition: "all 0.2s ease",
    overflow: "hidden",
    position: "relative",

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[2],
      borderColor: theme.colors.orange[5],
    },
  },
  dragActive: {
    borderColor: theme.colors.orange[5],
    backgroundColor: theme.fn.rgba(theme.colors.orange[5], 0.1),
  },
  image: {
    height: "100%",
    width: "100%",
    objectFit: "contain",
  },
  overlay: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    display: "flex",
    gap: theme.spacing.xs,
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  iconWrapper: {
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[2]
        : theme.colors.gray[6],
    marginBottom: theme.spacing.xs,
  },
  helpText: {
    fontSize: theme.fontSizes.sm,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[2]
        : theme.colors.gray[6],
    maxWidth: "180px",
    textAlign: "center",
  },
}));

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  template,
  form,
}) => {
  const { classes, cx } = useStyles();
  const theme = useMantineTheme();
  const [isFileExists, setIsFileExists] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const fileUrl = `${
    process.env.NEXT_PUBLIC_SUPABASE_URL
  }/storage/v1/object/public/renderings/${
    template?.id
  }/coverImage?${Date.now()}`;

  useEffect(() => {
    checkFileExists(fileUrl).then((res) => {
      if (res) {
        setIsFileExists(true);
      } else {
        setIsFileExists(false);
      }
    });
  }, [fileUrl]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file: any = e.target.files && e.target.files[0];
    if (file) {
      setIsFileExists(false);
      form.setFieldValue("coverImage", file);
    } else {
      form.setFieldValue("coverImage", null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // Check if file is an image
      if (file.type.startsWith("image/")) {
        setIsFileExists(false);
        form.setFieldValue("coverImage", file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    form.setFieldValue("coverImage", null);
    setIsFileExists(false);
  };

  const handleRefreshImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    checkFileExists(fileUrl).then((res) => {
      setIsFileExists(res);
    });
  };

  return (
    <Box className={classes.wrapper}>
      <Input
        accept="image/*"
        onChange={handleCoverImageChange}
        style={{ display: "none" }}
        type="file"
        ref={imageRef}
      />

      <Box
        ref={dropZoneRef}
        className={cx(classes.uploadBox, { [classes.dragActive]: isDragging })}
        onClick={() => {
          if (imageRef?.current) {
            imageRef?.current.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleDragOver}
      >
        {form.values.coverImage || isFileExists ? (
          <>
            <Image
              src={
                isFileExists
                  ? fileUrl
                  : form?.values?.coverImage
                  ? URL.createObjectURL(form?.values?.coverImage)
                  : ""
              }
              alt="Thumbnail"
              width={220}
              height={220}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            <Group className={classes.overlay}>
              {isFileExists && (
                <ActionIcon
                  color="orange"
                  variant="filled"
                  radius="xl"
                  size="md"
                  onClick={handleRefreshImage}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              )}
              <ActionIcon
                color="red"
                variant="filled"
                radius="xl"
                size="md"
                onClick={handleRemoveImage}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </>
        ) : (
          <div className={classes.placeholder}>
            <div className={classes.iconWrapper}>
              {isDragging ? (
                <IconUpload size={56} color={theme.colors.orange[5]} />
              ) : (
                <IconPhotoPlus size={56} />
              )}
            </div>
            <Text className={classes.helpText}>
              {isDragging ? "Drop to upload" : "Click or drag an image here"}
            </Text>
          </div>
        )}
      </Box>

      {form.errors?.coverImage && (
        <Text color="red" size="sm" mt="xs" align="center">
          {form.errors.coverImage}
        </Text>
      )}
    </Box>
  );
};

export default ImageUploadInput;
