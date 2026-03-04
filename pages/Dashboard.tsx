
import * as React from 'react';
import { useMemo } from 'react';
import { useInventory } from '../App';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

const Dashboard: React.FC = () => {
  const { items, transactions, userRole, currentTech } = useInventory();

  const stats = useMemo(() => {
    const total = items.reduce((acc, i) => acc + i.totalQuantity, 0);
    const available = items.reduce((acc, i) => acc + i.availableQuantity, 0);
    const defective = items.reduce((acc, i) => acc + (i.defectiveQuantity || 0), 0);
    const borrowed = Math.max(0, total - available - defective);
    const lowStock = items.filter(i => i.availableQuantity <= i.lowStockThreshold).length;

    return { total, available, defective, borrowed, lowStock };
  }, [items]);

  const chartData = useMemo(() => {
    return items.map(i => ({
      name: i.name,
      available: i.availableQuantity,
      total: i.totalQuantity
    }));
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [items]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const techVanStock = useMemo(() => {
    if (userRole !== 'TECHNICIAN' || !currentTech) return [];

    const techTransactions = transactions.filter(t => t.technicianId === currentTech.id);
    const stockMap: Record<string, { id: string, name: string, quantity: number, unit: string }> = {};

    techTransactions.forEach(t => {
      if (!stockMap[t.itemId]) {
        stockMap[t.itemId] = { id: t.itemId, name: t.itemName, quantity: 0, unit: items.find(i => i.id === t.itemId)?.unit || 'pcs' };
      }
      if (t.type === 'ISSUE') stockMap[t.itemId].quantity += t.quantity;
      if (t.type === 'RETURN') stockMap[t.itemId].quantity -= t.quantity;
    });

    return Object.values(stockMap).filter(s => s.quantity > 0);
  }, [userRole, currentTech, transactions, items]);

  const personalStats = useMemo(() => {
    const totalItems = techVanStock.reduce((acc, s) => acc + s.quantity, 0);
    const myTransactions = transactions.filter(t => t.technicianId === currentTech?.id);
    const recentIssues = myTransactions.filter(t => t.type === 'ISSUE').length;

    return { totalItems, recentIssues };
  }, [techVanStock, transactions, currentTech]);

  const filteredTransactions = useMemo(() => {
    if (userRole === 'ADMIN') return transactions;
    return transactions.filter(t => t.technicianId === currentTech?.id);
  }, [userRole, transactions, currentTech]);

  if (userRole === 'TECHNICIAN') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <StatCard title="My Van Stock" value={personalStats.totalItems} icon="fa-truck-ramp-box" color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50 dark:bg-blue-400/10" />
          <StatCard title="Total Checkouts" value={personalStats.recentIssues} icon="fa-arrow-right-from-bracket" color="text-amber-600 dark:text-amber-400" bgColor="bg-amber-50 dark:bg-amber-400/10" />
          <StatCard title="Personnel Profile" value={currentTech?.department || 'Technician'} icon="fa-id-card" color="text-indigo-600 dark:text-indigo-400" bgColor="bg-indigo-50 dark:bg-indigo-400/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group mb-6">
            <div className="relative z-10">
              <h3 className="text-lg font-black uppercase tracking-widest mb-4 flex items-center">
                <i className="fas fa-bolt-lightning mr-2"></i> Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    localStorage.setItem('quick_tx_mode', 'ISSUE');
                    window.location.hash = '#/transactions';
                  }}
                  className="bg-white/10 hover:bg-orange-500/30 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 border border-white/5 group/btn"
                >
                  <div className="h-10 w-10 bg-orange-500/20 rounded-xl flex items-center justify-center mb-2 group-hover/btn:scale-110 transition-transform">
                    <i className="fas fa-arrow-right-from-bracket text-orange-400"></i>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-tight text-orange-100">Checkout<br />(Scanner)</span>
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('quick_tx_mode', 'RETURN');
                    window.location.hash = '#/transactions';
                  }}
                  className="bg-white/10 hover:bg-emerald-500/30 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 border border-white/5 group/btn"
                >
                  <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-2 group-hover/btn:scale-110 transition-transform">
                    <i className="fas fa-arrow-right-to-bracket text-emerald-400"></i>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-center leading-tight text-emerald-100">Return<br />(Scanner)</span>
                </button>
                <button
                  onClick={() => {
                    const headers = ['Asset Name', 'Quantity', 'Unit'];
                    const rows = techVanStock.map(s => [s.name, s.quantity.toString(), s.unit]);
                    const csv = ['\uFEFF' + headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `my_van_stock_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  className="col-span-2 bg-white/5 hover:bg-white/10 backdrop-blur-md p-3 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 border border-white/5 mt-1"
                >
                  <i className="fas fa-file-export text-lg text-blue-400"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Export My Van Stock (CSV)</span>
                </button>
              </div>
            </div>
            <i className="fas fa-truck-fast absolute -bottom-10 -right-4 text-9xl transform -rotate-12 opacity-10 group-hover:scale-110 transition-transform duration-700"></i>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Current Van Inventory</h3>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">Active Stock</span>
            </div>

            <div className="space-y-3">
              {techVanStock.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 active:scale-[0.99]">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700">
                      <i className="fas fa-box text-sm"></i>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">{item.name}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Assigned Asset</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xl text-slate-900 dark:text-white">{item.quantity}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.unit}</div>
                  </div>
                </div>
              ))}
              {techVanStock.length === 0 && (
                <div className="py-20 text-center">
                  <div className="h-12 w-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <i className="fas fa-boxes"></i>
                  </div>
                  <p className="text-slate-400 font-bold">Your van is currently empty.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col items-center justify-center text-center">
            <div className="h-24 w-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-4xl mb-6 shadow-2xl shadow-blue-600/30">
              <i className="fas fa-user-gear"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{currentTech?.name}</h3>
            <p className="text-blue-600 font-bold text-sm mb-6">{currentTech?.email}</p>
            <div className="w-full space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Department</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{currentTech?.department}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Personal History</h3>
          <div className="flex flex-col gap-4">
            {filteredTransactions.slice(0, 6).map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:scale-[1.01]">
                <div className="flex items-center space-x-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${t.type === 'ISSUE' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <i className={`fas ${t.type === 'ISSUE' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                  </div>
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">{t.itemName}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(t.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className={`font-black text-lg ${t.type === 'ISSUE' ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {t.type === 'ISSUE' ? '-' : '+'}{t.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Assets" value={stats.total} icon="fa-boxes" color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50 dark:bg-blue-400/10" />
        <StatCard title="Available" value={stats.available} icon="fa-check-circle" color="text-emerald-600 dark:text-emerald-400" bgColor="bg-emerald-50 dark:bg-emerald-400/10" />
        <StatCard title="On Field" value={stats.borrowed} icon="fa-truck-field" color="text-amber-600 dark:text-amber-400" bgColor="bg-amber-50 dark:bg-amber-400/10" />
        <StatCard title="Defective" value={stats.defective} icon="fa-tools" color="text-rose-600 dark:text-rose-400" bgColor="bg-rose-50 dark:bg-rose-400/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-md dark:shadow-sm">
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Equipment Availability Analysis</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis dataKey="name" stroke="currentColor" className="text-slate-400 dark:text-slate-500" fontSize={12} />
                <YAxis stroke="currentColor" className="text-slate-400 dark:text-slate-500" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="available" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Available" />
                <Bar dataKey="total" fill="transparent" radius={[4, 4, 0, 0]} name="Total Capacity" stroke="#3b82f6" strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-md dark:shadow-sm">
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Inventory Mix</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-md dark:shadow-sm">
          <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Recent Activity</h3>
          <div className="flex flex-col gap-4">
            {filteredTransactions.slice(0, 6).map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-slate-600 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${t.type === 'ISSUE' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-500' : 'bg-emerald-100 dark:bg-green-500/20 text-emerald-600 dark:text-green-500'}`}>
                    <i className={`fas ${t.type === 'ISSUE' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{t.itemName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-500">{t.technicianName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-black ${t.type === 'ISSUE' ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-green-400'}`}>
                    {t.type === 'ISSUE' ? '-' : '+'}{t.quantity}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400 dark:text-slate-500">
                <i className="fas fa-history text-3xl mb-2 opacity-20 block"></i>
                No recent activity recorded
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, bgColor }: any) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center space-x-4 shadow-md dark:shadow-sm transition-transform hover:scale-[1.02] duration-300">
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${bgColor} ${color}`}>
      <i className={`fas ${icon} text-xl`}></i>
    </div>
    <div>
      <div className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-tight">{title}</div>
      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</div>
    </div>
  </div>
);

export default Dashboard;
