import { inject, Injectable } from '@angular/core';

import { Category } from '../models/category.model';
import { ServiceError } from '../models/service-error.model';
import { SupabaseService } from './supabase.service';

interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly supabase = inject(SupabaseService);

  async getAll(): Promise<Category[]> {
    const { data, error } = await this.supabase.client
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new ServiceError('data-access', 'No se pudieron cargar las categorías.', {
        cause: error,
      });
    }

    return (data as CategoryRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      createdAt: row.created_at,
    }));
  }
}
