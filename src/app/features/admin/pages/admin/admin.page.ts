import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Category } from '../../../../core/models/category.model';
import type { Memory } from '../../../../core/models/memory.model';
import { CategoryService } from '../../../../core/services/category.service';
import {
  MemoryManagementError,
  MemoryManagementService,
} from '../../../../core/services/memory-management.service';
import { MemoryService } from '../../../../core/services/memory.service';
import { formatMemoryDate } from '../../../../shared/utils/memory-date';
import { MemoryDeleteDialogComponent } from '../../components/memory-delete-dialog/memory-delete-dialog.component';

type AdminStatus = 'loading' | 'success' | 'empty' | 'error';

@Component({
  selector: 'app-admin-page',
  imports: [RouterLink, MemoryDeleteDialogComponent],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage implements OnInit {
  private readonly memoryService = inject(MemoryService);
  private readonly categoryService = inject(CategoryService);
  private readonly memoryManagement = inject(MemoryManagementService);

  protected readonly memories = signal<Memory[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly status = signal<AdminStatus>('loading');
  protected readonly pendingDelete = signal<Memory | null>(null);
  protected readonly isDeleting = signal(false);
  protected readonly deleteError = signal('');
  protected readonly formatDate = formatMemoryDate;

  ngOnInit(): void {
    void this.loadMemories();
  }

  protected retry(): void {
    void this.loadMemories();
  }

  protected categoryName(categoryId: string): string {
    return (
      this.categories().find((category) => category.id === categoryId)?.name ?? 'Sin categoría'
    );
  }

  protected requestDelete(memory: Memory): void {
    this.deleteError.set('');
    this.pendingDelete.set(memory);
  }

  protected cancelDelete(): void {
    if (!this.isDeleting()) {
      this.pendingDelete.set(null);
      this.deleteError.set('');
    }
  }

  protected async confirmDelete(): Promise<void> {
    const memory = this.pendingDelete();
    if (!memory || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.deleteError.set('');

    try {
      await this.memoryManagement.deleteMemory(memory.id);
      this.memories.update((items) => items.filter((item) => item.id !== memory.id));
      this.status.set(this.memories().length > 0 ? 'success' : 'empty');
      this.pendingDelete.set(null);
    } catch (error) {
      console.error('Our Journey: no se pudo completar la eliminación del recuerdo.', error);
      this.deleteError.set(
        error instanceof MemoryManagementError
          ? error.message
          : 'No pudimos eliminar el recuerdo. Intenta nuevamente.',
      );
    } finally {
      this.isDeleting.set(false);
    }
  }

  private async loadMemories(): Promise<void> {
    this.status.set('loading');

    try {
      const [memories, categories] = await Promise.all([
        this.memoryService.getAll(),
        this.categoryService.getAll(),
      ]);
      this.memories.set(memories);
      this.categories.set(categories);
      this.status.set(memories.length > 0 ? 'success' : 'empty');
    } catch (error) {
      console.error('Our Journey: no se pudo cargar Administración.', error);
      this.status.set('error');
    }
  }
}
