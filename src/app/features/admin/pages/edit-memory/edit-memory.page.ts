import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { CreateMemory, Memory } from '../../../../core/models/memory.model';
import { MemoryService } from '../../../../core/services/memory.service';
import { MemoryFormComponent } from '../../components/memory-form/memory-form.component';

type EditStatus = 'loading' | 'ready' | 'not-found' | 'error';

@Component({
  selector: 'app-edit-memory-page',
  imports: [RouterLink, MemoryFormComponent],
  templateUrl: './edit-memory.page.html',
  styleUrl: '../new-memory/new-memory.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMemoryPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly memoryService = inject(MemoryService);

  protected readonly memory = signal<Memory | null>(null);
  protected readonly status = signal<EditStatus>('loading');
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadMemory();
  }

  protected retry(): void {
    void this.loadMemory();
  }

  protected async updateMemory(changes: CreateMemory): Promise<void> {
    const memory = this.memory();
    if (!memory || this.isSaving()) return;

    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const updated = await this.memoryService.update(memory.id, changes);
      await this.router.navigate(['/journey'], {
        queryParams: { memory: updated.id, updated: updated.id },
      });
    } catch (error) {
      console.error('Our Journey: no se pudo actualizar el recuerdo.', error);
      this.saveError.set('No pudimos guardar los cambios. Intenta nuevamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected cancel(): void {
    void this.router.navigate(['/admin']);
  }

  private async loadMemory(): Promise<void> {
    const memoryId = this.route.snapshot.paramMap.get('id');
    if (!memoryId) {
      this.status.set('not-found');
      return;
    }

    this.status.set('loading');
    try {
      const memory = await this.memoryService.getById(memoryId);
      if (!memory) {
        this.status.set('not-found');
        return;
      }
      this.memory.set(memory);
      this.status.set('ready');
    } catch (error) {
      console.error('Our Journey: no se pudo cargar el recuerdo para editar.', error);
      this.status.set('error');
    }
  }
}
