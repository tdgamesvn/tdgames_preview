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

export async function deleteR2Object(key: string): Promise<void> {
  const client = getR2Client()
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
}
