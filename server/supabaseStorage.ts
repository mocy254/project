import { supabase } from './supabaseAuth';
import { randomUUID } from 'crypto';

const STORAGE_BUCKET = 'flashgenius-uploads';

export class SupabaseStorageService {
  constructor() {}

  /**
   * Validate that the storage bucket exists and is properly configured
   * @returns True if bucket is ready, throws error otherwise
   */
  async validateBucket(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);
      
      if (error) {
        throw new Error(
          `Supabase Storage bucket '${STORAGE_BUCKET}' not found. ` +
          `Please create it in your Supabase dashboard: https://supabase.com/dashboard/project/_/storage/buckets`
        );
      }

      if (!data.public) {
        console.warn(
          `Warning: Bucket '${STORAGE_BUCKET}' is not public. ` +
          `Image URLs may not be accessible. Consider making the bucket public in Supabase dashboard.`
        );
      }

      return true;
    } catch (error) {
      console.error('Supabase Storage bucket validation failed:', error);
      throw error;
    }
  }

  /**
   * Upload a file buffer to Supabase Storage
   * @param filePath - Local file path to upload
   * @param userId - User ID for organizing files
   * @param fileName - Name for the stored file
   * @returns The public URL for the uploaded file
   */
  async uploadFile(
    fileBuffer: Buffer,
    userId: string,
    fileName: string,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    try {
      // Generate unique file path: userId/uploads/uuid-filename
      const fileId = randomUUID();
      const filePath = `${userId}/uploads/${fileId}-${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
      }

      // Return the public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Supabase Storage upload error:', error);
      throw error;
    }
  }

  /**
   * Upload an image buffer to Supabase Storage
   * @param imageBuffer - Image buffer to upload
   * @param userId - User ID for organizing files
   * @param imageName - Name for the stored image
   * @returns The public URL for the uploaded image
   */
  async uploadImageBuffer(
    imageBuffer: Buffer,
    userId: string,
    imageName: string = 'image.png'
  ): Promise<string> {
    try {
      const imageId = randomUUID();
      const imagePath = `${userId}/images/${imageId}-${imageName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(imagePath, imageBuffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (error) {
        throw new Error(`Failed to upload image to Supabase Storage: ${error.message}`);
      }

      // Get public URL for the image
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Supabase Storage image upload error:', error);
      throw error;
    }
  }

  /**
   * Get a signed URL for downloading a private file
   * @param filePath - Storage path of the file
   * @param expiresIn - Expiration time in seconds (default 1 hour)
   * @returns Signed URL for downloading the file
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Get public URL for a file
   * @param filePath - Storage path of the file
   * @returns Public URL for the file
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Delete a file from Supabase Storage
   * @param filePath - Storage path of the file to delete
   */
  async deleteFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}
