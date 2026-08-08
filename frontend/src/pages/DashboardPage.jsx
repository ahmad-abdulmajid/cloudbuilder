import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { TRANSITIONAL_STATUSES } from '../components/DeploymentStatus';
import theme from '../styles/theme';

function DashboardPage() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deployingId, setDeployingId] = useState(null);
  const [stoppingId, setStoppingId] = useState(null);

  // Rename state. Only one service can be edited at a time, so a single
  // id plus a single draft string is enough — no per-card state needed.
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  // Kept separate from the page-level error: a rejected name belongs next
  // to the input that produced it, not in the banner at the top of the page.
  const [renameError, setRenameError] = useState('');

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

  const startEditing = (service) => {
    setEditingId(service.id);
    setDraftName(service.name);
    setRenameError('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName('');
    setRenameError('');
  };

  const handleRename = async (service) => {
    const trimmedName = draftName.trim();

    if (!trimmedName) {
      setRenameError('Name cannot be empty');
      return;
    }

    // Nothing changed, so there is no reason to spend a request on it.
    if (trimmedName === service.name) {
      cancelEditing();
      return;
    }

    try {
      setRenamingId(service.id);
      setRenameError('');

      const response = await api.patch(`/services/${service.id}/rename`, {
        name: trimmedName
      });

      // Same pattern as deploy and undeploy: replace the one service the
      // server sent back rather than refetching the whole list.
      setServices((prevServices) =>
        prevServices.map((s) =>
          s.id === service.id ? response.data.service : s
        )
      );

      cancelEditing();
    } catch (err) {
      // Leaves the input open with the rejected text still in it, so the
      // user can correct it instead of retyping from scratch.
      setRenameError(err.message);
    } finally {
      setRenamingId(null);
    }
  };

  const handleRenameKeyDown = (event, service) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleRename(service);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
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

  // Derived, not stored: both values are pure functions of state that
  // already exists (deployingId plus the service's own status), so the
  // button can never disagree with the service it belongs to. Same
  // principle as isDeploying on the details page — written as functions
  // here because the dashboard renders many services, not one.
  const isServiceDeploying = (service) =>
    deployingId === service.id ||
    TRANSITIONAL_STATUSES.includes(service.status);

  const deployButtonLabel = (service) => {
    if (isServiceDeploying(service)) {
      return 'Deploying...';
    }

    return service.status === 'deployed' ? 'Redeploy' : 'Deploy';
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
                  {editingId === service.id ? (
                    <div style={styles.editWrapper}>
                      <div style={styles.editRow}>
                        <input
                          type="text"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => handleRenameKeyDown(e, service)}
                          disabled={renamingId === service.id}
                          maxLength={100}
                          autoFocus
                          style={styles.nameInput}
                        />

                        <button
                          onClick={() => handleRename(service)}
                          disabled={renamingId === service.id}
                          style={{
                            ...styles.saveButton,
                            ...(renamingId === service.id ? styles.disabledButton : {})
                          }}
                        >
                          {renamingId === service.id ? 'Saving...' : 'Save'}
                        </button>

                        <button
                          onClick={cancelEditing}
                          disabled={renamingId === service.id}
                          style={{
                            ...styles.cancelButton,
                            ...(renamingId === service.id ? styles.disabledButton : {})
                          }}
                        >
                          Cancel
                        </button>
                      </div>

                      {renameError && (
                        <p style={styles.inlineError}>{renameError}</p>
                      )}
                    </div>
                  ) : (
                    <div style={styles.nameRow}>
                      <h3 style={styles.serviceName}>{service.name}</h3>

                      <button
                        onClick={() => startEditing(service)}
                        style={styles.renameButton}
                        title="Rename this service"
                      >
                        Rename
                      </button>
                    </div>
                  )}

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
                    disabled={isServiceDeploying(service)}
                    style={{
                      ...styles.deployButton,
                      ...(isServiceDeploying(service) ? styles.disabledButton : {})
                    }}
                  >
                    {deployButtonLabel(service)}
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
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1rem'
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  serviceName: {
    margin: 0,
    color: theme.colors.text
  },
  editWrapper: {
    flex: 1,
    minWidth: 0
  },
  editRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  nameInput: {
    flex: 1,
    minWidth: '12rem',
    padding: '0.5rem 0.7rem',
    background: theme.colors.background,
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.small,
    fontSize: '1rem',
    fontWeight: '600'
  },
  renameButton: {
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    background: 'transparent',
    color: theme.colors.mutedText,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.small,
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  saveButton: {
    ...baseButton,
    padding: '0.5rem 0.9rem',
    background: theme.colors.primary
  },
  cancelButton: {
    padding: '0.5rem 0.9rem',
    cursor: 'pointer',
    background: 'transparent',
    color: theme.colors.mutedText,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.small,
    fontWeight: '600'
  },
  inlineError: {
    margin: '0.5rem 0 0',
    color: theme.colors.danger,
    fontSize: '0.85rem'
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
