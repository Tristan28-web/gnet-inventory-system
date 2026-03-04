
import React, { useState } from 'react';
import { useInventory } from '../App';
import { InventoryItem } from '../types';

const Audit: React.FC = () => {
    const { items, adjustStock } = useInventory();
    const [auditData, setAuditData] = useState<Record<string, { total: number, available: number }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (itemId: string, field: 'total' | 'available', value: string) => {
        const numValue = parseInt(value) || 0;
        setAuditData(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId] || {
                    total: items.find(i => i.id === itemId)?.totalQuantity || 0,
                    available: items.find(i => i.id === itemId)?.availableQuantity || 0
                },
                [field]: numValue
            }
        }));
    };

    const startAudit = () => {
        const initialData: Record<string, { total: number, available: number }> = {};
        items.forEach(item => {
            initialData[item.id] = {
                total: item.totalQuantity,
                available: item.availableQuantity
            };
        });
        setAuditData(initialData);
    };

    const submitAudit = async () => {
        if (!window.confirm("Are you sure you want to commit these changes to the live inventory? This will generate adjustment logs.")) return;

        setIsSubmitting(true);
        try {
            for (const itemId in auditData) {
                const item = items.find(i => i.id === itemId);
                const newData = auditData[itemId];

                if (item && (item.totalQuantity !== newData.total || item.availableQuantity !== newData.available)) {
                    await adjustStock(itemId, newData.total, newData.available, "Monthly Physical Audit");
                }
            }
            alert("Inventory synchronized successfully!");
            setAuditData({});
        } catch (error) {
            console.error("Audit failed:", error);
            alert("Error syncing inventory.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasChanges = Object.keys(auditData).length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg transition-colors duration-300">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Site Audit Mode</h2>
                    <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest leading-tight">Physical Inventory Reconciliation</p>
                </div>
                {!hasChanges ? (
                    <button
                        onClick={startAudit}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-blue-600/20 flex items-center justify-center space-x-3"
                    >
                        <i className="fas fa-clipboard-check"></i>
                        <span className="text-xs uppercase tracking-widest">Initialize Audit</span>
                    </button>
                ) : (
                    <div className="flex w-full sm:w-auto space-x-3">
                        <button
                            onClick={() => setAuditData({})}
                            className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-6 py-3 rounded-2xl font-black transition-all active:scale-95 text-xs uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitAudit}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-emerald-600/20 disabled:opacity-50 text-xs uppercase tracking-widest"
                        >
                            {isSubmitting ? (
                                <i className="fas fa-circle-notch fa-spin"></i>
                            ) : (
                                <span className="flex items-center justify-center">
                                    <i className="fas fa-sync-alt mr-2"></i> Commit
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {!hasChanges ? (
                <div className="py-20 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
                    <div className="max-w-md mx-auto">
                        <div className="h-20 w-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6">
                            <i className="fas fa-warehouse text-3xl"></i>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Ready for Physical Count?</h3>
                        <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
                            Enter Audit Mode to reconcile your physical warehouse stock with the digital records. GNET will track every discrepancy found.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-colors duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-fixed border-collapse min-w-[900px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[30%] border-r border-slate-200 dark:border-slate-800">Item Description</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[20%] border-r border-slate-200 dark:border-slate-800 text-center">Digital (System)</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest w-[30%] border-r border-slate-200 dark:border-slate-800 text-center bg-blue-50/50 dark:bg-blue-500/5">Physical Count (shelf)</th>
                                    <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[20%] text-center">Sync Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {items.map(item => {
                                    const audit = auditData[item.id] || { total: item.totalQuantity, available: item.availableQuantity };
                                    const diff = audit.available - item.availableQuantity;
                                    const totalDiff = audit.total - item.totalQuantity;

                                    return (
                                        <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-100 dark:border-slate-800/50 group">
                                            <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50">
                                                <div className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate">{item.name}</div>
                                                <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black">{item.category} • {item.unit}</div>
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-slate-500">Avail: <span className="text-slate-900 dark:text-white font-mono">{item.availableQuantity}</span></span>
                                                    <span className="text-[10px] font-black text-slate-400 opacity-50 uppercase mt-0.5">Cap: {item.totalQuantity}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50 bg-blue-50/30 dark:bg-blue-500/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <div className="text-[8px] font-black text-blue-500 uppercase mb-0.5">In Shelf</div>
                                                        <input
                                                            type="number"
                                                            value={audit.available}
                                                            onChange={(e) => handleInputChange(item.id, 'available', e.target.value)}
                                                            className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 rounded-lg px-2 py-1.5 text-xs font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Total Cap</div>
                                                        <input
                                                            type="number"
                                                            value={audit.total}
                                                            onChange={(e) => handleInputChange(item.id, 'total', e.target.value)}
                                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-black text-slate-500 outline-none text-center"
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {diff === 0 && totalDiff === 0 ? (
                                                    <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                        MATCHED
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col items-center space-y-1">
                                                        <span className={`text-sm font-black font-mono ${diff > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                                            {diff > 0 ? '+' : ''}{diff}
                                                        </span>
                                                        {totalDiff !== 0 && (
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                                CAP {totalDiff > 0 ? '+' : ''}{totalDiff}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Audit;
