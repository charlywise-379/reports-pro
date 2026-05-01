import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

export async function uploadPDFToR2(localPath: string, filename: string): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath)
  const key = `reports/${filename}`

  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'reports-pro-pdfs',
    Key: key,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  }))

  console.log(`☁️ PDF subido a R2: ${key}`)

  // URL pública del archivo
  const publicUrl = `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${key}`
  return publicUrl
}