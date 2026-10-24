import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export class LocalStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
  }
  async read() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const data = JSON.parse(await readFile(this.filePath, 'utf8'));
      data.users ||= [];
      data.sessions ||= [];
      return data;
    } catch (cause) {
      if (cause.code !== 'ENOENT') throw cause;
      const data = { users: [], sessions: [] };
      await writeFile(this.filePath, JSON.stringify(data, null, 2));
      return data;
    }
  }
  serialized(operation) {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  async getUserByEmail(email) { return (await this.read()).users.find(user => user.email === email) || null; }
  async createUser(user, sessionHash) {
    return this.serialized(async () => {
      const db = await this.read();
      if (db.users.some(item => item.email === user.email)) throw Object.assign(new Error('duplicate email'), { code: '23505' });
      db.users.push(user);
      db.sessions.push({ tokenHash: sessionHash, userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
      await writeFile(this.filePath, JSON.stringify(db, null, 2));
    });
  }
  async createSession(tokenHash, userId) {
    return this.serialized(async () => {
      const db = await this.read();
      db.sessions = db.sessions.filter(item => item.tokenHash !== tokenHash);
      db.sessions.push({ tokenHash, userId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
      await writeFile(this.filePath, JSON.stringify(db, null, 2));
    });
  }
  async deleteSession(tokenHash) {
    return this.serialized(async () => {
      const db = await this.read();
      db.sessions = db.sessions.filter(item => item.tokenHash !== tokenHash);
      await writeFile(this.filePath, JSON.stringify(db, null, 2));
    });
  }
  async getUserBySession(tokenHash) {
    const db = await this.read();
    const session = db.sessions.find(item => item.tokenHash === tokenHash && item.expiresAt > Date.now());
    return session ? db.users.find(user => user.id === session.userId) || null : null;
  }
  async updateUser(userId, updater) {
    return this.serialized(async () => {
      const db = await this.read();
      const user = db.users.find(item => item.id === userId);
      if (!user) throw Object.assign(new Error('User not found'), { status: 401 });
      const result = await updater(user);
      await writeFile(this.filePath, JSON.stringify(db, null, 2));
      return { user, result };
    });
  }
}
