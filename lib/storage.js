import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Works with Cloudflare R2, AWS S3, Backblaze B2, or any S3-compatible bucket.
// Set these in your environment variables (see .env.example).
const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT, // e.g. https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

export async function uploadBuffer(key, buffer, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

export async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Public files (cover art, preview mp3) are served through a public bucket URL / CDN.
export function publicUrl(key) {
  if (!key) return null;
  const base = process.env.S3_PUBLIC_URL; // e.g. https://pub-xxxx.r2.dev or your custom domain
  return `${base.replace(/\/$/, "")}/${key}`;
}

// Private purchased files get a short-lived signed URL, generated only after payment.
export async function signedDownloadUrl(key, filename, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
