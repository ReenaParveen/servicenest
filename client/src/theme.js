import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#0F766E', dark: '#115E59', light: '#14B8A6', contrastText: '#ffffff' },
    secondary: { main: '#1E3A5F' },
    background: { default: '#F4F7F7', paper: '#FFFFFF' },
    text: { primary: '#12202B', secondary: '#52616B' },
    success: { main: '#15803D' },
    warning: { main: '#B45309' },
    error: { main: '#B91C1C' },
    divider: '#E2E8E8',
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.04em' },
    h2: { fontWeight: 800, letterSpacing: '-0.03em' },
    h3: { fontWeight: 750, letterSpacing: '-0.02em' },
    h4: { fontWeight: 750 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, border: '1px solid #E2E8E8', boxShadow: '0 8px 24px rgba(18, 32, 43, 0.04)' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: '#ffffff', color: '#12202B', boxShadow: 'none', borderBottom: '1px solid #E2E8E8' },
      },
    },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: '#fff' } } },
  },
});

export default theme;
