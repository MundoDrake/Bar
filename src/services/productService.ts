// src/services/productService.ts
import { apiFetch } from '../lib/api';
import type { ProductWithStock, ProductFormData } from '../types/database';

export const productServices = {
    getAll: async () => {
        return apiFetch<ProductWithStock[]>('/products');
    },

    create: async (data: ProductFormData) => {
        return apiFetch<{ success: true; id: string }>('/products', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    update: async (id: string, data: Partial<ProductFormData>) => {
        return apiFetch<{ success: true }>(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    delete: async (id: string) => {
        return apiFetch<{ success: true }>(`/products/${id}`, {
            method: 'DELETE'
        });
    }
};
