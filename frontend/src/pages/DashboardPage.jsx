import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import theme from '../styles/theme';

function DashboardPage() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deployingId, setDeployingId] = useState(null);
  const [stoppingId, setStoppingId] = useState(null);

  const fetchServices = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await api.get('/services');
      setServices(response.data);
      setError('');

      return response.data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const pollServiceStatus = (id) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await api.get(`/services/${id}`);
        const updatedService = response.data;

        setServices((prevServices) =>
          prevServices.map((service) =>
            service.id === id ? updatedService : service
          )
        );

        if (
          updatedService.status === 'deployed' ||
          updatedService.status === 'failed'
        ) {
          clearInterval(intervalId);
          setDeployingId(null);
        }
      } catch (err) {
        clearInterval(intervalId);
        setDeployingId(null);
        setError(err.message);
      }
    }, 3000);
  };

  const handleDeploy = async (id) => {
    try {
      setDeployingId(id);
      setError('');

      const response = await api.post(`/services/${id}/deploy`);

      setServices((prevServices) =>
        prevServices.map((service) =>
          service.id === id ? response.data.service : service
        )
      );

      pollServiceStatus(id);
    } catch (err) {
      setError(err.message);
      setDeployingId(null);
    }
  };

  const handleUndeploy = async (id) => {
    const confirmed = window.confirm('Are you sure you want to undeploy this service?');

    if (!confirmed) {
      return;
    }

    try {
      setStoppingId(id);
      setError('');

      const response = await api.post(`/services/${id}/stop`);

      setServices((prevServices) =>
        prevServices.map((service) =>
          service.id === id ? response.data.service : service
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setStoppingId(null);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this service?');

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/services/${id}`);
      setServices((prevServices) =>
        prevServices.filter((service) => service.id !== id)
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Manage and deploy your Docker-based services.</p>
          </div>
        </div>

        {loading && <p style={styles.info}>Loading services...</p>}
        {error && <p style={styles.errorBox}>{error}</p>}

        {!loading && !error && services.length === 0 && (
          <p style={styles.info}>No services created yet.</p>
        )}

        {!loading && !error && services.length > 0 && (
          <div style={styles.list}>
            {[...services].reverse().map((service) => (
              <div key={service.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.serviceName}>{service.name}</h3>
                  <StatusBadge status={service.status} />
                </div>

                <p style={styles.metaText}>
                  <strong>Repo:</strong> {service.repoUrl}
                </p>

                <p style={styles.metaText}>
                  <strong>Port:</strong> {service.port}
                </p>

                {service.serviceUrl && service.status === 'deployed' && (
                  <p style={styles.metaText}>
                    <strong>Live URL:</strong>{' '}
                    <a
                      href={service.serviceUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.liveLink}
                    >
                      {service.serviceUrl}
                    </a>
                  </p>
                )}

                {service.deploymentError && service.status === 'failed' && (
                  <p style={styles.errorBox}>
                    <strong>Error:</strong> {service.deploymentError}
                  </p>
                )}

                <div style={styles.actions}>
                  <Link to={`/services/${service.id}`} style={styles.detailsLink}>
                    View Details
                  </Link>

                  <button
                    onClick={() => handleDeploy(service.id)}
                    disabled={deployingId === service.id || service.status === 'building'}
                    style={{
                      ...styles.deployButton,
                      ...(deployingId === service.id || service.status === 'building'
                        ? styles.disabledButton
                        : {})
                    }}
                  >
                    {deployingId === service.id || service.status === 'building'
                      ? 'Deploying...'
                      : 'Deploy'}
                  </button>

                  {service.status === 'deployed' && (
                    <button
                      onClick={() => handleUndeploy(service.id)}
                      disabled={stoppingId === service.id}
                      style={{
                        ...styles.undeployButton,
                        ...(stoppingId === service.id ? styles.disabledButton : {})
                      }}
                    >
                      {stoppingId === service.id ? 'Undeploying...' : 'Undeploy'}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(service.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const baseButton = {
  padding: '0.55rem 0.95rem',
  cursor: 'pointer',
  color: '#fff',
  border: 'none',
  borderRadius: theme.radius.small,
  fontWeight: '600'
};

const styles = {
  container: {
    padding: theme.spacing.page,
    background: theme.colors.background,
    minHeight: '100vh',
    color: theme.colors.text
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    margin: 0,
    color: theme.colors.text
  },
  subtitle: {
    marginTop: '0.4rem',
    color: theme.colors.mutedText
  },
  list: {
    display: 'grid',
    gap: '1rem',
    marginTop: '1rem'
  },
  card: {
    padding: theme.spacing.card,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.large,
    background: theme.colors.cardBackground,
    color: theme.colors.text,
    boxShadow: theme.shadow.card
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  serviceName: {
    margin: 0,
    color: theme.colors.text
  },
  metaText: {
    color: theme.colors.text,
    lineHeight: 1.6
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    marginTop: '1.25rem',
    flexWrap: 'wrap'
  },
  detailsLink: {
    color: theme.colors.primary,
    textDecoration: 'underline',
    fontWeight: '700'
  },
  deployButton: {
    ...baseButton,
    background: theme.colors.primary
  },
  undeployButton: {
    ...baseButton,
    background: theme.colors.warning
  },
  deleteButton: {
    ...baseButton,
    background: theme.colors.danger
  },
  disabledButton: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  liveLink: {
    color: theme.colors.primary,
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

export default DashboardPage;