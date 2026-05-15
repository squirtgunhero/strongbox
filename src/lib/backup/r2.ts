import "server-only";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 client wrapper. R2 is S3-compatible — we use the AWS SDK
 * with region "auto" and the R2 endpoint. Subdomain-style addressing works
 * out of the box, so no forcePathStyle override.
 */

let cached: S3Client | null = null;

export function getR2Client(): S3Client {
  if (cached) return cached;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 env vars not set (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)"
    );
  }
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cached;
}

function getBucket(): string {
  const b = process.env.R2_BUCKET;
  if (!b) throw new Error("R2_BUCKET env var not set");
  return b;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string
): Promise<void> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function listR2Objects(
  prefix: string
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const client = getR2Client();
  const bucket = getBucket();
  const results: { key: string; size: number; lastModified: Date }[] = [];
  let continuationToken: string | undefined = undefined;
  do {
    const resp: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of resp.Contents || []) {
      if (!obj.Key) continue;
      results.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(0),
      });
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);
  return results;
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const client = getR2Client();
  const resp = await client.send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key })
  );
  const body = resp.Body;
  if (!body) throw new Error(`No body returned for key ${key}`);
  // Body is a Readable in node
  const chunks: Buffer[] = [];
  // @ts-expect-error — Node Readable iterable
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
  );
}

export async function headR2Object(
  key: string
): Promise<{ size: number; lastModified: Date } | null> {
  const client = getR2Client();
  try {
    const resp = await client.send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key })
    );
    return {
      size: resp.ContentLength ?? 0,
      lastModified: resp.LastModified ?? new Date(0),
    };
  } catch (err: unknown) {
    const e = err as { $metadata?: { httpStatusCode?: number }; name?: string };
    if (e?.$metadata?.httpStatusCode === 404 || e?.name === "NotFound") {
      return null;
    }
    throw err;
  }
}
