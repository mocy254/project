import { pdf } from "pdf-to-img";
import { SupabaseStorageService } from "./supabaseStorage";
import { Innertube } from "youtubei.js";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

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
  const failedPages: number[] = [];
  let totalPagesProcessed = 0;
  
  try {
    console.log(`📄 Starting PDF image extraction from: ${filePath}`);
    console.log(`  Max images: ${maxImages}`);
    
    const supabaseStorageService = new SupabaseStorageService();
    const document = await pdf(filePath, { scale: 2 });
    
    console.log('✅ PDF document loaded, converting pages to images...');
    
    let pageNumber = 1;
    for await (const imageBuffer of document) {
      totalPagesProcessed++;
      
      if (extractedImages.length >= maxImages) {
        console.log(`⏸️  Reached max images limit (${maxImages}), stopping extraction`);
        break;
      }
      
      try {
        console.log(`  📸 Processing page ${pageNumber}...`);
        
        // Upload image to storage with one retry on failure
        let imageUrl: string | null = null;
        let lastError: any = null;
        
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            imageUrl = await supabaseStorageService.uploadImageBuffer(
              imageBuffer,
              userId,
              `pdf-page-${pageNumber}.png`
            );
            break; // Success, exit retry loop
          } catch (err) {
            lastError = err;
            if (attempt === 0) {
              console.log(`  ⚠️  Upload failed for page ${pageNumber}, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            }
          }
        }
        
        if (!imageUrl) {
          throw lastError || new Error('Upload failed after retries');
        }
        
        console.log(`  ✅ Uploaded page ${pageNumber} to: ${imageUrl}`);
        
        extractedImages.push({
          imageUrl,
          pageNumber
        });
      } catch (uploadError) {
        console.error(`  ❌ Failed to upload image for page ${pageNumber} after retries:`, uploadError);
        failedPages.push(pageNumber);
      }
      
      pageNumber++;
    }
    
    // Report summary
    console.log(`\n=== PDF IMAGE EXTRACTION SUMMARY ===`);
    console.log(`Total pages processed: ${totalPagesProcessed}`);
    console.log(`Successfully extracted: ${extractedImages.length} images`);
    
    if (failedPages.length > 0) {
      console.error(`❌ Failed to extract ${failedPages.length} images from pages: ${failedPages.join(', ')}`);
    }
    
    if (extractedImages.length === 0 && totalPagesProcessed > 0) {
      console.error(`⚠️  WARNING: All image extractions failed! No images available for flashcards.`);
    } else if (extractedImages.length > 0) {
      console.log(`✓ Image extraction completed successfully`);
    }
    
    return extractedImages;
  } catch (error) {
    console.error("❌ CRITICAL ERROR extracting images from PDF:", error);
    console.error("No images will be available for this generation");
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
      const supabaseStorageService = new SupabaseStorageService();
      return await supabaseStorageService.uploadImageBuffer(buffer, userId, `youtube-${videoId}.jpg`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const supabaseStorageService = new SupabaseStorageService();
    return await supabaseStorageService.uploadImageBuffer(buffer, userId, `youtube-${videoId}.jpg`);
  } catch (error) {
    console.error("Error extracting YouTube thumbnail:", error);
    return null;
  }
}

/**
 * Extract frames from YouTube video at regular intervals
 * Returns array of image URLs uploaded to object storage
 */
export async function extractYouTubeFrames(
  videoUrl: string,
  userId: string,
  maxFrames: number = 10,
  intervalSeconds: number = 30
): Promise<string[]> {
  const extractedFrames: string[] = [];
  const videoId = extractYouTubeVideoId(videoUrl);
  
  if (!videoId) {
    console.error("Invalid YouTube URL");
    return [];
  }

  try {
    // Initialize Innertube client
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(videoId);
    
    // Get best video format (preferably with both video and audio)
    const format = info.chooseFormat({ 
      quality: 'medium',
      type: 'video+audio'
    });
    
    // Decipher the stream URL
    format.decipher(youtube.session.player);
    
    const streamUrl = format.url;
    if (!streamUrl) {
      console.error("No stream URL available after deciphering");
      return [];
    }

    // Create temp directory for frames
    const tempDir = join(tmpdir(), `youtube-frames-${videoId}-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      // Calculate frame extraction rate (1 frame every intervalSeconds)
      const fps = `1/${intervalSeconds}`;
      
      // Use ffmpeg to extract frames
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', streamUrl,
          '-vf', `fps=${fps}`,
          '-frames:v', maxFrames.toString(),
          '-q:v', '2', // High quality
          join(tempDir, 'frame-%03d.jpg')
        ]);

        let errorOutput = '';
        ffmpeg.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg exited with code ${code}: ${errorOutput}`));
          }
        });

        ffmpeg.on('error', (err) => {
          reject(err);
        });
      });

      // Upload extracted frames to Supabase Storage
      const supabaseStorageService = new SupabaseStorageService();
      const fs = await import('fs/promises');
      const files = await fs.readdir(tempDir);
      
      for (const file of files.sort()) {
        if (file.endsWith('.jpg')) {
          try {
            const frameBuffer = await fs.readFile(join(tempDir, file));
            const imageUrl = await supabaseStorageService.uploadImageBuffer(
              frameBuffer,
              userId,
              `youtube-${videoId}-${file}`
            );
            extractedFrames.push(imageUrl);
          } catch (uploadError) {
            console.error(`Failed to upload frame ${file}:`, uploadError);
          }
        }
      }

      return extractedFrames;
    } finally {
      // Cleanup temp directory (runs on success or failure)
      try {
        const fs = await import('fs/promises');
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`Failed to cleanup temp directory ${tempDir}:`, cleanupError);
      }
    }
  } catch (error) {
    console.error("Error extracting YouTube frames:", error);
    return [];
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
