import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function BackButton({ fallback = '/', label = 'Back' }) {
  const navigate = useNavigate();
  return (
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={() => {
        const index = window.history.state?.idx;
        if (typeof index === 'number' && index > 0) navigate(-1);
        else navigate(fallback);
      }}
    >
      {label}
    </Button>
  );
}
