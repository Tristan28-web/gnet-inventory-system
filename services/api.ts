import { InventoryItem, Technician, Transaction } from '../types';

const API_BASE_URL = 'http://localhost/gnet-main/api/api.php'; // Adjust this to your XAMPP path

export const apiService = {
  // Items
  async getItems(): Promise<InventoryItem[]> {
    const response = await fetch(`${API_BASE_URL}?action=items`);
    return response.json();
  },
  async addItem(item: Omit<InventoryItem, 'id'>): Promise<void> {
    await fetch(`${API_BASE_URL}?action=items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  },
  async updateItem(item: InventoryItem): Promise<void> {
    await fetch(`${API_BASE_URL}?action=items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  },
  async deleteItem(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}?action=items&id=${id}`, {
      method: 'DELETE',
    });
  },

  // Technicians
  async getTechnicians(): Promise<Technician[]> {
    const response = await fetch(`${API_BASE_URL}?action=technicians`);
    return response.json();
  },
  async addTechnician(tech: Omit<Technician, 'id'>): Promise<void> {
    await fetch(`${API_BASE_URL}?action=technicians`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tech),
    });
  },
  async updateTechnician(tech: Technician): Promise<void> {
    await fetch(`${API_BASE_URL}?action=technicians`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tech),
    });
  },
  async deleteTechnician(id: string): Promise<void> {
    await fetch(`${API_BASE_URL}?action=technicians&id=${id}`, {
      method: 'DELETE',
    });
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const response = await fetch(`${API_BASE_URL}?action=transactions`);
    return response.json();
  },
  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<void> {
    await fetch(`${API_BASE_URL}?action=transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
  },

  // Auth
  async login(email: string, securityKey: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}?action=auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: securityKey }),
    });
    const result = await response.json();
    if (result.status === 'success') {
      return result.user;
    } else {
      throw new Error(result.message || 'Login failed');
    }
  }
};
