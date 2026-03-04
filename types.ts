
export type ItemStatus = 'Available' | 'Low Stock' | 'Out of Stock';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  defectiveQuantity?: number;
  unit: string;
  lowStockThreshold: number;
}

export interface Technician {
  id: string;
  name: string;
  department: string;
  phone?: string;
  email?: string;
  password?: string;
}

export interface Transaction {
  id: string;
  itemId: string;
  technicianId: string;
  type: 'ISSUE' | 'RETURN' | 'ADJUSTMENT'; // Added ADJUSTMENT
  quantity: number;
  timestamp: string;
  itemName: string;
  technicianName: string;
  jobId?: string;
  customerName?: string;
  serialNumber?: string;
  condition?: 'GOOD' | 'DEFECTIVE';
  adjustmentReason?: string; // New field for Audit
  difference?: number; // New field for Audit
}

export interface InventoryContextType {
  items: InventoryItem[];
  technicians: Technician[];
  transactions: Transaction[];
  userRole: 'ADMIN' | 'TECHNICIAN';
  currentTech: Technician | null;
  addItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateItem: (item: InventoryItem) => void;
  deleteItem: (id: string) => void;
  addTechnician: (tech: Omit<Technician, 'id'>) => void;
  deleteTechnician: (id: string) => void;
  issueTool: (itemId: string, techId: string, qty: number, metadata?: { jobId?: string, customerName?: string, serialNumber?: string }) => void;
  returnTool: (itemId: string, techId: string, qty: number, metadata?: { condition?: 'GOOD' | 'DEFECTIVE' }) => void;
  adjustStock: (itemId: string, newTotal: number, newAvailable: number, reason: string) => void;
  logout: () => void;
}
