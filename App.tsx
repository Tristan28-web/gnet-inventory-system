
import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Technicians from './pages/Technicians';
import Transactions from './pages/Transactions';
import Audit from './pages/Audit';
import Login from './pages/Login';
import { InventoryItem, Technician, Transaction, InventoryContextType } from './types';
import { apiService } from './services/api';

interface AuthUser {
  email: string;
  role: 'ADMIN' | 'TECHNICIAN';
  name: string;
  id?: string;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within Provider');
  return context;
};

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('gnet-theme');
    return saved ? saved === 'dark' : true;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('gnet-auth-session');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Auth Listener (Simplified for MySQL)
  useEffect(() => {
    const saved = localStorage.getItem('gnet-auth-session');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  // Data State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const location = useLocation();

  // Close sidebar on navigation for mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Sync theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('gnet-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('gnet-theme', 'light');
    }
  }, [isDark]);

  // Data Fetcher
  const refreshData = async () => {
    if (!user) return;
    try {
      const [itemsData, techsData, transData] = await Promise.all([
        apiService.getItems(),
        apiService.getTechnicians(),
        apiService.getTransactions()
      ]);
      setItems(itemsData);
      setTechnicians(techsData);
      setTransactions(transData);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    }
  };

  useEffect(() => {
    if (user) {
      refreshData();
      // Optional: Poll for updates every 30 seconds
      const interval = setInterval(refreshData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const addItem = async (item: Omit<InventoryItem, 'id'>) => {
    await apiService.addItem(item);
    await refreshData();
  };

  const updateItem = async (item: InventoryItem) => {
    await apiService.updateItem(item);
    await refreshData();
  };

  const deleteItem = async (id: string) => {
    await apiService.deleteItem(id);
    await refreshData();
  };

  const addTechnician = async (tech: Omit<Technician, 'id'>) => {
    await apiService.addTechnician(tech);
    await refreshData();
  };

  const deleteTechnician = async (id: string) => {
    await apiService.deleteTechnician(id);
    await refreshData();
  };

  const issueTool = async (itemId: string, techId: string, qty: number, metadata?: any) => {
    const item = items.find(i => i.id === itemId);
    const tech = technicians.find(t => t.id === techId);
    if (!item || !tech) return;

    const newAvailable = item.availableQuantity - qty;

    try {
      await apiService.updateItem({ ...item, availableQuantity: newAvailable });
      await apiService.addTransaction({
        itemId,
        technicianId: techId,
        type: 'ISSUE',
        quantity: qty,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        itemName: item.name,
        technicianName: tech.name,
        ...metadata
      });
      await refreshData();
    } catch (e) {
      console.error("Sync failed:", e);
    }
  };

  const returnTool = async (itemId: string, techId: string, qty: number, metadata?: any) => {
    const item = items.find(i => i.id === itemId);
    const tech = technicians.find(t => t.id === techId);
    if (!item || !tech) return;

    const isDefective = metadata?.condition === 'DEFECTIVE';
    const newAvailable = isDefective ? item.availableQuantity : item.availableQuantity + qty;
    const newDefective = isDefective ? (item.defectiveQuantity || 0) + qty : (item.defectiveQuantity || 0);

    try {
      await apiService.updateItem({ ...item, availableQuantity: newAvailable, defectiveQuantity: newDefective });
      await apiService.addTransaction({
        itemId,
        technicianId: techId,
        type: 'RETURN',
        quantity: qty,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        itemName: item.name,
        technicianName: tech.name,
        ...metadata
      });
      await refreshData();
    } catch (e) {
      console.error("Sync failed:", e);
    }
  };

  const adjustStock = async (itemId: string, newTotal: number, newAvailable: number, reason: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const diffAvailable = newAvailable - item.availableQuantity;

    try {
      await apiService.updateItem({ ...item, totalQuantity: newTotal, availableQuantity: newAvailable });
      await apiService.addTransaction({
        itemId,
        technicianId: 'SYSTEM',
        type: 'ADJUSTMENT',
        quantity: Math.abs(diffAvailable),
        difference: diffAvailable,
        adjustmentReason: reason,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        itemName: item.name,
        technicianName: 'Administrator'
      });
      await refreshData();
    } catch (e) {
      console.error("Sync failed:", e);
    }
  };

  const handleLogin = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem('gnet-auth-session', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('gnet-auth-session');
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleTheme = () => setIsDark(!isDark);

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">Loading...</div>;

  if (!user) {
    return <Login onLogin={handleLogin} isDark={isDark} toggleTheme={toggleTheme} />;
  }

  const userRole = user.role;
  const currentTech = technicians.find(t => t.email?.toLowerCase() === user.email.toLowerCase()) || null;

  return (
    <InventoryContext.Provider value={{ items, technicians, transactions, userRole, currentTech, addItem, updateItem, deleteItem, addTechnician, deleteTechnician, issueTool, returnTool, adjustStock, logout }}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-x-hidden transition-colors duration-300">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} userRole={userRole} />

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
            onClick={toggleSidebar}
          ></div>
        )}

        <main className={`flex-1 min-w-0 p-4 md:p-8 transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <header className="mb-6 flex justify-between items-center bg-white dark:bg-slate-900/60 p-3 md:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md sticky top-4 z-20 shadow-lg dark:shadow-xl transition-colors duration-300">
            <div className="flex items-center space-x-3 md:space-x-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 md:p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <i className="fas fa-bars text-lg md:text-xl font-black"></i>
              </button>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">GNet Inventory</h1>
                <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-bold">Solutions Manager</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                onClick={toggleTheme}
                className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full h-9 w-9 md:h-10 md:w-10 flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-90"
              >
                <i className={`fas ${isDark ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-600'} text-sm md:text-base`}></i>
              </button>

              <div className="relative group" onClick={() => setIsProfileModalOpen(true)}>
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 p-1 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  <div className="bg-blue-600 h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center font-bold text-xs md:text-sm text-white shadow-lg shadow-blue-500/20">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[10px] font-black text-slate-900 dark:text-white leading-tight truncate max-w-[100px]">{user.name}</p>
                    <p className="text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{userRole}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="bg-slate-100 dark:bg-slate-800 h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all active:scale-90"
                title="Logout"
              >
                <i className="fas fa-power-off text-sm md:text-base"></i>
              </button>
            </div>
          </header>

          <div className="max-w-full">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={userRole === 'ADMIN' ? <Inventory /> : <Navigate to="/" />} />
              <Route path="/technicians" element={userRole === 'ADMIN' ? <Technicians /> : <Navigate to="/" />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/audit" element={userRole === 'ADMIN' ? <Audit /> : <Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          technicians={technicians}
        />
      </div>
    </InventoryContext.Provider>
  );
};

const ProfileModal = ({ isOpen, onClose, user, technicians }: { isOpen: boolean, onClose: () => void, user: AuthUser | null, technicians: Technician[] }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (user.role === 'ADMIN') {
        setError('Built-in Admin security keys cannot be updated through the UI currently.');
      } else if (user.id) {
        // Technically we should fetch the full tech object first or just update password
        // For simplicity, we use the technicians list from context
        const tech = technicians.find(t => t.id === user.id);
        if (tech) {
          await apiService.updateTechnician({ ...tech, password });
          setSuccess('Security key updated successfully.');
          setTimeout(onClose, 2000);
        } else {
          setError('Record not found in system.');
        }
      } else {
        setError('Missing user ID.');
      }
    } catch (err: any) {
      setError(err.message || 'Update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-[400px] rounded-[2rem] shadow-2xl p-6 md:p-8 animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-user-shield text-lg"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Security</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">My Account</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 transition-all active:scale-95">
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-100 dark:border-rose-900/50">{error}</div>}
          {success && <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-900/50">{success}</div>}

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">My Email</label>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-400 dark:text-slate-500 text-sm">{user.email}</div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">New Security Key</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm" placeholder="Enter new password" />
          </div>

          <div className="pt-4 flex space-x-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs">Discard</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
              {isLoading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Sidebar = ({ isOpen, toggleSidebar, userRole }: { isOpen: boolean, toggleSidebar: () => void, userRole: 'ADMIN' | 'TECHNICIAN' }) => {
  const location = useLocation();
  const menuItems = [
    { path: '/', label: 'Overview', icon: 'fa-chart-pie' },
    ...(userRole === 'ADMIN' ? [
      { path: '/inventory', label: 'Inventory', icon: 'fa-boxes-stacked' },
      { path: '/technicians', label: 'Technicians', icon: 'fa-user-gear' },
      { path: '/audit', label: 'Audit / Sync', icon: 'fa-clipboard-check' },
    ] : []),
    { path: '/transactions', label: 'My Activity', icon: 'fa-exchange-alt' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 py-8 z-40 transition-all duration-300 ease-in-out shadow-xl lg:shadow-none
      ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-20'}`}>
      <div className={`mb-10 px-4 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && (
          <div className="text-blue-600 dark:text-blue-500 text-2xl font-black flex items-center space-x-2 animate-in fade-in duration-300">
            <i className="fas fa-network-wired"></i>
            <span>GNET</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl ${!isOpen && 'mt-2'}`}
          aria-label="Toggle Sidebar"
        >
          <i className={`fas ${isOpen ? 'fa-indent' : 'fa-bars'} text-xl`}></i>
        </button>
      </div>
      <nav className="space-y-2 px-3">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center rounded-2xl transition-all duration-200 group
                ${isOpen ? 'space-x-3 p-3.5' : 'justify-center p-3.5'}
                ${isActive
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'
                }`}
              title={!isOpen ? item.label : ''}
            >
              <i className={`fas ${item.icon} text-lg w-6 text-center transition-transform group-hover:scale-110`}></i>
              {isOpen && <span className="font-bold text-sm whitespace-nowrap animate-in slide-in-from-left-2 duration-300">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

const AppWrapper = () => (
  <HashRouter>
    <App />
  </HashRouter>
);

export default AppWrapper;
