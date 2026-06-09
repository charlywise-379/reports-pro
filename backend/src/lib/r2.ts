import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'fs'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

// Regenerar URL firmada para un PDF ya subido (on-demand, expira en 7 dias)
export async function getSignedDownloadUrl(r2Key: string): Promise<string> {
  const key = r2Key.startsWith('reports/') ? r2Key : `reports/${r2Key}`
  const signedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'reports-pro-pdfs',
      Key: key,
    }),
    { expiresIn: 60 * 60 * 24 * 30 } // 30 dias
  )
  return signedUrl
}

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

  // Generar signed URL válida por 7 días
  const signedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || 'reports-pro-pdfs',
      Key: key,
    }),
    { expiresIn: 60 * 60 * 24 * 30 } // 30 días
  )

  return signedUrl
}