import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReviewsIcon from '@mui/icons-material/Reviews';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CategoryIcon from '@mui/icons-material/Category';
import GavelIcon from '@mui/icons-material/Gavel';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ServicesPage from './pages/ServicesPage';
import ProviderProfilePage from './pages/ProviderProfilePage';
import BookingPage from './pages/BookingPage';
import BookingDetailPage from './pages/BookingDetailPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import AddressesPage from './pages/customer/AddressesPage';
import ProfilePage from './pages/customer/ProfilePage';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderJobsPage from './pages/provider/ProviderJobsPage';
import AvailabilityPage from './pages/provider/AvailabilityPage';
import ListingsPage from './pages/provider/ListingsPage';
import EarningsPage from './pages/provider/EarningsPage';
import ProviderReviewsPage from './pages/provider/ProviderReviewsPage';
import VerificationPage from './pages/provider/VerificationPage';
import ProviderSettingsPage from './pages/provider/ProviderSettingsPage';
import {
  AdminBookings, AdminCategories, AdminDashboard, AdminDisputes, AdminPlans, AdminProviders, AdminRevenue, AdminSettings, AdminUsers,
} from './pages/admin/AdminPages';

const customerNav = [
  { to: '/dashboard', label: 'Overview', icon: <DashboardIcon />, end: true },
  { to: '/dashboard/bookings', label: 'Bookings', icon: <EventIcon /> },
  { to: '/dashboard/addresses', label: 'Addresses', icon: <HomeIcon /> },
  { to: '/dashboard/profile', label: 'Profile', icon: <PersonIcon /> },
];

const providerNav = [
  { to: '/provider', label: 'Today', icon: <DashboardIcon />, end: true },
  { to: '/provider/jobs', label: 'Jobs', icon: <WorkIcon /> },
  { to: '/provider/availability', label: 'Availability', icon: <ScheduleIcon /> },
  { to: '/provider/services', label: 'Services', icon: <StorefrontIcon /> },
  { to: '/provider/earnings', label: 'Earnings', icon: <PaymentsIcon /> },
  { to: '/provider/reviews', label: 'Reviews', icon: <ReviewsIcon /> },
  { to: '/provider/verification', label: 'Verification', icon: <VerifiedUserIcon /> },
  { to: '/provider/profile', label: 'Profile', icon: <PersonIcon /> },
];

const adminNav = [
  { to: '/admin', label: 'Overview', icon: <DashboardIcon />, end: true },
  { to: '/admin/providers', label: 'Providers', icon: <VerifiedUserIcon /> },
  { to: '/admin/users', label: 'Users', icon: <GroupIcon /> },
  { to: '/admin/bookings', label: 'Bookings', icon: <EventIcon /> },
  { to: '/admin/disputes', label: 'Disputes', icon: <GavelIcon /> },
  { to: '/admin/categories', label: 'Categories', icon: <CategoryIcon /> },
  { to: '/admin/plans', label: 'Plans', icon: <StorefrontIcon /> },
  { to: '/admin/revenue', label: 'Revenue', icon: <PaymentsIcon /> },
  { to: '/admin/settings', label: 'Settings', icon: <SettingsIcon /> },
];

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="providers/:id" element={<ProviderProfilePage />} />
        <Route path="book/:providerId" element={<BookingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['customer']} />}>
        <Route element={<DashboardLayout items={customerNav} />}>
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="dashboard/bookings" element={<CustomerDashboard />} />
          <Route path="dashboard/bookings/:id" element={<BookingDetailPage />} />
          <Route path="dashboard/addresses" element={<AddressesPage />} />
          <Route path="dashboard/profile" element={<ProfilePage />} />
        </Route>
        <Route path="bookings/:id/confirmation" element={<PublicLayout />}>
          <Route index element={<BookingDetailPage confirmation />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['provider']} />}>
        <Route element={<DashboardLayout items={providerNav} />}>
          <Route path="provider" element={<ProviderDashboard />} />
          <Route path="provider/jobs" element={<ProviderJobsPage />} />
          <Route path="provider/jobs/:id" element={<BookingDetailPage />} />
          <Route path="provider/availability" element={<AvailabilityPage />} />
          <Route path="provider/services" element={<ListingsPage />} />
          <Route path="provider/earnings" element={<EarningsPage />} />
          <Route path="provider/reviews" element={<ProviderReviewsPage />} />
          <Route path="provider/verification" element={<VerificationPage />} />
          <Route path="provider/profile" element={<ProviderSettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<DashboardLayout items={adminNav} />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/providers" element={<AdminProviders />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/bookings" element={<AdminBookings />} />
          <Route path="admin/bookings/:id" element={<BookingDetailPage />} />
          <Route path="admin/disputes" element={<AdminDisputes />} />
          <Route path="admin/categories" element={<AdminCategories />} />
          <Route path="admin/plans" element={<AdminPlans />} />
          <Route path="admin/revenue" element={<AdminRevenue />} />
          <Route path="admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
