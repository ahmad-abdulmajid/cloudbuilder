const { getSession } = require("../utils/sessionStore");

function requireAuth(req, res, next) {
  const token = req.cookies.sid;
  const session = token ? getSession(token) : null;

  if (!session) {
    return res.status(401).json({
      error: { message: "Authentication required" }
    });
  }

  req.user = { email: session.email };
  next();
}

module.exports = requireAuth;
