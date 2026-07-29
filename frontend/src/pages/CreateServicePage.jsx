import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import theme from '../styles/theme';

// The shared security group only allows inbound traffic on this range,
// so an AWS service outside it would deploy but be unreachable.
const AWS_MIN_PORT = 3000;
const AWS_MAX_PORT = 9000;

function CreateServicePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    port: '',
    target: 'local'
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

    const numericPort = Number(formData.port);

    if (isNaN(numericPort)) {
      setError('Port must be a valid number');
      return;
    }

    if (
      formData.target === 'aws' &&
      (numericPort < AWS_MIN_PORT || numericPort > AWS_MAX_PORT)
    ) {
      setError(
        `AWS deployments must use a port between ${AWS_MIN_PORT} and ${AWS_MAX_PORT}`
      );
      return;
    }

    try {
      await api.post('/services', {
        ...formData,
        port: numericPort
      });

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
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
                Use a public GitHub repository that contains a Dockerfile in its root.
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

            <div style={styles.field}>
              <label style={styles.label}>Deployment Target</label>
              <select
                name="target"
                value={formData.target}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="local">Local Docker</option>
                <option value="aws">AWS Fargate</option>
              </select>
              <small style={styles.helperText}>
                Local runs the container on this machine. AWS pushes the image to
                Amazon ECR and runs it on ECS Fargate.
              </small>
            </div>

            {formData.target === 'aws' && (
              <div style={styles.noticeBox}>
                <strong>AWS deployments cost money.</strong> Each deployment starts a
                Fargate task billed per second while it runs. Undeploy the service when
                you are finished with it. Ports must be between {AWS_MIN_PORT} and{' '}
                {AWS_MAX_PORT}.
              </div>
            )}

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
  noticeBox: {
    color: theme.colors.text,
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.radius.small,
    padding: '0.8rem',
    lineHeight: 1.5
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
