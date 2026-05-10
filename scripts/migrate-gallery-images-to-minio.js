const fs = require('node:fs');
const path = require('node:path');
const { PutObjectCommand, S3Client } = require('../backend/node_modules/@aws-sdk/client-s3');
const sqlite3 = require('../backend/node_modules/sqlite3');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const dbPath = path.join(backendDir, 'database.sqlite');
const envPath = path.join(backendDir, '.env.tunnel');
const publicBackendUrl = 'https://phantomdraw-api.jojoz.cn';
const concurrency = Number.parseInt(process.env.CONCURRENCY || '8', 10);

function loadEnv(filePath) {
  const env = {};
  const body = fs.readFileSync(filePath, 'utf8');
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

function createS3Client(env) {
  const endpoint = normalizeEndpoint(env);
  return new S3Client({
    region: env.S3_REGION || 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY || '',
      secretAccessKey: env.S3_SECRET_KEY || '',
    },
  });
}

function normalizeEndpoint(env) {
  const rawEndpoint = (env.S3_ENDPOINT || '127.0.0.1').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(rawEndpoint)) return rawEndpoint;

  const port = env.S3_PORT || '9000';
  const useSsl = env.S3_USE_SSL === 'true';
  return `${useSsl ? 'https' : 'http'}://${rawEndpoint}${port ? `:${port}` : ''}`;
}

function openDb() {
  const db = new sqlite3.Database(dbPath);
  return {
    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
      });
    },
    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(error) {
          if (error) {
            reject(error);
            return;
          }
          resolve(this);
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        db.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

function extensionFromUrl(imageUrl) {
  try {
    const extension = path.extname(new URL(imageUrl).pathname).replace('.', '').toLowerCase();
    if (extension === 'jpeg') return 'jpg';
    if (['png', 'jpg', 'webp', 'gif'].includes(extension)) return extension;
  } catch {}
  return null;
}

function detectMimeType(buffer, imageUrl, contentType) {
  const normalizedContentType = contentType?.split(';')[0]?.trim().toLowerCase();
  if (normalizedContentType?.startsWith('image/')) {
    return normalizedContentType;
  }

  if (buffer.length >= 12) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }
    if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
      return 'image/webp';
    }
    if (buffer.slice(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  }

  const extension = extensionFromUrl(imageUrl);
  if (extension === 'jpg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return null;
}

function extensionFromMimeType(mimeType, imageUrl) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return extensionFromUrl(imageUrl) || 'jpg';
}

async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    throw new Error(`download failed with HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = detectMimeType(buffer, imageUrl, response.headers.get('content-type'));
  if (!mimeType) {
    throw new Error(`downloaded response is not an image: ${response.headers.get('content-type') || 'unknown'}`);
  }

  return { buffer, mimeType, extension: extensionFromMimeType(mimeType, imageUrl) };
}

function createBackup() {
  const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const backupPath = path.join(backendDir, `database.sqlite.backup-gallery-minio-${stamp}`);
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

async function migrateItem({ db, s3, bucket, item }) {
  const { buffer, mimeType, extension } = await downloadImage(item.imageUrl);
  const filename = `${item.id}.${extension}`;
  const key = `gallery/${filename}`;
  const nextImageUrl = `${publicBackendUrl}/api/gallery/assets/${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentLength: buffer.length,
      ContentType: mimeType,
    }),
  );

  await db.run(
    'UPDATE gallery_item SET imageUrl = ?, updatedAt = datetime(\'now\') WHERE id = ?',
    [nextImageUrl, item.id],
  );

  return { id: item.id, key, imageUrl: nextImageUrl, bytes: buffer.length };
}

async function runPool(items, worker) {
  let index = 0;
  let completed = 0;
  const successes = [];
  const failures = [];

  async function next() {
    while (index < items.length) {
      const item = items[index++];
      try {
        const result = await worker(item);
        successes.push(result);
      } catch (error) {
        failures.push({
          id: item.id,
          imageUrl: item.imageUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        completed += 1;
        if (completed % 25 === 0 || completed === items.length) {
          console.log(`progress ${completed}/${items.length} success=${successes.length} failed=${failures.length}`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return { successes, failures };
}

async function main() {
  const env = loadEnv(envPath);
  const bucket = env.S3_BUCKET || 'phantomdraw';
  const db = openDb();
  const s3 = createS3Client(env);
  const backupPath = createBackup();

  try {
    const items = await db.all(
      `SELECT id, imageUrl
       FROM gallery_item
       WHERE imageUrl IS NOT NULL
         AND imageUrl != ''
         AND imageUrl NOT LIKE ?
       ORDER BY createdAt DESC`,
      [`${publicBackendUrl}/api/gallery/assets/%`],
    );

    console.log(`backup=${backupPath}`);
    console.log(`itemsToMigrate=${items.length}`);

    const { successes, failures } = await runPool(items, (item) =>
      migrateItem({ db, s3, bucket, item }),
    );

    console.log(`done success=${successes.length} failed=${failures.length}`);
    if (failures.length > 0) {
      console.log(JSON.stringify({ failures }, null, 2));
      process.exitCode = 1;
    }
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
