function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  return res.status(200).json({
    message: 'Login successful',
    user: {
      id: 'u1',
      name: 'Ahmad',
      email
    }
  });
}

module.exports = { login };