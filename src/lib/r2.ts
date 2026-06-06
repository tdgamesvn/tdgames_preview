// src/lib/r2.ts
import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// R2 is S3-compatible; endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function getPresignedPutUrl(key: string, contentType: string): Promise<string> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}

export async function getPresignedGetUrl(key: string): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}

export interface R2Object {
  body: ReadableStream | null
  contentType: string | undefined
  contentLength: number | undefined
}

/**
 * Fetch an object's stream from R2 for server-side proxying. Used by the Spine
 * proxy route so the runtime can resolve the texture (.png) relative to the
 * atlas URL without presigned query strings breaking the relative path.
 */
export async function getR2Object(key: string): Promise<R2Object> {
  const client = getR2Client()
  const res = await client.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
  return {
    body: (res.Body as unknown as ReadableStream) ?? null,
    contentType: res.ContentType,
    contentLength: res.ContentLength,
  }
}

export async function deleteR2Object(key: string): Promise<void> {
  const client = getR2Client()
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
}
