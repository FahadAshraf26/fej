import { v4 as uuidv4 } from "uuid";
import { supabase } from "@database/client.connection";

export class UploadService {
  private static instance: UploadService;

  private constructor() {}

  public static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  async uploadFile(file: File): Promise<{ publicUrl: string; fileType: string }> {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const fileType = file.type;

      const { data, error } = await supabase.storage.from("imported-menus").upload(fileName, file);

      if (error) {
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("imported-menus").getPublicUrl(fileName);

      return { publicUrl, fileType };
    } catch (error) {
      throw error;
    }
  }

  static async uploadImage(file: File): Promise<string> {
    try {
      const instance = UploadService.getInstance();
      const { publicUrl } = await instance.uploadFile(file);
      return publicUrl;
    } catch (error) {
      throw error;
    }
  }

  static async extractTextFromDocument(url: string, fileType: string): Promise<string> {
    try {
      // For now, we'll just return the URL as text
      // In a real implementation, you would use a document processing service
      // like Tesseract for PDFs or other OCR services
      return url;
    } catch (error) {
      throw error;
    }
  }
}
