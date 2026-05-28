const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

function getPrivateKey(): string {
  return import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY || '';
}

function getPublicKey(): string {
  return import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || '';
}

export function getUrlEndpoint(): string {
  return import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || '';
}

export async function uploadImage(
  file: File,
  fileName: string,
  folder: string = '/products'
): Promise<{ url: string; fileId: string }> {
  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error('ImageKit private key is not configured. Check VITE_IMAGEKIT_PRIVATE_KEY in .env');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', fileName);
  formData.append('folder', folder);
  formData.append('useUniqueFileName', 'true');
  formData.append('publicKey', getPublicKey());

  const response = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(privateKey + ':')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed with status ${response.status}`;
    try {
      const error = await response.json();
      message = error?.message || error?.help || message;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();
  return { url: data.url, fileId: data.fileId };
}
