import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import theme from '../styles/theme';

function ServiceDetailsPage() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchService = async () => {
      try {
        const response = await api.get(`/services/${id}`);
        setService(response.data);
        setError('');
      } catch (err) {
        setError('Failed to load service details');
      }
    };

    fetchService();
  }, [id]);

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Not available';
    }

    return new Date(dateValue).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (error && !service) {
    return (
      <>
        <Navbar />
        <div style={styles.container}>
          <p style={styles.errorBox}>{error}</p>
          <Link to="/dashboard" style={styles.link}>Back to Dashboard</Link>
        </div>
      </>
    );
  }

  if (!service) {
    return (
      <>
        <Navbar />
        <div style={styles.container}>
          <p style={styles.info}>Loading service details...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>{service.name}</h1>
          <p style={styles.subtitle}>Detailed deployment information for this service.</p>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Service Information</h2>

            <p style={styles.row}>
              <strong>Repository:</strong>{' '}
              <a
                href={service.repoUrl}
                target="_blank"
                rel="noreferrer"
                style={styles.link}
              >
                {service.repoUrl}
              </a>
            </p>

            <p style={styles.row}><strong>Port:</strong> {service.port}</p>

            <p style={styles.row}>
              <strong>Status:</strong> <StatusBadge status={service.status} />
            </p>

            <p style={styles.row}><strong>Created At:</strong> {formatDate(service.createdAt)}</p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Deployment Information</h2>

            <p style={styles.row}>
              <strong>Live URL:</strong>{' '}
              {service.serviceUrl && service.status === 'deployed' ? (
                <a
                  href={service.serviceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.link}
                >
                  {service.serviceUrl}
                </a>
              ) : (
                'Not available'
              )}
            </p>

            <p style={styles.row}>
              <strong>Docker Image:</strong>{' '}
              {service.dockerImageName || 'Not available'}
            </p>

            <p style={styles.row}>
              <strong>Docker Container:</strong>{' '}
              {service.dockerContainerName || 'Not available'}
            </p>

            <p style={styles.row}>
              <strong>Deployment Started:</strong>{' '}
              {formatDate(service.lastDeploymentStartedAt)}
            </p>

            <p style={styles.row}>
              <strong>Deployment Finished:</strong>{' '}
              {formatDate(service.lastDeploymentFinishedAt)}
            </p>

            <p style={styles.row}>
              <strong>Last Undeployed:</strong>{' '}
              {formatDate(service.lastUndeployedAt)}
            </p>

            {service.deploymentError && (
              <p style={styles.errorBox}>
                <strong>Deployment Error:</strong> {service.deploymentError}
              </p>
            )}
          </section>

          <div style={styles.footer}>
            <Link to="/dashboard" style={styles.link}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    padding: theme.spacing.page,
    background: theme.colors.background,
    minHeight: '100vh',
    color: theme.colors.text
  },
  card: {
    maxWidth: '850px',
    margin: '0 auto',
    padding: '2rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.large,
    background: theme.colors.cardBackground,
    color: theme.colors.text,
    boxShadow: theme.shadow.card
  },
  title: {
    color: theme.colors.text,
    marginBottom: '0.4rem',
    textAlign: 'center'
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.mutedText,
    marginBottom: '1.5rem'
  },
  section: {
    marginTop: '1.5rem',
    padding: '1.2rem',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.medium,
    background: theme.colors.softBackground
  },
  sectionTitle: {
    fontSize: '1.2rem',
    marginBottom: '1rem',
    color: theme.colors.text
  },
  row: {
    lineHeight: 1.7,
    color: theme.colors.text
  },
  footer: {
    marginTop: '1.5rem',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  link: {
    color: theme.colors.primary,
    textDecoration: 'underline',
    fontWeight: '700'
  },
  info: {
    color: theme.colors.mutedText,
    fontSize: '1rem'
  },
  errorBox: {
    color: theme.colors.danger,
    background: theme.colors.dangerSoft,
    padding: '0.8rem',
    borderRadius: theme.radius.small,
    border: `1px solid ${theme.colors.danger}`
  }
};

export default ServiceDetailsPage;