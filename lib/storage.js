import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Works with Cloudflare R2, AWS S3, Backblaze B2, or any S3-compatible bucket.
// Set these in your environment variables (see .env.example).

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing environment variable: ${name}. Set it in Railway → your app service → Variables, then redeploy.`
    );
  }
  return value.trim();
}

let s3Client = null;
function getClient() {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    region: process.env.S3_REGION?.trim() || "auto",
    endpoint: requireEnv("S3_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  return s3Client;
}

export async function uploadBuffer(key, buffer, contentType) {
  const bucket = requireEnv("S3_BUCKET");
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

export async function deleteObject(key) {
  const bucket = requireEnv("S3_BUCKET");
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// Public files (cover art, preview mp3) are served through a public bucket URL / CDN.
export function publicUrl(key) {
  if (!key) return null;
  const base = process.env.S3_PUBLIC_URL || "";
  return `${base.replace(/\/$/, "")}/${key}`;
}

// Private purchased files get a short-lived signed URL, generated only after payment.
export async function signedDownloadUrl(key, filename, expiresInSeconds = 3600) {
  const bucket = requireEnv("S3_BUCKET");
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}
