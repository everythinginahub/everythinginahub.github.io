export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_IMAGE_SIDE = 10_000;
export const MAX_OUTPUT_SIDE = 6_000;
const INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const OUTPUT_FORMATS = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
});

export function fitImageDimensions(width, height, maxWidth, maxHeight) {
  const sourceWidth = Number(width);
  const sourceHeight = Number(height);
  const boundWidth = Number(maxWidth);
  const boundHeight = Number(maxHeight);
  if (![sourceWidth, sourceHeight, boundWidth, boundHeight].every(Number.isSafeInteger)
      || sourceWidth < 1 || sourceHeight < 1
      || sourceWidth > MAX_IMAGE_SIDE || sourceHeight > MAX_IMAGE_SIDE
      || sourceWidth * sourceHeight > MAX_IMAGE_PIXELS) {
    throw new Error('Choose an image with valid dimensions below 24 megapixels and 10,000 pixels per side.');
  }
  if (boundWidth < 1 || boundHeight < 1 || boundWidth > MAX_OUTPUT_SIDE || boundHeight > MAX_OUTPUT_SIDE) {
    throw new Error(`Enter a maximum width and height from 1 to ${MAX_OUTPUT_SIDE} pixels.`);
  }
  const scale = Math.min(1, boundWidth / sourceWidth, boundHeight / sourceHeight);
  return {
    width: Math.max(1, Math.floor(sourceWidth * scale)),
    height: Math.max(1, Math.floor(sourceHeight * scale))
  };
}

export function validateImageFile(file) {
  if (!file || typeof file.type !== 'string' || !INPUT_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Choose a JPG, PNG or WebP image.');
  }
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Choose an image smaller than 12 MB.');
  }
  return file;
}

export function imageDownloadName(name, format) {
  const extension = OUTPUT_FORMATS[format];
  if (!extension) throw new Error('Choose PNG, JPEG or WebP output.');
  const base = String(name || 'image')
    .replace(/\.[^/.]*$/, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image';
  return `${base}-resized.${extension}`;
}

async function decodeImage(file, win) {
  if (typeof win.createImageBitmap === 'function') {
    const bitmap = await win.createImageBitmap(file);
    return { source: bitmap, dispose: () => bitmap.close?.() };
  }
  if (typeof win.Image !== 'function' || typeof win.URL?.createObjectURL !== 'function') {
    throw new Error('Image decoding is not supported in this browser.');
  }
  const sourceUrl = win.URL.createObjectURL(file);
  const image = new win.Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('The selected file could not be opened as an image.'));
      image.src = sourceUrl;
    });
    return { source: image, dispose: () => win.URL.revokeObjectURL(sourceUrl) };
  } catch (error) {
    win.URL.revokeObjectURL(sourceUrl);
    throw error;
  }
}

function canvasToBlob(canvas, format, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The browser could not create an image. Try PNG or a smaller size.')), format, quality);
    } catch {
      reject(new Error('The browser could not create that image format. Try PNG or JPEG.'));
    }
  });
}

export function mountImageResizer({ root, win = window } = {}) {
  const form = root.querySelector('#imageResizerForm');
  const fileInput = root.querySelector('#imageFile');
  const qualityInput = root.querySelector('#imageQuality');
  const formatInput = root.querySelector('#imageFormat');
  const submitButton = root.querySelector('#resizeImageButton');
  const status = root.querySelector('#imageResizerStatus');
  const preview = root.querySelector('#imageResizerPreview');
  const previewFrame = root.querySelector('#imageResizerPreviewFrame');
  const download = root.querySelector('#imageResizerDownload');
  let alive = true;
  let requestId = 0;
  let outputUrl = '';

  function clearOutput() {
    if (outputUrl) win.URL.revokeObjectURL(outputUrl);
    outputUrl = '';
    preview.removeAttribute('src');
    previewFrame.hidden = true;
    download.removeAttribute('href');
    download.hidden = true;
  }

  function qualityAvailability() {
    qualityInput.disabled = formatInput.value === 'image/png';
  }

  async function submit(event) {
    if (event.target !== form) return;
    event.preventDefault();
    const currentRequest = ++requestId;
    clearOutput();
    status.textContent = 'Preparing the image in this browser…';
    submitButton.disabled = true;
    let decoded;
    let canvas;
    try {
      const file = validateImageFile(fileInput.files?.[0]);
      const maxWidth = root.querySelector('#imageMaxWidth').value;
      const maxHeight = root.querySelector('#imageMaxHeight').value;
      const format = formatInput.value;
      if (!Object.hasOwn(OUTPUT_FORMATS, format)) throw new Error('Choose PNG, JPEG or WebP output.');
      const quality = Number(qualityInput.value);
      if (format !== 'image/png' && (!Number.isFinite(quality) || quality < 0.45 || quality > 1)) {
        throw new Error('Choose a quality from 45% to 100%.');
      }
      decoded = await decodeImage(file, win);
      if (!alive || currentRequest !== requestId) return;
      const dimensions = fitImageDimensions(decoded.source.width, decoded.source.height, maxWidth, maxHeight);
      canvas = win.document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas editing is not supported in this browser.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      if (format === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, dimensions.width, dimensions.height);
      }
      context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);
      const blob = await canvasToBlob(canvas, format, quality);
      if (!alive || currentRequest !== requestId) return;
      if (blob.type.toLowerCase() !== format) {
        throw new Error(`This browser could not create ${OUTPUT_FORMATS[format].toUpperCase()} images. Choose a different format.`);
      }
      outputUrl = win.URL.createObjectURL(blob);
      preview.src = outputUrl;
      previewFrame.hidden = false;
      download.href = outputUrl;
      download.download = imageDownloadName(file.name, format);
      download.hidden = false;
      const sizeLabel = `${(blob.size / 1024).toLocaleString('en-GB', { maximumFractionDigits: 1 })} KB`;
      status.textContent = `Ready: ${dimensions.width} × ${dimensions.height} pixels · ${sizeLabel}. Download the copy and check it before replacing your original.`;
    } catch (error) {
      if (alive && currentRequest === requestId) status.textContent = error.message || 'The image could not be resized. Try another file.';
    } finally {
      decoded?.dispose();
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      if (alive && currentRequest === requestId) submitButton.disabled = false;
    }
  }

  root.addEventListener('submit', submit);
  formatInput.addEventListener('change', qualityAvailability);
  qualityAvailability();
  return {
    destroy() {
      alive = false;
      requestId += 1;
      clearOutput();
      root.removeEventListener('submit', submit);
      formatInput.removeEventListener('change', qualityAvailability);
    }
  };
}
