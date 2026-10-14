import { useEffect, useState } from 'react';
import {
  AppBar, Badge, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Toolbar, Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LogoutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, homeForRole } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import BackButton from '../components/BackButton';

const drawerWidth = 260;

export default function DashboardLayout({ items }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [anchor, setAnchor] = useState(null);
  const { user, logout } = useAuth();
  const { platformName } = useConfig();
  const navigate = useNavigate();

  async function loadNotes() {
    const response = await api.get('/notifications');
    setNotes(response.data.data);
  }

  useEffect(() => {
    loadNotes().catch(() => {});
    const timer = setInterval(() => loadNotes().catch(() => {}), 60000);
    return () => clearInterval(timer);
  }, []);

  const unread = notes.filter((note) => !note.readAt).length;

  async function signOut() {
    await logout();
    navigate('/');
  }
  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 2.5 }}>
        <Typography fontWeight={800}>{platformName || 'ServiceNest'}</Typography>
        <Typography variant="caption" color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{user?.role} console</Typography>
      </Box>
      <Divider />
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            sx={{ '&.active': { bgcolor: 'rgba(15,118,110,0.08)', color: 'primary.main' } }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: 'auto' }}>
      <Divider />
      <List>
        <ListItemButton component={NavLink} to="/" end onClick={() => setMobileOpen(false)}>
          <ListItemIcon sx={{ minWidth: 40 }}><StorefrontIcon /></ListItemIcon>
          <ListItemText primary="Marketplace" />
        </ListItemButton>
        <ListItemButton onClick={signOut}>
          <ListItemIcon sx={{ minWidth: 40 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Log out" />
        </ListItemButton>
      </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ width: { md: `calc(100% - ${drawerWidth}px)` }, ml: { md: `${drawerWidth}px` } }}>
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }} aria-label="Open navigation">
            <MenuIcon />
          </IconButton>
          <BackButton fallback={homeForRole(user?.role)} />
          <Button component={NavLink} to="/" end color="inherit">Home</Button>
          <Typography sx={{ flex: 1 }} color="text.secondary">{user?.name}</Typography>
          <IconButton aria-label="Notifications" onClick={(event) => setAnchor(event.currentTarget)}>
            <Badge color="error" badgeContent={unread}><NotificationsNoneIcon /></Badge>
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            {notes.length === 0 ? <MenuItem disabled>No notifications yet</MenuItem> : notes.slice(0, 8).map((note) => (
              <MenuItem key={note.id} onClick={async () => {
                await api.patch(`/notifications/${note.id}/read`).catch(() => {});
                setAnchor(null);
                if (note.link) navigate(note.link);
                loadNotes().catch(() => {});
              }}>
                <Box sx={{ maxWidth: 280 }}>
                  <Typography fontWeight={note.readAt ? 500 : 800}>{note.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{note.body}</Typography>
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem onClick={signOut}>Log out</MenuItem>
          </Menu>
          <Button variant="contained" color="secondary" onClick={signOut}>Log out</Button>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}>
          {drawer}
        </Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, width: { md: `calc(100% - ${drawerWidth}px)` }, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
