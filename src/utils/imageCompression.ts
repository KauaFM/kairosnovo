/* ═══════════════════════════════════════════════════════════════════════════════
 * IMAGE COMPRESSION UTILITY — Client-Side Preprocessing Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Purpose:  Compress and resize images BEFORE any network transmission.
 *           Prevents bandwidth waste, storage bloat, and API token overconsumption.
 *
 * Strategy: HTML5 Canvas downscale → JPEG re-encode at controlled quality.
 *           - Max dimension: 512px (configurable)
 *           - JPEG quality: 0.70 (configurable)
 *           - Output: Base64 data URI string
 *
 * Performance budget:
 *   Input  4032x3024 JPEG (4.2MB typical phone camera)
 *   Output 512x384   JPEG (~35-60KB at q=0.70)
 *   Ratio  ~98% size reduction
 *   Time   <200ms on mid-range devices
 *
 * ═══════════════════════════════════════════════════════════════════════════════ */

export interface CompressionConfig {
  maxDimension: number;   // Max width OR height in pixels
  quality: number;        // JPEG quality 0.0–1.0
  outputFormat: string;   // MIME type for canvas.toDataURL
}

export interface CompressionResult {
  base64: string;         // Full data URI (data:image/jpeg;base64,...)
  base64Raw: string;      // Raw base64 without prefix (for API payloads)
  blob: Blob;             // Compressed blob (for storage upload)
  width: number;          // Final pixel width
  height: number;         // Final pixel height
  originalSize: number;   // Input file size in bytes
  compressedSize: number; // Output blob size in bytes
  ratio: number;          // Compression ratio (0.0–1.0, lower = more compressed)
  mimeType: string;       // Output MIME type
}

const DEFAULT_CONFIG: CompressionConfig = {
  maxDimension: 512,
  quality: 0.70,
  outputFormat: 'image/jpeg',
};

/**
 * Loads a File/Blob into an HTMLImageElement.
 * Rejects on decode failure, timeout, or corrupt file.
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    // Safety timeout: 15 seconds max for image decode
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('IMAGE_LOAD_TIMEOUT: Decode exceeded 15s limit'));
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);

      // Validate decoded dimensions (corrupt images may report 0x0)
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error('IMAGE_CORRUPT: Decoded dimensions are 0x0'));
        return;
      }

      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('IMAGE_DECODE_FAILED: Browser could not decode the file'));
    };

    img.src = objectUrl;
  });
}

/**
 * Calculates the scaled dimensions maintaining aspect ratio.
 * Neither width nor height will exceed maxDimension.
 */
function calcScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDim: number
): { width: number; height: number } {
  // If already within bounds, no scaling needed
  if (srcWidth <= maxDim && srcHeight <= maxDim) {
    return { width: srcWidth, height: srcHeight };
  }

  const aspectRatio = srcWidth / srcHeight;

  if (srcWidth >= srcHeight) {
    // Landscape or square
    return {
      width: maxDim,
      height: Math.round(maxDim / aspectRatio),
    };
  }

  // Portrait
  return {
    width: Math.round(maxDim * aspectRatio),
    height: maxDim,
  };
}

/**
 * Converts a canvas to a Blob asynchronously.
 * Falls back to synchronous toDataURL if toBlob is unsupported.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('CANVAS_BLOB_FAILED: toBlob returned null'));
          }
        },
        mimeType,
        quality
      );
    } else {
      // Fallback for older browsers
      try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const byteString = atob(dataUrl.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        resolve(new Blob([ab], { type: mimeType }));
      } catch (err) {
        reject(new Error(`CANVAS_EXPORT_FAILED: ${(err as Error).message}`));
      }
    }
  });
}

/**
 * MAIN ENTRY POINT
 *
 * Compresses an image File to a constrained JPEG.
 *
 * @param file      - The raw File from <input type="file"> or drag-drop
 * @param config    - Optional overrides for maxDimension, quality, format
 * @returns         - CompressionResult with base64, blob, dimensions, metrics
 *
 * @throws Error    - On invalid input, corrupt image, or canvas failure
 *
 * Usage:
 *   const result = await compressImage(file);
 *   // Send result.base64Raw to Vision API
 *   // Upload result.blob to Supabase Storage
 */
export async function compressImage(
  file: File | Blob,
  config: Partial<CompressionConfig> = {}
): Promise<CompressionResult> {
  const cfg: CompressionConfig = { ...DEFAULT_CONFIG, ...config };

  // ── Input validation ──────────────────────────────────
  if (!file) {
    throw new Error('COMPRESS_INPUT_NULL: No file provided');
  }

  if (file.size === 0) {
    throw new Error('COMPRESS_INPUT_EMPTY: File has 0 bytes');
  }

  // Validate MIME type if available
  const fileType = (file as File).type || '';
  if (fileType && !fileType.startsWith('image/')) {
    throw new Error(`COMPRESS_INVALID_TYPE: Expected image/*, got ${fileType}`);
  }

  // Hard limit: reject files > 50MB (likely not a photo)
  const MAX_INPUT_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`COMPRESS_TOO_LARGE: File exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  const originalSize = file.size;

  // ── Load and decode image ─────────────────────────────
  const img = await loadImage(file);

  // ── Calculate target dimensions ───────────────────────
  const { width, height } = calcScaledDimensions(
    img.naturalWidth,
    img.naturalHeight,
    cfg.maxDimension
  );

  // ── Render to canvas ──────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('CANVAS_CONTEXT_FAILED: Could not acquire 2D context');
  }

  // White background fill (prevents transparent PNG → black JPEG artifact)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Bicubic-quality downscale
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // ── Export compressed JPEG ────────────────────────────
  const mimeType = cfg.outputFormat;
  const blob = await canvasToBlob(canvas, mimeType, cfg.quality);
  const base64 = canvas.toDataURL(mimeType, cfg.quality);
  const base64Raw = base64.split(',')[1] || '';

  // ── Cleanup ───────────────────────────────────────────
  canvas.width = 0;
  canvas.height = 0;

  return {
    base64,
    base64Raw,
    blob,
    width,
    height,
    originalSize,
    compressedSize: blob.size,
    ratio: blob.size / originalSize,
    mimeType,
  };
}

/**
 * Quick helper: compress and return only the raw base64 string.
 * Useful when you only need the payload for an API call.
 */
export async function compressToBase64(
  file: File | Blob,
  maxDimension = 512,
  quality = 0.70
): Promise<string> {
  const result = await compressImage(file, { maxDimension, quality });
  return result.base64Raw;
}

/**
 * Quick helper: compress and return only the Blob.
 * Useful when you only need the file for a storage upload.
 */
export async function compressToBlob(
  file: File | Blob,
  maxDimension = 512,
  quality = 0.70
): Promise<Blob> {
  const result = await compressImage(file, { maxDimension, quality });
  return result.blob;
}
