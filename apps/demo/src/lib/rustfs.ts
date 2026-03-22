import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseDashboard, type DashboardSpec } from '@dash-spec/core';

const dashboardBucket = process.env.RUSTFS_BUCKET ?? 'dashspec';
const dashboardPrefix = process.env.RUSTFS_DASHBOARD_PREFIX ?? 'dashboards/';
const defaultDashboardKey = process.env.RUSTFS_DASHBOARD_KEY ?? `${dashboardPrefix}test.yaml`;
const rustfsEndpoint = process.env.RUSTFS_ENDPOINT ?? 'http://127.0.0.1:9000';
const rustfsAccessKey = process.env.RUSTFS_ACCESS_KEY ?? 'minioadmin';
const rustfsSecretKey = process.env.RUSTFS_SECRET_KEY ?? 'minioadmin';
const shouldBootstrap = process.env.DASHSPEC_BOOTSTRAP_RUSTFS !== 'false';

let client: S3Client | undefined;

export type DashboardListing = {
  key: string;
  name: string;
  title: string;
  description?: string;
  source: string;
};

function getClient(): S3Client {
  client ??= new S3Client({
    region: 'us-east-1',
    endpoint: rustfsEndpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: rustfsAccessKey,
      secretAccessKey: rustfsSecretKey
    }
  });

  return client;
}

function getLocalDashboardsDir(): string {
  return path.resolve(process.cwd(), '..', '..', 'dashboards');
}

function getLocalDashboardPath(key: string): string {
  return path.resolve(getLocalDashboardsDir(), path.basename(key));
}

async function listLocalDashboardKeys(): Promise<string[]> {
  const files = await readdir(getLocalDashboardsDir(), { withFileTypes: true });
  return files
    .filter((entry) => entry.isFile() && /\.(ya?ml)$/i.test(entry.name))
    .map((entry) => `${dashboardPrefix}${entry.name}`)
    .sort();
}

async function readLocalDashboardYaml(key: string): Promise<string> {
  return readFile(getLocalDashboardPath(key), 'utf8');
}

async function ensureBucketExists(): Promise<void> {
  const s3 = getClient();

  try {
    await s3.send(new HeadBucketCommand({ Bucket: dashboardBucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: dashboardBucket }));
  }
}

async function ensureDashboardObjects(): Promise<void> {
  if (!shouldBootstrap) {
    return;
  }

  const s3 = getClient();
  await ensureBucketExists();

  for (const key of await listLocalDashboardKeys()) {
    const body = await readLocalDashboardYaml(key);
    await s3.send(
      new PutObjectCommand({
        Bucket: dashboardBucket,
        Key: key,
        Body: body,
        ContentType: 'application/yaml'
      })
    );
  }
}

function toListing(key: string, spec: DashboardSpec, source: string): DashboardListing {
  return {
    key,
    name: spec.name,
    title: spec.title,
    description: spec.description,
    source
  };
}

export async function listDashboards(): Promise<DashboardListing[]> {
  await ensureDashboardObjects();

  const response = await getClient().send(
    new ListObjectsV2Command({
      Bucket: dashboardBucket,
      Prefix: dashboardPrefix
    })
  );

  const keys = (response.Contents ?? [])
    .map((entry) => entry.Key)
    .filter((key): key is string => typeof key === 'string' && /\.(ya?ml)$/i.test(key));

  const listings = await Promise.all(
    keys.map(async (key) => {
      try {
        const object = await getClient().send(new GetObjectCommand({ Bucket: dashboardBucket, Key: key }));
        const yaml = await object.Body?.transformToString();
        if (!yaml) {
          throw new Error(`Dashboard object ${key} was empty`);
        }

        return toListing(key, parseDashboard(yaml), `rustfs://${dashboardBucket}/${key}`);
      } catch (error) {
        console.warn(`Skipping invalid RustFS dashboard ${key}:`, error);
        return null;
      }
    })
  );

  const validListings = listings.filter((listing): listing is DashboardListing => listing !== null);
  if (validListings.length > 0) {
    return validListings.sort((a, b) => a.title.localeCompare(b.title));
  }

  throw new Error('No valid dashboards were available in RustFS');
}

export async function loadDashboard(key = defaultDashboardKey): Promise<{
  spec: DashboardSpec;
  yaml: string;
  source: string;
  key: string;
}> {
  await ensureDashboardObjects();

  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: dashboardBucket,
      Key: key
    })
  );

  const yaml = await response.Body?.transformToString();
  if (!yaml) {
    throw new Error('RustFS returned an empty dashboard object');
  }

  return {
    spec: parseDashboard(yaml),
    yaml,
    source: `rustfs://${dashboardBucket}/${key}`,
    key
  };
}
