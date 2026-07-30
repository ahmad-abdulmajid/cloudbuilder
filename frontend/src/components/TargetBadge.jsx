import theme from '../styles/theme';

/**
 * Shows where a service runs.
 * Expects an already-normalized target: 'aws' or 'local'.
 */
function TargetBadge({ target }) {
  const isAws = target === 'aws';

  const style = {
    display: 'inline-block',
    padding: '0.2rem 0.65rem',
    borderRadius: theme.radius.small,
    border: `1px solid ${isAws ? theme.colors.primary : theme.colors.border}`,
    color: isAws ? theme.colors.primary : theme.colors.mutedText,
    background: theme.colors.softBackground,
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap'
  };

  return (
    <span style={style}>
      {isAws ? 'AWS Fargate' : 'Local Docker'}
    </span>
  );
}

export default TargetBadge;
