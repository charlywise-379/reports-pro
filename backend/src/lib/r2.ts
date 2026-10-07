import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'fs'
import { getSecret, secretsVersion } from './config'

let cachedR2: { v: number; accountId: string; keyId: string; secret: string; client: S3Client } | null = null
function getR2(): S3Client {
  const accountId = getSecret('CLOUDFLARE_ACCOUNT_ID') || ''
  const keyId = getSecret('R2_ACCESS_KEY_ID') || ''
  const secret = getSecret('R2_SECRET_ACCESS_KEY') || ''
  const v = secretsVersion()
  if (!cachedR2 || cachedR2.v !== v || cachedR2.accountId !== accountId || cachedR2.keyId !== keyId || cachedR2.secret !== secret) {
    cachedR2 = {
      v, accountId, keyId, secret,
      client: new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: keyId, secretAccessKey: secret },
      }),
    }
  }
  return cachedR2.client
}

const bucketName = () => getSecret('R2_BUCKET_NAME') || 'reports-pro-pdfs'

// Regenerar URL firmada para un PDF ya subido (on-demand, expira en 7 dias)
export async function getSignedDownloadUrl(r2Key: string): Promise<string> {
  const key = r2Key.startsWith('reports/') ? r2Key : `reports/${r2Key}`
  const signedUrl = await getSignedUrl(
    getR2(),
    new GetObjectCommand({
      Bucket: bucketName(),
      Key: key,
    }),
    { expiresIn: 60 * 60 * 24 * 7 } // 7 dias
  )
  return signedUrl
}

export async function uploadPDFToR2(localPath: string, filename: string): Promise<string> {
  const fileBuffer = fs.readFileSync(localPath)
  const key = `reports/${filename}`

  await getR2().send(new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    Body: fileBuffer,
    ContentType: 'application/pdf',
  }))

  console.log(`☁️ PDF subido a R2: ${key}`)

  // Generar signed URL válida por 7 días
  const signedUrl = await getSignedUrl(
    getR2(),
    new GetObjectCommand({
      Bucket: bucketName(),
      Key: key,
    }),
    { expiresIn: 60 * 60 * 24 * 7 } // 7 días
  )

  return signedUrl
}

export async function deleteFromR2(r2Key: string): Promise<void> {
  const key = r2Key.startsWith('reports/') ? r2Key : `reports/${r2Key}`
  await getR2().send(new DeleteObjectCommand({
    Bucket: bucketName(),
    Key: key,
  }))
}
