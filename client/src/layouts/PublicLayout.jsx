import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import HomeRepairServiceIcon from '@mui/icons-material/HomeRepairService';
import { useAuth, homeForRole } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import BackButton from '../components/BackButton';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { platformName } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const atHome = location.pathname === '/';

  async function signOut() {
    await logout();
    navigate('/');
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a className="skip-link" href="#main">Skip to content</a>
      <AppBar position="sticky">
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 1, minHeight: 72, flexWrap: 'wrap', py: 1 }}>
            {!atHome ? <BackButton /> : null}
            <Stack direction="row" spacing={1} alignItems="center" component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit', mr: 'auto' }}>
              <HomeRepairServiceIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>{platformName || 'ServiceNest'}</Typography>
            </Stack>
            <Button component={RouterLink} to="/services" color="inherit">Services</Button>
            <Button component={RouterLink} to="/" color="inherit">Home</Button>
            {user ? (
              <>
                <Button component={RouterLink} to={homeForRole(user.role)} variant="outlined">Dashboard</Button>
                <Button variant="contained" color="secondary" onClick={signOut}>Log out</Button>
              </>
            ) : (
              <>
                <Button component={RouterLink} to="/login" variant="outlined">Log in</Button>
                <Button component={RouterLink} to="/register" variant="contained">Sign up</Button>
              </>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <Box id="main" component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', py: 5, mt: 2, bgcolor: '#10262A', color: '#fff' }}>
        <Container maxWidth="lg" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography fontWeight={800} sx={{ color: '#fff' }}>{platformName || 'ServiceNest'}</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,0.75)', maxWidth: 420 }}>
              A local services marketplace for booking verified independent professionals. Promoted listings are advertising and are not the same as verification.
            </Typography>
          </Box>
          <Stack spacing={0.5}>
            <Typography variant="overline" sx={{ color: '#99F6E4' }}>Explore</Typography>
            <Button component={RouterLink} to="/services" sx={{ color: '#fff', justifyContent: 'flex-start', px: 0 }}>Browse services</Button>
            <Button component={RouterLink} to="/#how-it-works" sx={{ color: '#fff', justifyContent: 'flex-start', px: 0 }}>How it works</Button>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="overline" sx={{ color: '#99F6E4' }}>Providers</Typography>
            <Button component={RouterLink} to="/register?role=provider" sx={{ color: '#fff', justifyContent: 'flex-start', px: 0 }}>List your service</Button>
            {user ? (
              <Button onClick={signOut} sx={{ color: '#fff', justifyContent: 'flex-start', px: 0 }}>Log out</Button>
            ) : (
              <Button component={RouterLink} to="/login" sx={{ color: '#fff', justifyContent: 'flex-start', px: 0 }}>Log in</Button>
            )}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
