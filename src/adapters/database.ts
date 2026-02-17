import {
    MongoClient,
    Db,
    MongoServerError,
    type Collection,
    type CreateIndexesOptions,
    type Document,
    type IndexSpecification,
} from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

const DB_NAME = process.env.MONGODB_DB_NAME || "billiard-club";
const IGNORABLE_INDEX_ERROR_CODES = new Set([85, 86, 11000]);

export async function connectToMongo(): Promise<Db> {
    if (db) return db;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is not set");
    }

    const nextClient = new MongoClient(uri);

    try {
        await nextClient.connect();

        const nextDb = nextClient.db(DB_NAME);

        // Safe to run on startup (idempotent); conflicts on legacy data should not block runtime requests.
        await initializeDatabase(nextDb);

        client = nextClient;
        db = nextDb;

        return nextDb;
    } catch (error) {
        await nextClient.close().catch(() => undefined);
        throw error;
    }
}

async function createIndexSafely(
    collection: Collection<Document>,
    key: IndexSpecification,
    options: CreateIndexesOptions
) {
    try {
        await collection.createIndex(key, options);
    } catch (error) {
        if (error instanceof MongoServerError) {
            const isIgnorableCode = typeof error.code === "number" && IGNORABLE_INDEX_ERROR_CODES.has(error.code);
            const isIgnorableName =
                error.codeName === "IndexOptionsConflict" ||
                error.codeName === "IndexKeySpecsConflict" ||
                error.codeName === "DuplicateKey";

            if (isIgnorableCode || isIgnorableName) {
                console.warn(
                    `[Mongo Init] Skipping index "${options.name ?? "unnamed"}" on "${collection.collectionName}": ${error.message}`
                );
                return;
            }
        }

        throw error;
    }
}

async function initializeDatabase(database: Db) {
    const members = database.collection("members");
    const checkins = database.collection("checkins");

    // MEMBERS TABLE RULES
    await createIndexSafely(
        members,
        { email: 1 },
        { unique: true, name: "unique_email" }
    );

    await createIndexSafely(
        members,
        { qrUuid: 1 },
        { unique: true, name: "unique_qr_uuid" }
    );

    // CHECKINS TABLE RULES
    await createIndexSafely(
        checkins,
        { memberId: 1 },
        { name: "index_member_lookup" }
    );

    await createIndexSafely(
        checkins,
        { checkinTime: -1 },
        { name: "index_time_sort" }
    );
}

