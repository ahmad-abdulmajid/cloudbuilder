const bcrypt = require("bcryptjs");
const { createSession, deleteSession } = require("../utils/sessionStore");

const COOKIE_NAME = "sid";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  maxAge: 8 * 60 * 60 * 1000
};

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: { message: "Email and password are required" }
    });
  }

  const emailOk = email === process.env.AUTH_EMAIL;
  const passwordOk = await bcrypt.compare(
    password,
    process.env.AUTH_PASSWORD_HASH || ""
  );

  if (!emailOk || !passwordOk) {
    return res.status(401).json({
      error: { message: "Invalid email or password" }
    });
  }

  const token = createSession(email);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

  return res.status(200).json({
    message: "Login successful",
    user: { email }
  });
}

function logout(req, res) {
  const token = req.cookies.sid;
  if (token) {
    deleteSession(token);
  }
  res.clearCookie(COOKIE_NAME);
  return res.status(200).json({ message: "Logged out" });
}

function me(req, res) {
  return res.status(200).json({ user: req.user });
}

module.exports = { login, logout, me };
