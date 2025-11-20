import useUploadStore from "@Stores/upload/upload.store";
import { supabase } from "@database/client.connection";
import * as tus from "tus-js-client";

const findTitleStatusContainer = (): HTMLElement | null => {
  const elementWithShadowRoot = document.querySelector("#cesdkContainer #root-shadow ");
  const shadowRoot = elementWithShadowRoot?.shadowRoot;

  if (shadowRoot) {
    const titleStatus = shadowRoot.querySelector(".title-status") as HTMLElement;
    return titleStatus;
  }

  return document.querySelector("[data-title-status]") as HTMLElement;
};

const isSlowNetwork = (): boolean => {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (connection) {
    const isLowBandwidth = connection.downlink < 1.5;
    const isSlowEffectiveType = ["slow-2g", "2g"].includes(connection.effectiveType);
    const isCellularOnly = connection.effectiveType === "3g" && connection.downlink < 2;

    return isLowBandwidth || isSlowEffectiveType || isCellularOnly;
  }

  return false;
};

const getOptimalChunkSize = (fileSize: number, isSlow: boolean): number => {
  if (isSlow) {
    // Slow network: use smaller chunks for reliability
    // Files < 10MB: use 2MB chunks
    if (fileSize < 10 * 1024 * 1024) {
      return 2 * 1024 * 1024;
    }
    // Files 10-50MB: use 5MB chunks
    if (fileSize < 50 * 1024 * 1024) {
      return 5 * 1024 * 1024;
    }
    // Files 50-200MB: use 8MB chunks
    if (fileSize < 200 * 1024 * 1024) {
      return 8 * 1024 * 1024;
    }
    // Files > 200MB: use 10MB chunks (max for slow networks)
    return 10 * 1024 * 1024;
  }

  // Fast network: use larger chunks for performance
  // Files < 10MB: use 5MB chunks for better progress tracking
  if (fileSize < 10 * 1024 * 1024) {
    return 5 * 1024 * 1024;
  }
  // Files 10-50MB: use 10MB chunks (balanced)
  if (fileSize < 50 * 1024 * 1024) {
    return 10 * 1024 * 1024;
  }
  // Files 50-200MB: use 20MB chunks (fewer requests)
  if (fileSize < 200 * 1024 * 1024) {
    return 20 * 1024 * 1024;
  }
  // Files > 200MB: use 30MB chunks (maximum efficiency for large files)
  return 30 * 1024 * 1024;
};

export const uploadFile = async (
  bucketName: string,
  fileName: string,
  file: any,
  maxRetries = 3
) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("No active session found");
  }

  const uploadId = `${bucketName}-${fileName}-${Date.now()}`;

  const { startUpload, updateProgress, completeUpload, setError } = useUploadStore.getState();

  startUpload(uploadId);

  const titleStatus = findTitleStatusContainer();
  if (titleStatus) {
    titleStatus.setAttribute("data-active-upload-id", uploadId);
  }

  const fileSize = file.size || 0;
  const slowNetwork = isSlowNetwork();
  const chunkSize = getOptimalChunkSize(fileSize, slowNetwork);

  const progressUpdateThreshold =
    fileSize > 0 ? Math.max(1, Math.floor(((500 * 1024) / fileSize) * 100)) : 1;

  const executeUpload = () =>
    new Promise<void>((resolve, reject) => {
      let lastProgressUpdate = 0;

      const upload = new tus.Upload(file, {
        endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
        retryDelays: [0, 500, 1000, 2000, 5000, 10000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: bucketName,
          objectName: fileName,
          contentType: file.type || "application/octet-stream",
          cacheControl: "3600",
        },
        chunkSize: chunkSize,
        onError: (error) => {
          console.error("Upload failed:", error);
          setError(uploadId, error);

          if (titleStatus) {
            titleStatus.setAttribute("data-upload-status", "error");
          }

          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);

          if (percentage === 100 || percentage - lastProgressUpdate >= progressUpdateThreshold) {
            updateProgress(uploadId, percentage);
            lastProgressUpdate = percentage;

            if (percentage === 100 && titleStatus) {
              titleStatus.setAttribute("data-upload-status", "finalizing");
            }
          }
        },
        onSuccess: () => {
          completeUpload(uploadId);

          if (titleStatus) {
            titleStatus.setAttribute("data-upload-status", "success");
          }

          resolve();
        },
      });

      upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }

          upload.start();
        })
        .catch((error) => {
          console.error("Error finding previous uploads:", error);
          setError(uploadId, error);
          reject(error);
        });
    });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await executeUpload();

      return {
        success: true,
        uploadId,
      };
    } catch (error: any) {
      const isConflict =
        error.status === 409 || error.message?.includes("Request aborted due to lock acquired");

      if (isConflict && attempt < maxRetries - 1) {
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.log(
          `Upload conflict detected, retrying in ${backoffTime}ms (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        continue;
      }

      throw error;
    }
  }
};
