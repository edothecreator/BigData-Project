import "server-only";

import { MongoClient, type Db } from "mongodb";

import { env } from "@/lib/env";

/**
 * Cached MongoDB client.
 *
 * In development Next.js clears the module registry on every hot reload, which
 * would otherwise open a brand-new connection pool on each change and quickly
 * exhaust the server's connection limit. We stash the client promise on the
 * global object so it survives reloads. In production the module is evaluated
 * once, so a plain module-level singleton is enough.
 */

const options = {
  // Fail fast when the server is down rather than hanging the request.
  serverSelectionTimeoutMS: 4000,
  connectTimeoutMS: 4000,
  // A dashboard needs only a handful of concurrent reads.
  maxPoolSize: 10,
};

type GlobalWithMongo = typeof globalThis & {
  _reviewScopeMongoClientPromise?: Promise<MongoClient>;
};

const globalWithMongo = globalThis as GlobalWithMongo;

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(env.MONGODB_URI, options);
  return client.connect();
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!globalWithMongo._reviewScopeMongoClientPromise) {
    globalWithMongo._reviewScopeMongoClientPromise = createClientPromise();
  }
  clientPromise = globalWithMongo._reviewScopeMongoClientPromise;
} else {
  clientPromise = createClientPromise();
}

/** Resolve the shared, connected MongoClient. */
export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

/** Resolve the configured application database. */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(env.MONGODB_DB);
}
