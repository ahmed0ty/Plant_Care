import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

export interface StorageConfig {
  cloudName: string;
  /** أي رابط صورة مقبول في النظام لازم يبدأ بالبادئة دي */
  urlPrefix: string;
}

function setup(): StorageConfig | null {
  if (!env.CLOUDINARY_URL) return null;
  const url = new URL(env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: url.hostname,
    api_key: decodeURIComponent(url.username),
    api_secret: decodeURIComponent(url.password),
    secure: true,
  });
  return {
    cloudName: url.hostname,
    urlPrefix: `https://res.cloudinary.com/${url.hostname}/`,
  };
}

export const storageConfig = setup();
export { cloudinary };