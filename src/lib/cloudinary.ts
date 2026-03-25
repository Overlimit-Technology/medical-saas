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

export type ChatFileUploadResult = {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadChatFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<ChatFileUploadResult> {
  ensureCloudinaryConfig();

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Tipo de archivo no permitido.");
  }

  if (fileSize > MAX_FILE_SIZE) {
    throw new Error("El archivo excede el limite de 10MB.");
  }

  const isImage = mimeType.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";
  const dataUri = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "medigest/chat-attachments",
    public_id: `chat-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
    overwrite: false,
    resource_type: resourceType,
  });

  return {
    url: result.secure_url,
    fileName,
    fileType: mimeType,
    fileSize,
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
