import theme from '../styles/theme';

const STATUS_CONFIG = {
  created: {
    label: 'Created',
    icon: '\u25CB',
    description: 'Service registered but not deployed yet.',
    background: theme.colors.softBackground,
    color: theme.colors.mutedText,
    animated: false
  },
  building: {
    label: 'Building',
    icon: '\u25CF',
    description: 'Cloning repository and building the Docker image.',
    background: theme.colors.warningSoft,
    color: theme.colors.warning,
    animated: true
  },
  pushed: {
    label: 'Pushed',
    icon: '\u2191',
    description: 'Image uploaded to the registry, starting the container.',
    background: theme.colors.infoSoft,
    color: theme.colors.info,
    animated: true
  },
  deployed: {
    label: 'Deployed',
    icon: '\u2713',
    description: 'Service is running and reachable.',
    background: theme.colors.successSoft,
    color: theme.colors.success,
    animated: false
  },
  failed: {
    label: 'Failed',
    icon: '\u2715',
    description: 'The last deployment did not complete successfully.',
    background: theme.colors.dangerSoft,
    color: theme.colors.danger,
    animated: false
  }
};

const FALLBACK_CONFIG = {
  label: 'Unknown',
  icon: '?',
  description: 'Status not recognised.',
  background: theme.colors.softBackground,
  color: theme.colors.mutedText,
  animated: false
};

function DeploymentStatus({ status, compact = false }) {
  const config = STATUS_CONFIG[status] || FALLBACK_CONFIG;

  const badge = (
    <span
      style={{
        ...styles.badge,
        ...(compact ? styles.badgeCompact : {}),
        background: config.background,
        color: config.color
      }}
    >
      <span
        style={{
          ...styles.icon,
          ...(config.animated ? styles.iconAnimated : {})
        }}
      >
        {config.icon}
      </span>
      {config.label}
    </span>
  );

  if (compact) {
    return (
      <>
        <style>{keyframes}</style>
        {badge}
      </>
    );
  }

  return (
    <>
      <style>{keyframes}</style>
      <div style={styles.wrapper}>
        {badge}
        <span style={styles.description}>{config.description}</span>
      </div>
    </>
  );
}

const keyframes = `
  @keyframes cloudbuilder-status-pulse {
    0%   { opacity: 1;   transform: scale(1); }
    50%  { opacity: 0.35; transform: scale(0.8); }
    100% { opacity: 1;   transform: scale(1); }
  }
`;

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.35rem 0.85rem',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  badgeCompact: {
    padding: '0.25rem 0.6rem',
    fontSize: '0.8rem'
  },
  icon: {
    display: 'inline-block',
    fontSize: '0.85em',
    lineHeight: 1
  },
  iconAnimated: {
    animation: 'cloudbuilder-status-pulse 1.2s ease-in-out infinite'
  },
  description: {
    color: theme.colors.mutedText,
    fontSize: '0.85rem'
  }
};

export default DeploymentStatus;
