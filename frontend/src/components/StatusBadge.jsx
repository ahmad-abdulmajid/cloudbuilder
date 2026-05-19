import theme from '../styles/theme';

function StatusBadge({ status }) {
  const getStyle = () => {
    switch (status) {
      case 'created':
        return styles.created;
      case 'building':
        return styles.building;
      case 'pushed':
        return styles.pushed;
      case 'deployed':
        return styles.deployed;
      case 'failed':
        return styles.failed;
      default:
        return styles.default;
    }
  };

  return <span style={{ ...styles.badge, ...getStyle() }}>{status}</span>;
}

const styles = {
  badge: {
    display: 'inline-block',
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    textTransform: 'capitalize'
  },
  created: {
    background: theme.colors.softBackground,
    color: theme.colors.mutedText
  },
  building: {
    background: theme.colors.warningSoft,
    color: theme.colors.warning
  },
  pushed: {
    background: theme.colors.infoSoft,
    color: theme.colors.info
  },
  deployed: {
    background: theme.colors.successSoft,
    color: theme.colors.success
  },
  failed: {
    background: theme.colors.dangerSoft,
    color: theme.colors.danger
  },
  default: {
    background: theme.colors.softBackground,
    color: theme.colors.mutedText
  }
};

export default StatusBadge;