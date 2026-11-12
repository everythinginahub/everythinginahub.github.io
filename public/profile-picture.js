export const PROFILE_PICTURE_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const PROFILE_PICTURE_MAX_DATA_URL_LENGTH = 70_000;
const jpegPrefix = 'data:image/jpeg;base64,';
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Progress can be imported from the browser or cloud, so only accept the small,
// re-encoded JPEG data URLs produced by prepareProfilePicture.
export function normalizeProfilePicture(value) {
  if (typeof value !== 'string' || value.length > PROFILE_PICTURE_MAX_DATA_URL_LENGTH || !value.startsWith(jpegPrefix)) return '';
  const encoded = value.slice(jpegPrefix.length);
  if (encoded.length < 12 || encoded.length % 4 !== 0 || !/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(encoded)) return '';
  return value;
}

export async function prepareProfilePicture(file, win = globalThis.window) {
  if (!file || !imageTypes.has(file.type)) throw new Error('Choose a JPEG, PNG, WebP or GIF image. SVG files are not supported.');
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > PROFILE_PICTURE_MAX_FILE_BYTES) throw new Error('Choose an image smaller than 5 MB.');
  if (!win?.document || !win.URL) throw new Error('Image editing is not available in this browser.');

  let source, objectUrl = '';
  try {
    if (typeof win.createImageBitmap === 'function') {
      source = await win.createImageBitmap(file);
    } else {
      objectUrl = win.URL.createObjectURL(file);
      const image = new win.Image();
      const loaded = new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('That image could not be opened. Try another file.'));
      });
      image.src = objectUrl;
      if (typeof image.decode === 'function') {
        try { await image.decode(); } catch { await loaded; }
      } else await loaded;
      source = image;
    }

    const width = Number(source.width || source.naturalWidth), height = Number(source.height || source.naturalHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > 12000 || height > 12000 || width * height > 40_000_000) {
      throw new Error('Choose an image with sensible dimensions (up to 40 megapixels).');
    }
    const edge = Math.min(width, height), left = (width - edge) / 2, top = (height - edge) / 2;
    const canvas = win.document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image editing is not available in this browser.');
    context.drawImage(source, left, top, edge, edge, 0, 0, 192, 192);
    for (const quality of [0.76, 0.62, 0.48]) {
      const picture = normalizeProfilePicture(canvas.toDataURL('image/jpeg', quality));
      if (picture) return picture;
    }
    throw new Error('This picture could not be made small enough. Try a different image.');
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('That image could not be processed. Try another file.');
  } finally {
    source?.close?.();
    if (objectUrl) win.URL.revokeObjectURL(objectUrl);
  }
}
