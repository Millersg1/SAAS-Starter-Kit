import { createContext, useState, useContext, useEffect } from 'react';
import { portalAuthAPI, portalAPI } from '../services/portalApi';

const PortalAuthContext = createContext(null);

export const PortalAuthProvider = ({ children }) => {
  const [portalClient, setPortalClient] = useState(null);
  const [portalBrand, setPortalBrand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    const savedClient = localStorage.getItem('portal_client');
    const savedBrand = localStorage.getItem('portal_brand');

    if (token && savedClient && savedBrand) {
      try {
        setPortalClient(JSON.parse(savedClient));
        setPortalBrand(JSON.parse(savedBrand));
        verifyPortalToken();
      } catch {
        clearPortalStorage();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const verifyPortalToken = async () => {
    try {
      const response = await portalAPI.getMe();
      const client = response.data.data.client;
      setPortalClient(client);
      localStorage.setItem('portal_client', JSON.stringify(client));
    } catch {
      clearPortalStorage();
    } finally {
      setLoading(false);
    }
  };

  const clearPortalStorage = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_client');
    localStorage.removeItem('portal_brand');
    setPortalClient(null);
    setPortalBrand(null);
  };

  const portalLogin = async (email, password, brandId) => {
    try {
      const response = await portalAuthAPI.login({ email, password, brandId });
      const { token, client, brand } = response.data.data;

      localStorage.setItem('portal_token', token);
      localStorage.setItem('portal_client', JSON.stringify(client));
      localStorage.setItem('portal_brand', JSON.stringify(brand));

      setPortalClient(client);
      setPortalBrand(brand);

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const portalLogout = () => {
    clearPortalStorage();
    window.location.href = '/portal/login';
  };

  const value = {
    portalClient,
    portalBrand,
    loading,
    portalLogin,
    portalLogout,
    isPortalAuthenticated: !!portalClient,
  };

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
};

export const usePortalAuth = () => {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  }
  return context;
};

export default PortalAuthContext;
