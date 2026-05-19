import { Link, useNavigate } from 'react-router-dom';
import theme from '../styles/theme';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>CloudBuilder</div>

      <div style={styles.links}>
        <Link to="/dashboard" style={styles.link}>Dashboard</Link>
        <Link to="/services/new" style={styles.link}>Create Service</Link>
        <button onClick={handleLogout} style={styles.button}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: theme.colors.text,
    color: '#fff',
    borderBottom: `1px solid ${theme.colors.border}`
  },
  brand: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    letterSpacing: '0.3px'
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  link: {
    color: '#fff',
    textDecoration: 'none',
    fontWeight: '600'
  },
  button: {
    background: theme.colors.cardBackground,
    color: theme.colors.text,
    border: 'none',
    borderRadius: theme.radius.small,
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontWeight: '600'
  }
};

export default Navbar;