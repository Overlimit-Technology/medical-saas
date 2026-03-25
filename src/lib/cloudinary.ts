import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

let configured = false;

function ensureCloudinaryConfig() {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary no esta configurado. Completa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  configured = true;
}

export function generateChatUploadSignature() {
  ensureCloudinaryConfig();

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "medigest/chat-attachments";

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    folder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
  };
}

export async function uploadProfileImage(fileBuffer: Buffer, userId: string) {
  ensureCloudinaryConfig();

  const dataUri = `data:image/png;base64,${fileBuffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "medigest/profiles",
    public_id: `profile-${userId}-${Date.now()}`,
    overwrite: true,
    resource_type: "image",
  });

  return result.secure_url;
}
