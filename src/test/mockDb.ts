import type { Member, CheckIn, EmailVerification } from "../lib/types";
import { ObjectId, MongoServerError } from "mongodb";

export interface MockCollection<T> {
  _data: T[];
  findOne: (filter: any) => Promise<T | null>;
  find: (filter?: any) => MockCursor<T>;
  insertOne: (doc: T) => Promise<{ insertedId: ObjectId }>;
  insertMany: (docs: T[]) => Promise<{ insertedCount: number }>;
  updateOne: (filter: any, update: any) => Promise<{ modifiedCount: number }>;
  deleteOne: (filter: any) => Promise<{ deletedCount: number }>;
  countDocuments: (filter?: any) => Promise<number>;
  bulkWrite: (ops: any[]) => Promise<{ insertedCount?: number; upsertedCount?: number }>;
  aggregate: (pipeline: any[]) => { toArray: () => Promise<any[]> };
}

export interface MockCursor<T> {
  sort: (spec: any) => MockCursor<T>;
  skip: (n: number) => MockCursor<T>;
  limit: (n: number) => MockCursor<T>;
  toArray: () => Promise<T[]>;
  collation: (opts: any) => MockCursor<T>;
}

function matchDoc(d: any, clause: any): boolean {
  if (!clause || typeof clause !== "object") return true;
  if (clause.$or) return (clause.$or as any[]).some((c: any) => matchDoc(d, c));
  for (const [key, val] of Object.entries(clause)) {
    if (key === "$or") continue;
    const docVal = d[key];
    if (val !== null && typeof val === "object" && (val as any).$exists === false) {
      if (docVal !== undefined) return false;
    } else if (docVal !== val) return false;
  }
  return true;
}

function createMockCursor<T>(data: T[], filter?: any): MockCursor<T> {
  let result = filter && filter.email?.$in
    ? data.filter((d: any) => filter.email.$in.includes((d as any).email))
    : [...data];
  let sorted = result;
  let skip = 0;
  let limit = sorted.length;
  const getArray = () => sorted.slice(skip, skip + limit);
  return {
    sort(spec: any) {
      const key = Object.keys(spec)[0] || "_id";
      const dir = spec[key] === -1 ? -1 : 1;
      sorted = [...sorted].sort((a: any, b: any) => {
        const av = a[key];
        const bv = b[key];
        if (av < bv) return -dir;
        if (av > bv) return dir;
        return 0;
      });
      return this;
    },
    skip(n: number) {
      skip = n;
      return this;
    },
    limit(n: number) {
      limit = n;
      return this;
    },
    collation() {
      return this;
    },
    toArray: () => Promise.resolve(getArray()),
    async *[Symbol.asyncIterator]() {
      for (const x of getArray()) yield x;
    },
  };
}

function createMockCollection<T extends { _id?: any }>(name: string): MockCollection<T> {
  const _data: T[] = [];
  return {
    _data,
    async findOne(filter: any) {
      if (!filter || Object.keys(filter).length === 0) return _data[0] ?? null;
      return _data.find((d: any) => {
        for (const [key, val] of Object.entries(filter)) {
          const docVal = (d as any)[key];
          if (val instanceof ObjectId || (typeof val === "object" && val?.toString)) {
            if (docVal?.toString() !== (val as any).toString()) return false;
          } else if (key === "email" && String(val).toLowerCase) {
            if ((docVal ?? "").toLowerCase() !== String(val).toLowerCase()) return false;
          } else if (docVal !== val) {
            return false;
          }
        }
        return true;
      }) ?? null;
    },
    find(filter: any = {}) {
      let result = [..._data];
      if (filter && Object.keys(filter).length > 0) {
        if (filter.$and) {
          const clauses = filter.$and as Array<Record<string, unknown>>;
          result = result.filter((d: any) =>
            clauses.every((clause: any) => matchDoc(d, clause))
          );
        }
        if (filter.$or) {
          const or = filter.$or as Array<Record<string, unknown>>;
          result = result.filter((d: any) =>
            or.some((clause: any) => {
              if (clause.firstName instanceof RegExp && clause.firstName.test(String(d.firstName ?? ""))) return true;
              if (clause.lastName instanceof RegExp && clause.lastName.test(String(d.lastName ?? ""))) return true;
              if (clause.email instanceof RegExp && clause.email.test(String(d.email ?? ""))) return true;
              if (clause.$expr?.$regexMatch) {
                const rm = clause.$expr.$regexMatch;
                const flags = rm.options || "i";
                try {
                  const re = new RegExp(String(rm.regex), flags);
                  const fn = String(d.firstName ?? "").trim();
                  const ln = String(d.lastName ?? "").trim();
                  const full = `${fn} ${ln}`.replace(/\s+/g, " ").trim();
                  const rev = `${ln} ${fn}`.replace(/\s+/g, " ").trim();
                  return re.test(full) || re.test(rev);
                } catch {
                  return false;
                }
              }
              return false;
            })
          );
        }
        if (filter.blocked === true) result = result.filter((d: any) => d.blocked === true);
        if (filter.emailValid !== undefined) result = result.filter((d: any) => d.emailValid === filter.emailValid);
        if (filter.emailInvalid === true) result = result.filter((d: any) => d.emailInvalid === true);
        if (filter.email?.$in) {
          const emails = new Set((filter.email.$in as string[]).map((e: string) => e.toLowerCase()));
          result = result.filter((d: any) => emails.has((d as any).email?.toLowerCase()));
        }
      }
      return createMockCursor(result, filter);
    },
    async insertOne(doc: T) {
      if (name === "members" && (doc as any).email) {
        const exists = _data.some((d: any) => (d as any).email?.toLowerCase() === (doc as any).email?.toLowerCase());
        if (exists) {
          throw new MongoServerError({ message: "E11000 duplicate key error", code: 11000 } as any);
        }
      }
      const id = doc._id ?? new ObjectId();
      const withId = { ...doc, _id: id };
      _data.push(withId as T);
      return { insertedId: id };
    },
    async insertMany(docs: T[]) {
      let c = 0;
      for (const d of docs) {
        const id = (d as any)._id ?? new ObjectId();
        _data.push({ ...d, _id: id } as T);
        c++;
      }
      return { insertedCount: c };
    },
    async updateOne(filter: any, update: any) {
      const doc = _data.find((d: any) => {
        if (filter._id && d._id) return d._id.toString() === filter._id.toString();
        if (filter.email) return (d as any).email?.toLowerCase() === filter.email?.toLowerCase();
        return false;
      });
      if (!doc) return { modifiedCount: 0 };
      const set = update?.$set ?? update?.$unset;
      if (set) {
        for (const [k, v] of Object.entries(set)) {
          if (v === "" || (update?.$unset && (update as any).$unset[k] !== undefined)) {
            delete (doc as any)[k];
          } else {
            (doc as any)[k] = v;
          }
        }
      }
      return { modifiedCount: 1 };
    },
    async deleteOne(filter: any) {
      const idx = _data.findIndex((d: any) => {
        if (filter._id) return d._id?.toString() === filter._id?.toString();
        return false;
      });
      if (idx >= 0) {
        _data.splice(idx, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },
    async countDocuments(filter: any = {}) {
      if (!filter || Object.keys(filter).length === 0) return _data.length;
      return this.find(filter).toArray().then((a) => a.length);
    },
    async bulkWrite(ops: any[]) {
      let upsertedCount = 0;
      for (const op of ops) {
        if (op.updateOne) {
          const { filter, update } = op.updateOne;
          const doc = _data.find((d: any) => (d as any).email === filter.email);
          if (!doc && update?.$setOnInsert) {
            _data.push({ ...update.$setOnInsert, _id: new ObjectId() } as T);
            upsertedCount++;
          }
        }
      }
      return { insertedCount: 0, upsertedCount };
    },
    aggregate(pipeline: any[]) {
      let result: any[] = [..._data];
      for (const stage of pipeline) {
        if (stage.$sort) {
          const key = Object.keys(stage.$sort)[0];
          const dir = stage.$sort[key];
          result = [...result].sort((a: any, b: any) => (dir === -1 ? 1 : -1) * (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
        }
        if (stage.$skip !== undefined) result = result.slice(stage.$skip);
        if (stage.$limit !== undefined) result = result.slice(0, stage.$limit);
      }
      return { toArray: () => Promise.resolve(result) };
    },
  };
}

export function createMockDb() {
  const members = createMockCollection<Member & { _id?: ObjectId }>("members");
  const checkins = createMockCollection<CheckIn & { _id?: ObjectId }>("checkins");
  const admins = createMockCollection<{ _id?: ObjectId; username: string; password: string; role?: string }>("admins");
  const failed_logins = createMockCollection<{ ip: string; attempts: number; lockUntil?: Date }>("failed_logins");
  const emailVerifications = createMockCollection<EmailVerification & { _id?: ObjectId }>("emailVerifications");

  return {
    collection<T = any>(name: string): MockCollection<T> {
      switch (name) {
        case "members":
          return members as MockCollection<T>;
        case "checkins":
          return checkins as MockCollection<T>;
        case "admins":
          return admins as MockCollection<T>;
        case "failed_logins":
          return failed_logins as MockCollection<T>;
        case "emailVerifications":
          return emailVerifications as MockCollection<T>;
        default:
          return createMockCollection<T>(name);
      }
    },
    members,
    checkins,
    admins,
    failed_logins,
    emailVerifications,
  };
}

export type MockDb = ReturnType<typeof createMockDb>;
