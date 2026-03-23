import dotenv from "dotenv";
import { Db, MongoClient } from "mongodb";

dotenv.config({ path: ".env.local" });
dotenv.config();

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
  mongoClientPromise: Promise<MongoClient> | undefined;
  mongoDb: Db | undefined;
};

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI debe estar definido.");
  return uri;
}

function getMongoDbName() {
  const explicitName = process.env.MONGODB_DB_NAME?.trim();
  if (explicitName) return explicitName;

  const uri = getMongoUri();
  const withoutQuery = uri.split("?")[0] ?? uri;
  const rawName = withoutQuery.substring(withoutQuery.lastIndexOf("/") + 1).trim();

  return rawName || "medigest_chat";
}

async function connectMongoClient() {
  const client = new MongoClient(getMongoUri());
  await client.connect();
  return client;
}

export async function getMongoClient() {
  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = connectMongoClient().then((client) => {
      globalForMongo.mongoClient = client;
      return client;
    });
  }

  return globalForMongo.mongoClientPromise;
}

export async function getMongoDb() {
  if (!globalForMongo.mongoDb) {
    const client = await getMongoClient();
    globalForMongo.mongoDb = client.db(getMongoDbName());
  }

  return globalForMongo.mongoDb;
}
