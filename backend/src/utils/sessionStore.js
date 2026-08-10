const crypto = require("crypto");

const sessions = new Map();

function createSession(email) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { email, createdAt: Date.now() });
  return token;
}

function getSession(token) {
  return sessions.get(token) || null;
}

function deleteSession(token) {
  sessions.delete(token);
}

module.exports = { createSession, getSession, deleteSession };
