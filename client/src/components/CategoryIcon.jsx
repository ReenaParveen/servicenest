import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import PlumbingIcon from '@mui/icons-material/Plumbing';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import KitchenIcon from '@mui/icons-material/Kitchen';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import ConstructionIcon from '@mui/icons-material/Construction';
import SchoolIcon from '@mui/icons-material/School';
import BugReportIcon from '@mui/icons-material/BugReport';
import HandymanIcon from '@mui/icons-material/Handyman';

const ICONS = {
  ElectricalServices: ElectricalServicesIcon,
  Plumbing: PlumbingIcon,
  AcUnit: AcUnitIcon,
  CleaningServices: CleaningServicesIcon,
  Kitchen: KitchenIcon,
  FormatPaint: FormatPaintIcon,
  Construction: ConstructionIcon,
  School: SchoolIcon,
  BugReport: BugReportIcon,
  Handyman: HandymanIcon,
};

export default function CategoryIcon({ name, ...props }) {
  const Icon = ICONS[name] || HandymanIcon;
  return <Icon {...props} />;
}
