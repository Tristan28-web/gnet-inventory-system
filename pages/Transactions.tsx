
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInventory } from '../App';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Transactions: React.FC = () => {
  const { items, technicians, transactions, userRole, currentTech, issueTool, returnTool } = useInventory();
  const [activeTab, setActiveTab] = useState<'LOG' | 'ISSUE' | 'RETURN'>('LOG');
  const [visibleItems, setVisibleItems] = useState(20);

  const [formData, setFormData] = useState({
    itemId: '',
    techId: userRole === 'TECHNICIAN' && currentTech ? currentTech.id : '',
    quantity: 1,
    jobId: '',
    customerName: '',
    serialNumber: '',
    condition: 'GOOD' as 'GOOD' | 'DEFECTIVE'
  });

  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render((decodedText) => {
        // If scanned text matches an item ID, select it
        const item = items.find(i => i.id === decodedText);
        if (item) {
          setFormData(prev => ({ ...prev, itemId: decodedText }));
          setShowScanner(false);
          scanner.clear();
        } else {
          alert("Scanned ID does not match any inventory item.");
        }
      }, (error) => {
        // Silent error for scanning
      });

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [showScanner, items]);

  const handleAction = (type: 'ISSUE' | 'RETURN') => {
    if (!formData.itemId || !formData.techId || formData.quantity <= 0) {
      alert("Please fill all fields correctly.");
      return;
    }

    if (type === 'ISSUE') {
      const item = items.find(i => i.id === formData.itemId);
      if (item && item.availableQuantity < formData.quantity) {
        alert("Insufficient stock available.");
        return;
      }
      issueTool(formData.itemId, formData.techId, formData.quantity, {
        jobId: formData.jobId,
        customerName: formData.customerName,
        serialNumber: formData.serialNumber
      });
    } else {
      returnTool(formData.itemId, formData.techId, formData.quantity, {
        condition: formData.condition
      });
    }

    setFormData({
      itemId: '',
      techId: '',
      quantity: 1,
      jobId: '',
      customerName: '',
      serialNumber: '',
      condition: 'GOOD'
    });
    setActiveTab('LOG');
  };

  const filteredTransactions = useMemo(() => {
    if (userRole === 'ADMIN') return transactions;
    return transactions.filter(t => t.technicianId === currentTech?.id);
  }, [userRole, transactions, currentTech]);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Type', 'Item Name', 'Technician', 'Quantity', 'Job ID', 'Customer', 'Serial Number', 'Condition'];
    const rows = filteredTransactions.map(t => [
      new Date(t.timestamp).toLocaleString(),
      t.type,
      t.itemName,
      t.technicianName,
      t.quantity.toString(),
      t.jobId || '',
      t.customerName || '',
      t.serialNumber || '',
      t.condition || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add BOM to fix Excel SYLK error
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `gnet_activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (userRole === 'TECHNICIAN' && currentTech) {
      setFormData(prev => ({ ...prev, techId: currentTech.id }));
    }

    // Handle Quick Actions from Dashboard
    const quickMode = localStorage.getItem('quick_tx_mode');
    if (quickMode) {
      setActiveTab(quickMode as 'ISSUE' | 'RETURN');
      setShowScanner(true);
      localStorage.removeItem('quick_tx_mode'); // Clear after use
    }

    // Security: Prevents Admins from staying on restricted tabs
    if (userRole === 'ADMIN' && activeTab !== 'LOG') {
      setActiveTab('LOG');
    }
  }, [userRole, currentTech, activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Activity Log</h2>

        <div className="flex flex-wrap gap-2">
          {userRole === 'TECHNICIAN' && (
            <div className="flex gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-[2rem] w-full sm:w-fit shadow-lg transition-colors duration-300">
              <button
                onClick={() => setActiveTab('ISSUE')}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ISSUE' ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/30' : 'text-slate-500 dark:text-slate-500 hover:text-orange-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Checkout
              </button>
              <button
                onClick={() => setActiveTab('RETURN')}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'RETURN' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/30' : 'text-slate-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Checkin
              </button>
              <button
                onClick={() => setActiveTab('LOG')}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'LOG' ? 'bg-slate-600 text-white shadow-xl shadow-slate-600/30' : 'text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                View History
              </button>
            </div>
          )}

          {activeTab === 'LOG' && (
            <button
              onClick={handleExportCSV}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <i className="fas fa-file-csv"></i>
              <span className="text-[10px] uppercase tracking-widest">Download Log</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'LOG' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl dark:shadow-2xl transition-colors duration-300">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left table-fixed border-collapse min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[20%] border-r border-slate-200 dark:border-slate-800">Timestamp</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[12%] border-r border-slate-200 dark:border-slate-800">Action</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[30%] border-r border-slate-200 dark:border-slate-800">Inventory Asset</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[28%] border-r border-slate-200 dark:border-slate-800">Technician</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center w-[10%]">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTransactions.slice(0, visibleItems).map(t => (
                  <tr key={t.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono border-r border-slate-100 dark:border-slate-800/50">
                      <div className="text-slate-900 dark:text-slate-300 font-bold">{new Date(t.timestamp).toLocaleDateString()}</div>
                      <div className="opacity-50 text-[10px]">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${t.type === 'ISSUE' ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-bold truncate border-r border-slate-100 dark:border-slate-800/50 text-sm">
                      {t.itemName}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center space-x-2 truncate">
                        <div className="h-5 w-5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md flex items-center justify-center text-[9px] font-black border border-blue-200 dark:border-blue-800">{t.technicianName.charAt(0)}</div>
                        <span className="text-slate-600 dark:text-slate-300 text-xs font-bold truncate">{t.technicianName}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-center font-black text-base ${t.type === 'ISSUE' ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {t.type === 'ISSUE' ? '-' : '+'}{t.quantity}
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <i className="fas fa-file-invoice text-4xl text-slate-200 dark:text-slate-800 mb-4 block"></i>
                      <p className="text-slate-400 dark:text-slate-500 font-bold">No system logs generated yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length > visibleItems && (
            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <button
                onClick={() => setVisibleItems(prev => prev + 20)}
                className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95 shadow-sm"
              >
                Load More History
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors duration-300">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 dark:bg-white/5 rounded-full blur-3xl"></div>

          <div className="flex items-center space-x-3 mb-6 relative z-10">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-xl text-white ${activeTab === 'ISSUE' ? 'bg-orange-600' : 'bg-emerald-600'}`}>
              <i className={`fas ${activeTab === 'ISSUE' ? 'fa-arrow-right-from-bracket' : 'fa-arrow-right-to-bracket'} text-xl`}></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{activeTab === 'ISSUE' ? 'Asset Issuance' : 'Stock Intake'}</h3>
              <p className="text-slate-500 dark:text-slate-500 text-[11px] font-bold uppercase tracking-tight">Core inventory synchronization protocol</p>
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Inventory Asset</label>
                <div className="flex items-stretch gap-2 relative">
                  <div className="flex-1 relative">
                    <select
                      value={formData.itemId}
                      onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer font-bold text-slate-900 dark:text-white pr-10 text-sm"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">-- SELECT ITEM --</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{i.name} (Stock: {i.availableQuantity})</option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]"></i>
                  </div>
                  <button
                    onClick={() => setShowScanner(!showScanner)}
                    className={`shrink-0 w-12 flex items-center justify-center rounded-xl transition-all duration-300 border ${showScanner ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 hover:border-blue-500'}`}
                    title={showScanner ? "Close Scanner" : "Scan Asset Tag"}
                  >
                    <i className={`fas ${showScanner ? 'fa-times' : 'fa-qrcode'} text-lg`}></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Authorized Personnel</label>
                {userRole === 'ADMIN' ? (
                  <select
                    value={formData.techId}
                    onChange={(e) => setFormData({ ...formData, techId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer font-bold text-slate-900 dark:text-white text-sm"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">-- SELECT TECHNICIAN --</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.name} [{t.department}]</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-900 dark:text-white text-sm">
                    {currentTech?.name} (Logged In)
                  </div>
                )}
              </div>
            </div>

            {showScanner && (
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border-2 border-dashed border-blue-500/30 overflow-hidden relative">
                <div id="reader"></div>
                <button
                  onClick={() => setShowScanner(false)}
                  className="absolute top-2 right-2 h-8 w-8 bg-black/50 text-white rounded-full flex items-center justify-center text-xs z-10"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}

            {activeTab === 'ISSUE' ? null : (
              <div>
                <label className="block text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Asset Condition</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, condition: 'GOOD' })}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${formData.condition === 'GOOD' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                  >
                    <i className="fas fa-check-circle mr-2"></i>Good State
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, condition: 'DEFECTIVE' })}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${formData.condition === 'DEFECTIVE' ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                  >
                    <i className="fas fa-times-circle mr-2"></i>Broken
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Unit Quantifier</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 dark:text-white text-sm"
              />
            </div>

            <button
              onClick={() => handleAction(activeTab === 'ISSUE' ? 'ISSUE' : 'RETURN')}
              className={`w-full py-4 rounded-xl font-black text-white text-sm transition-all active:scale-95 shadow-lg uppercase tracking-widest ${activeTab === 'ISSUE' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/40' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'}`}
            >
              Sync {activeTab}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
