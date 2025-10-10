import { pdf } from "pdf-to-img";
import { ObjectStorageService } from "./objectStorage";

export interface ExtractedImage {
  imageUrl: string;
  pageNumber: number;
}

/**
 * Extract images from a PDF file by converting each page to an image
 * Uploads images to object storage and returns their URLs
 */
export async function extractImagesFromPDF(
  filePath: string,
  userId: string,
  maxImages: number = 5
): Promise<ExtractedImage[]> {
  const extractedImages: ExtractedImage[] = [];
  
  try {
    const objectStorageService = new ObjectStorageService();
    const document = await pdf(filePath, { scale: 2 });
    
    let pageNumber = 1;
    for await (const imageBuffer of document) {
      if (extractedImages.length >= maxImages) {
        break;
      }
      
      try {
        // Upload image to storage
        const imageUrl = await objectStorageService.uploadImageBuffer(
          imageBuffer,
          userId,
          `pdf-page-${pageNumber}.png`
        );
        
        extractedImages.push({
          imageUrl,
          pageNumber
        });
      } catch (uploadError) {
        console.error(`Failed to upload image for page ${pageNumber}:`, uploadError);
      }
      
      pageNumber++;
    }
    
    return extractedImages;
  } catch (error) {
    console.error("Error extracting images from PDF:", error);
    return [];
  }
}

/**
 * Extract thumbnail from YouTube video
 * Returns the high-quality thumbnail URL
 */
export async function extractYouTubeThumbnail(
  videoUrl: string,
  userId: string
): Promise<string | null> {
  try {
    // Extract video ID from URL
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      return null;
    }
    
    // Get high-quality thumbnail URL from YouTube
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    // Fetch thumbnail
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      // Fallback to standard quality if maxres not available
      const fallbackUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) {
        return null;
      }
      const buffer = Buffer.from(await fallbackResponse.arrayBuffer());
      const objectStorageService = new ObjectStorageService();
      return await objectStorageService.uploadImageBuffer(buffer, userId, `youtube-${videoId}.jpg`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const objectStorageService = new ObjectStorageService();
    return await objectStorageService.uploadImageBuffer(buffer, userId, `youtube-${videoId}.jpg`);
  } catch (error) {
    console.error("Error extracting YouTube thumbnail:", error);
    return null;
  }
}

/**
 * Extract video ID from YouTube URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}
