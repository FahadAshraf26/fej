import { v4 as uuidv4 } from "uuid";
import { supabase } from "@database/client.connection";
import { ITemplateDetails, IUserDetails } from "@Interfaces/";
import { getImageDimensions } from "@Hooks/useUser";
import { removeSpecialCharacters } from "@Helpers/CommonFunctions";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { getImagePanelData } from "@Helpers/ImagePanelData";
import { onPublish } from "../Utils/publishMenu";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { uploadFile } from "@Helpers/UploadFile";
import { toast } from "react-toastify";
const downloadBlobFile = (blob: any, fileName: string) => {
  try {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.pdf`;
    link.click();
  } catch (error: any) {
    const errorMessage = error?.message ? error?.message : "Something went wrong";
    alert(errorMessage);
  }
};

type ImageQuality = number; // Value between 0 and 1

interface ResizeImageOptions {
  maxWidth: number;
  maxHeight: number;
  quality: ImageQuality;
}

const resizeImage = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: ImageQuality
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate input file
      if (!file) {
        reject(new Error("No file provided for compression"));
        return;
      }

      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        reject(new Error("File must be an image"));
        return;
      }

      // Convert File to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = reader.result?.toString().split(",")[1];

          if (!base64Data) {
            throw new Error("Failed to process image data");
          }

          // Make request to our API endpoint
          const response = await fetch("/api/compress-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageData: base64Data,
              maxWidth,
              maxHeight,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || `Server error: ${response.status}`;
            throw new Error(errorMessage);
          }

          const { success, data, message } = await response.json();

          if (!success) {
            throw new Error(message || "Failed to compress image");
          }

          if (!data) {
            throw new Error("No compressed image data received");
          }

          // Convert base64 back to blob
          const byteCharacters = atob(data);
          const byteArrays = [];

          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);

            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }

          const blob = new Blob(byteArrays, {
            type: file.type || "image/jpeg",
          });
          resolve(blob);
        } catch (error: any) {
          console.error("Error in resizeImage processing:", error);
          reject(new Error(error.message || "Failed to process image"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read the selected file"));
      };
    } catch (error: any) {
      console.error("Error in resizeImage setup:", error);
      reject(new Error(error.message || "Failed to initialize image processing"));
    }
  });
};

export const editorCallbacks = async (
  menuContent: ITemplateDetails | null | undefined,
  template: ITemplateDetails | null,
  saveTemplate: (value: string) => void,
  user: IUserDetails
) => {
  const cesdkInstance = useInitializeEditor.getState().cesdkInstance;
  return {
    onExport: async (blobs: any) => {
      let isAbleToExport = true;

      if (isAbleToExport) {
        isAbleToExport = false;
        downloadBlobFile(
          blobs?.[0],
          removeSpecialCharacters(menuContent?.name ?? template?.name) || ""
        );
      }
      setTimeout(() => {
        isAbleToExport = true;
      }, 1000);
    },
    captureCoverImage: async (blobs: any) => {
      let isAbleToExport = true;

      if (isAbleToExport) {
        isAbleToExport = false;
        // You might want to add a file extension for image downloads
        downloadBlobFile(
          blobs?.[0],
          `${removeSpecialCharacters(menuContent?.name ?? template?.name) || ""}.png`
        );
      }
      setTimeout(() => {
        isAbleToExport = true;
      }, 1000);
    },
    onPublish: async () => {
      onPublish({
        restaurantId: template?.restaurant_id,
        templateId: template?.id.toString(),
      });
    },
    onUpload: async (file: File) => {
      try {
        // Validate file size
        const maxFileSize = 10 * 1024 * 1024;

        if (file.size > maxFileSize) {
          const errorMessage = `File size too large. Please upload files smaller than 10MB. Current file size: ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB`;
          throw new Error(errorMessage);
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
          const errorMessage = "Please upload a valid image file";
          throw new Error(errorMessage);
        }

        let isAbleToExport = true;
        const data: any = await new Promise(async (resolve, reject) => {
          if (isAbleToExport) {
            isAbleToExport = false;
            const dpi = 300;
            const content = uuidv4();

            try {
              if (file.type === "image/svg+xml") {
                // Handle SVG files directly without compression
                await uploadFile("templateImages", content, file);

                const { height, width } = await getImageDimensions(file);

                await supabase.from("assets").insert({
                  content,
                  createdBy: user?.id,
                  restaurant_id: template !== null ? template.restaurant_id : user?.restaurant_id,
                  template_id: template?.id,
                  height,
                  width,
                });

                setTimeout(() => {
                  isAbleToExport = true;
                }, 1000);

                await getImagePanelData(user);

                const responseData = {
                  path: content,
                };

                resolve(responseData);
                return;
              }

              const documentHeight =
                cesdkInstance.current.engine.block.getHeight(
                  cesdkInstance.current.engine.scene.getCurrentPage()
                ) * dpi;
              const documentWidth =
                cesdkInstance.current.engine.block.getWidth(
                  cesdkInstance.current.engine.scene.getCurrentPage()
                ) * dpi;

              const resizedFile: any = await resizeImage(file, documentWidth, documentHeight, 1);

              await uploadFile("templateImages", content, resizedFile);

              const { height, width } = await getImageDimensions(file);

              await supabase.from("assets").insert({
                content,
                createdBy: user?.id,
                restaurant_id: template !== null ? template.restaurant_id : user?.restaurant_id,
                template_id: template?.id,
                height,
                width,
              });

              setTimeout(() => {
                isAbleToExport = true;
              }, 1000);

              await getImagePanelData(user);

              const responseData = {
                path: content,
              };

              resolve(responseData);
            } catch (error: any) {
              setTimeout(() => {
                isAbleToExport = true;
              }, 1000);
              reject(error);
            }
          } else {
            const errorMessage = "Please login to continue";
            reject(new Error(errorMessage));
          }
        });

        toast.success("Image uploaded successfully!");

        return (
          data && {
            id: uuidv4(),
            name: file?.name || "upload",
            meta: {
              uri: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templateImages/${data?.path}`,
              thumbUri: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templateImages/${data?.path}`,
            },
          }
        );
      } catch (error: any) {
        let userMessage = "Failed to upload image. Please try again.";

        if (error.message) {
          if (error.message.includes("size too large")) {
            userMessage = error.message;
          } else if (error.message.includes("valid image file")) {
            userMessage = error.message;
          } else if (error.message.includes("login")) {
            userMessage = "Please login to upload images";
          } else if (error.message.includes("compress")) {
            userMessage =
              "Failed to process image. Please try a different image or contact support.";
          } else if (error.message.includes("network") || error.message.includes("fetch")) {
            userMessage = "Network error. Please check your connection and try again.";
          } else if (error.message.includes("storage") || error.message.includes("upload")) {
            userMessage = "Failed to save image. Please try again.";
          }
        }

        throw new Error(userMessage);
      }
    },
    onSave: async () => {
      if (usePageStore.getState().changedPageIds.size > 0 || usePageStore.getState().naci) {
        useInitializeEditor.getState().setIsSaving(true);
        useInitializeEditor.getState().setIsApplyMenu();
      }
    },
  };
};
