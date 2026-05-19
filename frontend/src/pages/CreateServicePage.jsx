import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import theme from '../styles/theme';

function CreateServicePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    port: ''
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

    if (!formData.name || !formData.repoUrl || !formData.port) {
      setError('All fields are required');
      return;
    }

    if (isNaN(Number(formData.port))) {
      setError('Port must be a valid number');
      return;
    }

    try {
      await api.post('/services', {
        ...formData,
        port: Number(formData.port)
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create service');
    }
  };

  return (
    <>
      <Navbar />

      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Create Service</h1>

          <p style={styles.subtitle}>
            Add a GitHub repository that contains a Dockerfile so CloudBuilder can deploy it.
          </p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Service Name</label>
              <input
                type="text"
                name="name"
                placeholder="Example: Demo App"
                value={formData.name}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>GitHub Repository URL</label>
              <input
                type="text"
                name="repoUrl"
                placeholder="https://github.com/username/repository"
                value={formData.repoUrl}
                onChange={handleChange}
                style={styles.input}
              />
              <small style={styles.helperText}>
                Use a public GitHub repository for the current local deployment flow.
              </small>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Application Port</label>
              <input
                type="number"
                name="port"
                placeholder="Example: 3000"
                value={formData.port}
                onChange={handleChange}
                style={styles.input}
              />
              <small style={styles.helperText}>
                This should match the port exposed by the application inside its Dockerfile.
              </small>
            </div>

            <button type="submit" style={styles.button}>
              Create Service
            </button>

            {error && <p style={styles.errorBox}>{error}</p>}
          </form>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: theme.colors.background,
    padding: theme.spacing.page,
    color: theme.colors.text
  },
  card: {
    background: theme.colors.cardBackground,
    padding: '2rem',
    borderRadius: theme.radius.large,
    width: '100%',
    maxWidth: '480px',
    boxShadow: theme.shadow.card,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`
  },
  title: {
    margin: 0,
    textAlign: 'center',
    color: theme.colors.text
  },
  subtitle: {
    marginTop: '0.7rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
    color: theme.colors.mutedText,
    lineHeight: 1.5
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  label: {
    fontWeight: '700',
    color: theme.colors.text
  },
  input: {
    padding: '0.85rem',
    fontSize: '1rem',
    background: theme.colors.cardBackground,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.small,
    outline: 'none'
  },
  helperText: {
    color: theme.colors.mutedText,
    lineHeight: 1.4
  },
  button: {
    padding: '0.85rem',
    fontSize: '1rem',
    cursor: 'pointer',
    background: theme.colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: theme.radius.small,
    fontWeight: '700',
    marginTop: '0.3rem'
  },
  errorBox: {
    color: theme.colors.danger,
    background: theme.colors.dangerSoft,
    padding: '0.8rem',
    borderRadius: theme.radius.small,
    border: `1px solid ${theme.colors.danger}`
  }
};

export default CreateServicePage;