import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import theme from '../styles/theme';

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    try {
      await api.post('/auth/login', formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Login</button>
          {error && <p style={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: theme.colors.background
  },
  card: {
    background: theme.colors.cardBackground,
    padding: '2rem',
    borderRadius: theme.radius.medium,
    width: '350px',
    boxShadow: theme.shadow.card,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text
  },
  title: {
    color: theme.colors.text,
    marginTop: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '0.8rem',
    fontSize: '1rem',
    background: theme.colors.softBackground,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.small
  },
  button: {
    padding: '0.8rem',
    fontSize: '1rem',
    cursor: 'pointer',
    background: theme.colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: theme.radius.small,
    fontWeight: '600'
  },
  error: {
    color: theme.colors.danger,
    background: theme.colors.dangerSoft,
    padding: '0.6rem',
    borderRadius: theme.radius.small,
    border: `1px solid ${theme.colors.danger}`,
    margin: 0
  }
};

export default LoginPage;