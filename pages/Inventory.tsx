
import React, { useState, useMemo } from 'react';
import { useInventory } from '../App';
import { InventoryItem } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

const Inventory: React.FC = () => {
  const { items, addItem, updateItem, deleteItem } = useInventory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // View Modal State
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  const isViewModalOpen = !!viewingItemId;
  const viewingItem = useMemo(() =>
    viewingItemId ? items.find(i => i.id === viewingItemId) || null : null
    , [items, viewingItemId]);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'category'>('name');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const cats = new Set(items.map(item => item.category));
    return ['All', ...Array.from(cats).sort()];
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesLowStock = !showLowStockOnly || (item.availableQuantity <= item.lowStockThreshold);
      return matchesSearch && matchesCategory && matchesLowStock;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      if (sortBy === 'stock') return a.availableQuantity - b.availableQuantity;
      return 0;
    });

    return result;
  }, [items, searchTerm, selectedCategory, showLowStockOnly, sortBy]);

  const handleExportCSV = () => {
    const headers = ['Name', 'Category', 'Available', 'Total', 'Unit', 'Status'];
    const rows = filteredAndSortedItems.map(item => {
      const isLowStock = item.availableQuantity <= item.lowStockThreshold;
      const status = item.availableQuantity <= 0 ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Available';
      return [
        item.name,
        item.category,
        item.availableQuantity.toString(),
        item.totalQuantity.toString(),
        item.unit,
        status
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add BOM to fix Excel SYLK error
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gnet_inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      totalQuantity: parseInt(formData.get('totalQuantity') as string),
      availableQuantity: parseInt(formData.get('availableQuantity') as string),
      unit: formData.get('unit') as string,
      lowStockThreshold: parseInt(formData.get('lowStockThreshold') as string),
    };

    if (editingItem) {
      updateItem({ ...data, id: editingItem.id });
    } else {
      addItem(data);
    }
    closeModal();
  };

  const openModal = (item?: InventoryItem) => {
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const openViewModal = (item: InventoryItem) => {
    setViewingItemId(item.id);
  };

  const closeViewModal = () => {
    setViewingItemId(null);
  };

  // Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk Action Handlers
  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected items?`)) {
      selectedIds.forEach(id => deleteItem(id));
      setSelectedIds(new Set());
    }
  };

  const handleBulkLowStock = () => {
    selectedIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) {
        // Mark as low stock by ensuring threshold is higher than available qty
        updateItem({
          ...item,
          lowStockThreshold: Math.max(item.lowStockThreshold, item.availableQuantity + 1)
        });
      }
    });
    setSelectedIds(new Set());
    alert(`${selectedIds.size} items updated with new low stock thresholds.`);
  };

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Item Management</h2>
        <div className="flex w-full sm:w-auto gap-3">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <i className="fas fa-file-csv"></i>
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => openModal()}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <i className="fas fa-plus"></i>
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search assets by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl">
              <span className="pl-3 text-[10px] font-black uppercase text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-black text-slate-900 dark:text-white px-2 py-1 outline-none cursor-pointer"
              >
                <option value="name" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Name</option>
                <option value="stock" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Stock Level</option>
                <option value="category" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Category</option>
              </select>
            </div>

            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase transition-all ${showLowStockOnly ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}
            >
              <i className="fas fa-exclamation-triangle"></i>
              <span>Low Stock Alerts</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl dark:shadow-2xl transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed border-collapse min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-4 w-[40px] border-r border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={filteredAndSortedItems.length > 0 && selectedIds.size === filteredAndSortedItems.length}
                      onChange={toggleSelectAll}
                    />
                  </div>
                </th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[35%] border-r border-slate-200 dark:border-slate-800">Asset Detail</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[15%] border-r border-slate-200 dark:border-slate-800 text-center">Category</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[15%] border-r border-slate-200 dark:border-slate-800 text-center">Available</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[15%] border-r border-slate-200 dark:border-slate-800 text-center">Status</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-[20%] text-center">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredAndSortedItems.map(item => {
                const isLowStock = item.availableQuantity <= item.lowStockThreshold;
                const status = item.availableQuantity <= 0
                  ? 'DEPLETED'
                  : isLowStock
                    ? 'LOW'
                    : 'GOOD';
                const statusColor = status === 'GOOD' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                  status === 'LOW' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                    'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';

                return (
                  <tr
                    key={item.id}
                    onClick={() => openViewModal(item)}
                    className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-100 dark:border-slate-800/50 group ${selectedIds.has(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50">
                      <div className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate group-hover:text-blue-600 transition-colors">{item.name}</div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black flex items-center space-x-2">
                        <span>{item.unit}</span>
                        <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                        <span className="opacity-50 font-mono">ID: {item.id.substring(0, 6)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[9px] font-black uppercase tracking-tighter border border-slate-200 dark:border-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{item.availableQuantity}</span>
                        <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${status === 'GOOD' ? 'bg-emerald-500' : status === 'LOW' ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, (item.availableQuantity / item.totalQuantity) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center space-x-1">
                        <button onClick={() => openModal(item)} className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-400/10 rounded-lg transition-all" title="Edit Item"><i className="fas fa-edit text-xs"></i></button>
                        <button onClick={() => deleteItem(item.id)} className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-400/10 rounded-lg transition-all" title="Delete Item"><i className="fas fa-trash text-xs"></i></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <i className="fas fa-search-minus text-4xl text-slate-200 dark:text-slate-800 mb-4"></i>
                      <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest">No matching records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 dark:bg-slate-100/95 backdrop-blur-xl border border-white/10 dark:border-black/5 px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-6 z-[55] animate-in slide-in-from-bottom-10 duration-300">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-blue-500/20">
              {selectedIds.size}
            </div>
            <span className="text-white dark:text-slate-900 text-sm font-black uppercase tracking-widest whitespace-nowrap">Selected</span>
          </div>

          <div className="h-6 w-px bg-white/20 dark:bg-black/10"></div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkLowStock}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center space-x-2"
            >
              <i className="fas fa-exclamation-circle"></i>
              <span className="hidden sm:inline">Set Alerts</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center space-x-2"
            >
              <i className="fas fa-trash-alt"></i>
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 text-white/50 hover:text-white dark:text-slate-400 dark:hover:text-slate-900 transition-colors"
              title="Clear Selection"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* View Item Detail Modal */}
      {isViewModalOpen && viewingItem && (
        <div className="fixed inset-0 bg-slate-950/95 z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl relative transition-colors duration-300 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <button
              onClick={closeViewModal}
              className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-all active:scale-90 z-20"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
            <div className="p-6 md:p-10 pt-16 relative z-10">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800 mb-2 inline-block">
                    {viewingItem.category}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white pr-10">{viewingItem.name}</h3>
                  <div className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Ref ID: {viewingItem.id}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                <div className="md:col-span-12 lg:col-span-7 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Stock Health Analysis</div>
                    <div className="flex items-end justify-between mb-2">
                      <div className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">
                        {viewingItem.availableQuantity}
                        <span className="text-xl text-slate-400 ml-1 font-bold">/{viewingItem.totalQuantity}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-black uppercase tracking-wider mb-1 ${viewingItem.availableQuantity <= viewingItem.lowStockThreshold ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {viewingItem.availableQuantity <= 0 ? 'Depleted' : viewingItem.availableQuantity <= viewingItem.lowStockThreshold ? 'Critical Low' : 'Healthy'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{viewingItem.unit} Available</div>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ease-out ${viewingItem.availableQuantity <= viewingItem.lowStockThreshold ? 'bg-rose-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, (viewingItem.availableQuantity / viewingItem.totalQuantity) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Threshold</div>
                      <div className="text-xl font-black text-slate-900 dark:text-white">{viewingItem.lowStockThreshold} <span className="text-xs font-bold text-slate-400 uppercase">{viewingItem.unit}</span></div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
                      <div className="text-[9px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-widest mb-1">Defective</div>
                      <div className="text-xl font-black text-rose-600 dark:text-rose-400 uppercase">{viewingItem.defectiveQuantity || 0} <span className="text-xs font-bold opacity-50">{viewingItem.unit}</span></div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-6">
                  {/* QR Code Section */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center flex-1">
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Printable Asset Tag</div>
                    <div className="bg-white p-3 rounded-2xl shadow-inner mb-4">
                      <QRCodeCanvas
                        value={viewingItem.id}
                        size={100}
                        level={"H"}
                        includeMargin={false}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-slate-900 dark:text-slate-100 font-black tracking-tighter bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
                      {viewingItem.id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 mb-8">
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Technical Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Classification</span>
                    <span className="text-xs text-slate-900 dark:text-white font-black">{viewingItem.category}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Total Input</span>
                    <span className="text-xs text-slate-900 dark:text-white font-black">{viewingItem.totalQuantity} {viewingItem.unit}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700/50">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Alert Point</span>
                    <span className="text-xs text-rose-500 dark:text-rose-400 font-black">≤ {viewingItem.lowStockThreshold}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Utilization Rate</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-black">{Math.round(((viewingItem.totalQuantity - viewingItem.availableQuantity) / viewingItem.totalQuantity) * 100)}%</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { closeViewModal(); openModal(viewingItem); }}
                  className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl"
                >
                  Modify Specification
                </button>
                <button
                  onClick={closeViewModal}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6 md:p-8 animate-in zoom-in duration-200 transition-colors duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{editingItem ? 'Edit Equipment' : 'Register New Equipment'}</h3>
              <button onClick={closeModal} className="h-10 w-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Device Name</label>
                <input required name="name" defaultValue={editingItem?.name} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="e.g. Fiber ONT G-2425G" />
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Category</label>
                  <select name="category" defaultValue={editingItem?.category || 'Modem'} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-slate-900 dark:text-white font-bold">
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Modem</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Router</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Cable</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Tools</option>
                    <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Unit Type</label>
                  <input name="unit" defaultValue={editingItem?.unit || 'pcs'} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Total Capacity</label>
                  <input required type="number" name="totalQuantity" defaultValue={editingItem?.totalQuantity} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Currently In</label>
                  <input required type="number" name="availableQuantity" defaultValue={editingItem?.availableQuantity} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Alert Limit</label>
                  <input required type="number" name="lowStockThreshold" defaultValue={editingItem?.lowStockThreshold} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="pt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button type="button" onClick={closeModal} className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold transition-all active:scale-95">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-600/30 active:scale-95">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
