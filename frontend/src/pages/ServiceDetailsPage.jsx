import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import theme from '../styles/theme';

function ServiceDetailsPage() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchService = useCallback(async () => {
    try {
      const response = await api.get(`/services/${id}`);
      setService(response.data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  const handleRedeploy = async () => {
    setActionLoading(true);
    setError('');

    try {
      await api.post(`/services/${id}/redeploy`);
      await fetchService();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

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

  const formatDuration = (startedAt, finishedAt) => {
    if (!startedAt || !finishedAt) {
      return '—';
    }

    const seconds = Math.round((new Date(finishedAt) - new Date(startedAt)) / 1000);

    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const statusColor = (status) => {
    if (status === 'failed') return theme.colors.danger;
    if (status === 'success') return theme.colors.primary;
    return theme.colors.mutedText; // in-progress or unknown
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

  const history = [...(service.deploymentHistory || [])].sort(
    (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
  );
  const historyWithErrors = history.filter((record) => record.error);

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>{service.name}</h1>
          <p style={styles.subtitle}>Detailed deployment information for this service.</p>

          {error && <p style={styles.errorBox}>{error}</p>}

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

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Deployment History</h2>

            {history.length === 0 ? (
              <p style={styles.info}>No deployment history yet.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Started</th>
                    <th style={styles.th}>Finished</th>
                    <th style={styles.th}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td style={styles.td}>{record.type}</td>
                      <td style={{ ...styles.td, color: statusColor(record.status), fontWeight: '600' }}>
                        {record.status}
                      </td>
                      <td style={styles.td}>{formatDate(record.startedAt)}</td>
                      <td style={styles.td}>{formatDate(record.finishedAt)}</td>
                      <td style={styles.td}>{formatDuration(record.startedAt, record.finishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {historyWithErrors.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {historyWithErrors.map((record) => (
                  <p key={record.id} style={styles.errorBox}>
                    <strong>{record.type} error ({formatDate(record.startedAt)}):</strong> {record.error}
                  </p>
                ))}
              </div>
            )}
          </section>

          <div style={styles.footer}>
            <Link to="/dashboard" style={styles.link}>
              Back to Dashboard
            </Link>

            <button
              onClick={handleRedeploy}
              disabled={actionLoading || service.status === 'building'}
              style={{
                ...styles.button,
                ...(actionLoading || service.status === 'building' ? styles.buttonDisabled : {})
              }}
            >
              {actionLoading || service.status === 'building' ? 'Redeploying...' : 'Redeploy'}
            </button>
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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '0.5rem'
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem',
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.mutedText,
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em'
  },
  td: {
    padding: '0.5rem',
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.text
  },
  footer: {
    marginTop: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  link: {
    color: theme.colors.primary,
    textDecoration: 'underline',
    fontWeight: '700'
  },
  button: {
    padding: '0.6rem 1.4rem',
    border: 'none',
    borderRadius: theme.radius.small,
    background: theme.colors.primary,
    color: '#fff',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer'
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
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
