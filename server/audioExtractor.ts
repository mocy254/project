import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Download audio from YouTube video using yt-dlp
 * Returns path to the downloaded audio file (mp3 format)
 */
export async function downloadYouTubeAudio(videoId: string): Promise<string> {
  const tempDir = tmpdir();
  const audioFileName = `youtube-audio-${videoId}-${randomUUID()}.mp3`;
  const audioPath = join(tempDir, audioFileName);

  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '-x', // Extract audio
      '--audio-format', 'mp3',
      '--audio-quality', '5', // Good quality but not huge file
      '-o', audioPath,
      `https://www.youtube.com/watch?v=${videoId}`
    ]);

    let errorOutput = '';
    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        resolve(audioPath);
      } else {
        reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
      }
    });

    ytdlp.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Transcribe audio file using OpenAI Whisper API
 * Returns the transcribed text
 */
export async function transcribeAudioWithWhisper(audioPath: string): Promise<string> {
  try {
    const audioReadStream = createReadStream(audioPath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: 'whisper-1',
      response_format: 'text'
    });

    return transcription;
  } catch (error: any) {
    console.error('Whisper transcription error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message || error}`);
  }
}

/**
 * Download YouTube audio and transcribe it using Whisper
 * Cleans up the temporary audio file after transcription
 */
export async function transcribeYouTubeVideo(videoId: string): Promise<string> {
  let audioPath: string | null = null;

  try {
    console.log(`Downloading audio for video ${videoId}...`);
    audioPath = await downloadYouTubeAudio(videoId);
    
    console.log(`Audio downloaded to ${audioPath}, transcribing with Whisper...`);
    const transcript = await transcribeAudioWithWhisper(audioPath);
    
    console.log(`Transcription complete, ${transcript.length} characters`);
    return transcript;
  } finally {
    // Clean up temp audio file
    if (audioPath) {
      try {
        await unlink(audioPath);
        console.log(`Cleaned up temp audio file: ${audioPath}`);
      } catch (cleanupError) {
        console.error(`Failed to cleanup audio file ${audioPath}:`, cleanupError);
      }
    }
  }
}
