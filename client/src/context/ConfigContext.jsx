import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const ConfigContext = createContext({ platformName: 'ServiceNest', loading: true });

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({ platformName: 'ServiceNest', loading: true });

  useEffect(() => {
    api.get('/config/public')
      .then((response) => setConfig({ ...response.data.data, loading: false }))
      .catch(() => setConfig((current) => ({ ...current, loading: false })));
  }, []);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
