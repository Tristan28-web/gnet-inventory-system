
import React, { useState, useMemo } from 'react';
import { useInventory } from '../App';
import { Technician } from '../types';

const Technicians: React.FC = () => {
  const { technicians, addTechnician, deleteTechnician, transactions, items } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Custom Stock View State
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);

  const filteredTechnicians = useMemo(() => {
    return technicians.filter(tech =>
      tech.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [technicians, searchTerm]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsRegistering(true);
    const formData = new FormData(e.currentTarget);
    const techData = {
      name: formData.get('name') as string,
      department: 'Field Ops',
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    try {
      // 1. Add to Firestore
      await addTechnician(techData);
      setIsModalOpen(false);
    } catch (err: any) {
      alert("Registration failed: " + err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const getTechStock = (techId: string) => {
    const techTransactions = transactions.filter(t => t.technicianId === techId);
    const stockMap: Record<string, { name: string, quantity: number, unit: string }> = {};

    techTransactions.forEach(t => {
      const item = items.find(i => i.id === t.itemId);
      const itemName = item?.name || t.itemName;
      const unit = item?.unit || 'pcs';

      if (!stockMap[t.itemId]) {
        stockMap[t.itemId] = { name: itemName, quantity: 0, unit: unit };
      }

      if (t.type === 'ISSUE') {
        stockMap[t.itemId].quantity += t.quantity;
      } else {
        stockMap[t.itemId].quantity -= t.quantity;
      }
    });

    return Object.values(stockMap).filter(s => s.quantity > 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Technician Registry</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <i className="fas fa-user-plus"></i>
          <span className="text-xs uppercase tracking-widest">Add Technician</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
        <div className="relative max-w-2xl">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            placeholder="Search personnel by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {filteredTechnicians.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTechnicians.map(tech => (
            <div key={tech.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md dark:shadow-sm relative group overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-500/30">
              <div className="absolute top-0 right-0 p-3 opacity-5 dark:opacity-10 group-hover:opacity-20 transition-opacity">
                <i className="fas fa-user-gear text-6xl text-slate-900 dark:text-white"></i>
              </div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">
                  {tech.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-lg leading-tight">{tech.name}</h4>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mt-1">{tech.department}</div>
                </div>
              </div>
              <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-sm font-bold">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-envelope w-5 text-slate-400"></i>
                  <span className="truncate">{tech.email || 'No email set'}</span>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setSelectedTech(tech)}
                  className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl transition-all active:scale-95 shadow-lg shadow-black/10"
                >
                  <i className="fas fa-truck-ramp-box mr-2"></i>Van Stock
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to remove ${tech.name}? This action cannot be undone.`)) {
                      deleteTechnician(tech.id);
                    }
                  }}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl">
          <div className="flex flex-col items-center">
            <i className="fas fa-user-slash text-4xl text-slate-200 dark:text-slate-800 mb-4"></i>
            <p className="text-slate-500 dark:text-slate-400 font-bold">No technicians found matching "{searchTerm}"</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest hover:underline"
            >
              Clear Search
            </button>
          </div>
        </div>
      )}

      {/* Van Stock Modal */}
      {selectedTech && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 transition-all animate-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Equipment Possession</div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{selectedTech.name}</h3>
                <p className="text-slate-500 text-xs font-bold mt-1">Current assets assigned for field operations</p>
              </div>
              <button
                onClick={() => setSelectedTech(null)}
                className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {getTechStock(selectedTech.id).length > 0 ? (
                getTechStock(selectedTech.id).map((stock, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span className="font-bold text-slate-900 dark:text-slate-200">{stock.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-black text-slate-900 dark:text-white">{stock.quantity}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stock.unit}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <i className="fas fa-box-open text-3xl text-slate-300 dark:text-slate-700 mb-3"></i>
                  <p className="text-slate-500 text-xs font-bold">This technician has no items currently checked out.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTech(null)}
              className="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs"
            >
              Close Asset View
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-[400px] rounded-[2rem] shadow-2xl p-6 md:p-8 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Register Personnel</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-all active:scale-95"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input required name="name" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm" placeholder="John Doe" />
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Sync Email</label>
                <input required type="email" name="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Security Key (Password)</label>
                <input required type="text" name="password" autoComplete="off" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm" placeholder="Enter unique password" />
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" disabled={isRegistering} onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs transition-all hover:bg-slate-200 active:scale-95">Discard</button>
                <button type="submit" disabled={isRegistering} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                  {isRegistering ? (
                    <span className="flex items-center justify-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i> Registering Personnel...
                    </span>
                  ) : 'Authorize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Technicians;
