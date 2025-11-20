// backend/services/storage/StorageService.ts
import { supabaseServer as supabase } from "@database/server.connection";

export class StorageService {
  /**
   * Checks if a file exists in Supabase storage
   */
  async fileExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch (error) {
      console.error("Error checking if file exists:", error);
      return false;
    }
  }

  /**
   * Uploads a file to Supabase storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options: { upsert?: boolean } = {}
  ): Promise<string> {
    try {
      const { error, data } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: options.upsert ?? false });

      if (error) throw error;

      const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
      return fileUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  /**
   * Updates a file in Supabase storage
   */
  async updateFile(bucket: string, path: string, file: File): Promise<string> {
    try {
      const { error } = await supabase.storage.from(bucket).update(path, file, { upsert: true });

      if (error) throw error;

      const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
      return fileUrl;
    } catch (error) {
      console.error("Error updating file:", error);
      throw error;
    }
  }

  /**
   * Deletes a file from Supabase storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  /**
   * Lists files in a bucket/folder
   */
  async listFiles(
    bucket: string,
    folderPath: string,
    options: { limit?: number; offset?: number; sortBy?: any } = {}
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage.from(bucket).list(folderPath, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: options.sortBy || { column: "name", order: "asc" },
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  }

  /**
   * Copies a file within the same bucket
   */
  async copyFile(bucket: string, sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from(bucket).copy(sourcePath, destinationPath);

      if (error) throw error;
    } catch (error) {
      console.error("Error copying file:", error);
      throw error;
    }
  }

  /**
   * Gets a public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  }

  /**
   * Gets a time-limited signed URL for private files
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 60): Promise<string> {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw error;
    }
  }
}

export default new StorageService();
