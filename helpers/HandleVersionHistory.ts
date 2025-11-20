import { supabase } from "@database/client.connection";
import * as tus from "tus-js-client";
import { v4 as uuid } from "uuid";

export const uploadRevisionFile = async (bucketName: string, fileName: string, file: any) => {
  const newFileName = uuid();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return new Promise<string>((resolve, reject) => {
    var upload = new tus.Upload(file, {
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session!.access_token}`,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
      metadata: {
        bucketName: bucketName,
        objectName: newFileName,
        contentType: "text/plain",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
      onError: async function (error) {
        // await moveRevisionFile(bucketName, newFileName, fileName);
        reject(error);
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        var percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
      },
      onSuccess: function () {
        removeRevisionFile(bucketName, fileName);
        resolve(newFileName);
      },
    });

    // Check if there are any previous uploads to continue.
    return upload.findPreviousUploads().then(function (previousUploads) {
      // Found previous uploads so we select the first one.
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      // Start the upload
      upload.start();
    });
  });
};

const removeRevisionFile = async (bucketName: string, fileName: string) => {
  const { error: deleteError } = await supabase.storage.from(bucketName).remove([fileName]);

  if (deleteError && deleteError.message !== "Object not found") {
    console.warn("Error deleting existing file:", deleteError);
  }
};
