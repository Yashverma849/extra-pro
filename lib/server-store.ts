import "server-only";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type Role = "ADMIN" | "COMPLIANCE" | "REVIEWER" | "READ_ONLY";
export type PortalUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  active: boolean;
  passwordHash: string;
  createdAt: string;
  lastLogin: string | null;
  failedLoginCount?: number;
  lockedUntil?: string | null;
  mustChangePassword?: boolean;
};
type Session = { token: string; userId: string; expiresAt: string };
export type WatchlistEntry = {
  id: string;
  versionId: string;
  category: string;
  partyType: "Individual" | "Entity";
  primaryName: string;
  aliases: string[];
  referenceNumber: string;
  dataId: string;
  dateOfBirth: string[];
  nationalities: string[];
  identifiers: string[];
  remarks: string;
};
export type WatchlistVersion = {
  id: string;
  sourceId: string;
  category: string;
  classification: WatchlistClassification;
  treatment: string;
  source: string;
  version: string;
  effectiveDate: string;
  uploadedAt: string;
  uploadedBy: string;
  filename: string;
  fileHash: string;
  recordCount: number;
  active: boolean;
  sourceFilePath: string;
  screeningStartedAt: string;
  screeningCompletedAt: string;
  partiesScreened: number;
  uboRecordsScreened: number;
  matchesCreated: number;
  screeningErrors: number;
};
export type WatchlistClassification = "MANDATORY_OMAN_TFS" | "ADDITIONAL_EXTERNAL" | "PEP" | "INTERNAL";
export type WatchlistSource = {
  id: string;
  code: string;
  name: string;
  authority: string;
  classification: WatchlistClassification;
  treatment: string;
  legalBasis: string;
  format: "UN_XML" | "STANDARD_CSV";
  active: boolean;
  systemDefined: boolean;
  statutoryLocked: boolean;
  createdAt: string;
  createdBy: string;
};
export type UploadBatch = {
  id: string; businessDate: string; filename: string; fileHash: string; uploadedAt: string; uploadedBy: string;
  recordCount: number; acceptedCount: number; exceptionCount: number; totalGrossPremium: number; status: string;
};
export type DailyTransaction = Record<string, string | number | null> & { batchId: string; sourceRecordId: string };
export type UboRecord = {
  id: string;
  companyName: string;
  companyCr: string;
  ownershipPath: string;
  naturalPersonName: string;
  naturalPersonIdentifier: string;
  nationality: string;
  companyRoutePercent: number;
  naturalPersonPercent: number;
  effectiveOwnership: number;
  controlBasis: string;
  controlDetails: string;
  pepDeclared: "YES" | "NO" | "UNKNOWN";
  kycStatus: string;
  verificationStatus: string;
  verifiedDate: string;
  nextReviewDate: string;
  sourceReference: string;
  createdAt: string;
  createdBy: string;
};
export type CaseStatus = "New" | "Under review" | "Information requested" | "Escalated to MLRO" | "Communicated to Operations" | "Operations response received" | "False positive" | "Closed";
export type CaseRecord = {
  id: string; entity: string; detail: string; type: string; priority: "Critical" | "High" | "Medium";
  owner: string; status: CaseStatus; age: string; createdAt?: string; updatedAt?: string;
  decisionReason?: string; operationsResponse?: string; evidenceReference?: string;
  history?: { at: string; by: string; from: string; to: string; reason: string; response?: string; evidenceReference?: string }[];
  screeningKey?: string;
};
export type CustomerRecord = Record<string, unknown> & {
  id: string; name: string; type: string; identifier: string; risk: string; kyc: string;
};
export type PortalStore = {
  schemaVersion: number;
  revision: number;
  users: PortalUser[];
  sessions: Session[];
  cases: CaseRecord[];
  customers: CustomerRecord[];
  activities: { id: string; date: string; user: string; action: string; detail: string }[];
  routines: { businessDate: string; dailyUpload: string; screening: string; criticalReviewed: string; kycFollowup: string }[];
  watchlistVersions: WatchlistVersion[];
  watchlistEntries: WatchlistEntry[];
  watchlistSources: WatchlistSource[];
  uploadBatches: UploadBatch[];
  dailyTransactions: DailyTransaction[];
  uboRecords: UboRecord[];
};

const dataFile = join(process.cwd(), "data", "portal.json");
const lockFile = join(process.cwd(), "data", "portal.lock");
const backupDir = join(process.cwd(), "data", "backups");
const CURRENT_SCHEMA_VERSION = 2;

function defaultWatchlistSources(): WatchlistSource[] {
  const now = new Date().toISOString();
  return [
    { id: "source-un", code: "UN", name: "UN Consolidated List", authority: "United Nations Security Council", classification: "MANDATORY_OMAN_TFS", treatment: "Immediate Oman TFS escalation and action under the approved NCTC procedure", legalBasis: "Oman NCTC Decision 1/2022 and applicable UN Security Council resolutions", format: "UN_XML", active: true, systemDefined: true, statutoryLocked: true, createdAt: now, createdBy: "System" },
    { id: "source-oman", code: "OMAN", name: "Oman National List", authority: "Oman National Counter-Terrorism Committee", classification: "MANDATORY_OMAN_TFS", treatment: "Immediate Oman TFS escalation and action under the approved NCTC procedure", legalBasis: "Oman NCTC Decision 1/2022", format: "STANDARD_CSV", active: true, systemDefined: true, statutoryLocked: true, createdAt: now, createdBy: "System" },
    { id: "source-pep", code: "PEP", name: "PEP List", authority: "NIA-approved PEP data source", classification: "PEP", treatment: "Risk-based enhanced due diligence and approval; not automatic rejection or freezing", legalBasis: "NIA AML/CFT procedure and applicable PEP requirements", format: "STANDARD_CSV", active: true, systemDefined: true, statutoryLocked: false, createdAt: now, createdBy: "System" },
    { id: "source-internal", code: "INTERNAL", name: "Internal Watchlist", authority: "The New India Assurance Co. Ltd.", classification: "INTERNAL", treatment: "Internal review or restriction under approved NIA policy", legalBasis: "NIA approved internal watchlist procedure", format: "STANDARD_CSV", active: true, systemDefined: true, statutoryLocked: false, createdAt: now, createdBy: "System" },
  ];
}

function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function setPassword(userId: string, password: string) {
  const store = readStore();
  const user = store.users.find(item => item.id === userId);
  if (!user) throw new Error("User not found");
  user.passwordHash = passwordHash(password);
  user.mustChangePassword = false;
  store.sessions = store.sessions.filter(session => session.userId !== userId);
  addActivity(store, user.fullName, "PASSWORD_CHANGED", "Account password changed");
  writeStore(store);
}

export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function initialStore(): PortalStore {
  return {
    users: [{
      id: randomUUID(),
      username: "admin",
      fullName: "System Administrator",
      role: "ADMIN",
      active: true,
      passwordHash: passwordHash(process.env.NIA_INITIAL_ADMIN_PASSWORD || "ChangeMe123!"),
      createdAt: new Date().toISOString(),
      lastLogin: null,
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: true,
    }],
    schemaVersion: CURRENT_SCHEMA_VERSION,
    revision: 0,
    sessions: [],
    cases: [],
    customers: [],
    activities: [],
    routines: [{
      businessDate: "",
      dailyUpload: "Pending",
      screening: "Pending",
      criticalReviewed: "Pending",
      kycFollowup: "Pending",
    }],
    watchlistVersions: [],
    watchlistEntries: [],
    watchlistSources: defaultWatchlistSources(),
    uploadBatches: [],
    dailyTransactions: [],
    uboRecords: [],
  };
}

export function readStore(): PortalStore {
  if (!existsSync(dataFile)) {
    mkdirSync(dirname(dataFile), { recursive: true });
    const created = initialStore();
    writeFileSync(dataFile, JSON.stringify(created, null, 2), "utf8");
    return created;
  }
  let store: PortalStore;
  try {
    store = JSON.parse(readFileSync(dataFile, "utf8")) as PortalStore;
  } catch {
    const backups = existsSync(backupDir)
      ? readdirSync(backupDir).filter(name => name.endsWith(".json")).sort().reverse()
      : [];
    if (!backups.length) throw new Error("Portal data is unreadable and no recovery backup is available");
    store = JSON.parse(readFileSync(join(backupDir, backups[0]), "utf8")) as PortalStore;
  }
  store.schemaVersion ||= 1;
  store.revision ||= 0;
  store.watchlistVersions ||= [];
  store.watchlistEntries ||= [];
  store.watchlistSources ||= defaultWatchlistSources();
  const defaults = defaultWatchlistSources();
  for (const source of defaults) {
    if (!store.watchlistSources.some(item => item.id === source.id || item.code === source.code)) store.watchlistSources.push(source);
  }
  for (const version of store.watchlistVersions) {
    const source = store.watchlistSources.find(item => item.name === version.category);
    version.sourceId ||= source?.id || "";
    version.classification ||= source?.classification || "ADDITIONAL_EXTERNAL";
    version.treatment ||= source?.treatment || "Compliance review under the approved source procedure";
  }
  store.uploadBatches ||= [];
  store.dailyTransactions ||= [];
  store.uboRecords ||= [];
  store.cases ||= [];
  store.customers ||= [];
  for (const item of store.cases) {
    item.createdAt ||= new Date().toISOString();
    item.updatedAt ||= item.createdAt;
    item.history ||= [];
  }
  for (const version of store.watchlistVersions) {
    version.sourceFilePath ||= "";
    version.screeningStartedAt ||= "";
    version.screeningCompletedAt ||= "";
    version.partiesScreened ||= 0;
    version.uboRecordsScreened ||= 0;
    version.matchesCreated ||= 0;
    version.screeningErrors ||= 0;
  }
  store.schemaVersion = CURRENT_SCHEMA_VERSION;
  return store;
}

function acquireLock() {
  mkdirSync(dirname(lockFile), { recursive: true });
  if (existsSync(lockFile) && Date.now() - statSync(lockFile).mtimeMs > 30_000) unlinkSync(lockFile);
  try {
    return openSync(lockFile, "wx");
  } catch {
    throw new Error("Portal data is busy. Please retry the operation.");
  }
}

function releaseLock(handle: number) {
  closeSync(handle);
  if (existsSync(lockFile)) unlinkSync(lockFile);
}

function writeStoreUnlocked(store: PortalStore) {
  mkdirSync(dirname(dataFile), { recursive: true });
  mkdirSync(backupDir, { recursive: true });
  if (existsSync(dataFile)) {
    const backupName = `portal-${new Date().toISOString().replace(/[:.]/g, "-")}-r${store.revision}.json`;
    copyFileSync(dataFile, join(backupDir, backupName));
    const backups = readdirSync(backupDir).filter(name => name.endsWith(".json")).sort().reverse();
    for (const old of backups.slice(20)) rmSync(join(backupDir, old), { force: true });
  }
  store.schemaVersion = CURRENT_SCHEMA_VERSION;
  store.revision = (store.revision || 0) + 1;
  const tempFile = `${dataFile}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf8");
  renameSync(tempFile, dataFile);
}

export function writeStore(store: PortalStore) {
  const lock = acquireLock();
  try {
    if (existsSync(dataFile)) {
      const current = JSON.parse(readFileSync(dataFile, "utf8")) as PortalStore;
      if ((current.revision || 0) !== (store.revision || 0)) {
        throw new Error("Portal data changed during this operation. Please retry.");
      }
    }
    writeStoreUnlocked(store);
  } finally {
    releaseLock(lock);
  }
}

export function updateStore<T>(mutator: (store: PortalStore) => T): T {
  const lock = acquireLock();
  try {
    const store = readStore();
    const result = mutator(store);
    writeStoreUnlocked(store);
    return result;
  } finally {
    releaseLock(lock);
  }
}

export function publicUser(user: PortalUser) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export function createUser(input: { username: string; fullName: string; role: Role; password: string }) {
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(input.password)) throw new Error("Temporary password must be at least 12 characters and include upper-case, lower-case, number and special character");
  if (!["ADMIN", "COMPLIANCE", "REVIEWER", "READ_ONLY"].includes(input.role)) throw new Error("Invalid role");
  const store = readStore();
  if (store.users.some(user => user.username.toLowerCase() === input.username.toLowerCase())) throw new Error("Username already exists");
  const user: PortalUser = { id: randomUUID(), username: input.username.trim(), fullName: input.fullName.trim(), role: input.role, active: true, passwordHash: passwordHash(input.password), createdAt: new Date().toISOString(), lastLogin: null, failedLoginCount: 0, lockedUntil: null, mustChangePassword: true };
  store.users.push(user);
  writeStore(store);
  return publicUser(user);
}

export function addActivity(store: PortalStore, user: string, action: string, detail: string) {
  store.activities.unshift({ id: randomUUID(), date: new Date().toISOString(), user, action, detail });
  store.activities = store.activities.slice(0, 500);
}
