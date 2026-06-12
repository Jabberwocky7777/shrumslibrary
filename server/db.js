const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const path = require('path')

const DB_PATH = process.env.DB_PATH || '/data/shrums.db'

const db = new Database(DB_PATH)

// WAL mode is mandatory — connect-sqlite3 opens a second connection to the same file
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS kindle_addresses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    label      TEXT NOT NULL,
    email      TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS books (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    author              TEXT,
    year                TEXT,
    isbn                TEXT,
    cover_url           TEXT,
    file_path           TEXT,
    status              TEXT NOT NULL DEFAULT 'requested',
    current_release_id  INTEGER,
    kindle_sent_at      TEXT,
    kindle_address_id   INTEGER REFERENCES kindle_addresses(id),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS releases (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id         INTEGER NOT NULL REFERENCES books(id),
    nzb_title       TEXT,
    release_group   TEXT,
    file_size_mb    REAL,
    score           INTEGER,
    nzb_url         TEXT,
    sabnzbd_job_id  TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    flag_reason     TEXT,
    attempt_number  INTEGER NOT NULL DEFAULT 1,
    grabbed_at      TEXT,
    validated_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS validation_results (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    release_id            INTEGER NOT NULL REFERENCES releases(id),
    epub_structure_valid  INTEGER,
    drm_detected          INTEGER,
    encoding_issues       INTEGER,
    file_size_mb          REAL,
    over_size_limit       INTEGER,
    error_detail          TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sends_log (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id           INTEGER,
    kindle_address_id INTEGER,
    attempt_number    INTEGER,
    smtp_response     TEXT,
    error_message     TEXT,
    attempted_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid     TEXT PRIMARY KEY,
    sess    TEXT NOT NULL,
    expired TEXT NOT NULL
  );
`)

// ── Seed default config (only if keys don't already exist) ────────────────────

const seedConfig = db.transaction(() => {
  const insert = db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`)

  insert.run('prowlarr_url', '')
  insert.run('prowlarr_api_key', '')
  insert.run('sabnzbd_url', '')
  insert.run('sabnzbd_api_key', '')
  insert.run('smtp_host', '')
  insert.run('smtp_port', '587')
  insert.run('smtp_user', '')
  insert.run('smtp_pass', '')
  insert.run('smtp_from', '')
  insert.run('theme', 'zinc-indigo')
  insert.run('auto_grab', 'true')

  // Session secret — auto-generate on first run
  insert.run('session_secret', uuidv4())

  // Default credentials
  insert.run('admin_username', 'admin')
  const defaultHash = bcrypt.hashSync('shrumslibrary', 10)
  insert.run('admin_password', defaultHash)
})

seedConfig()

module.exports = db
