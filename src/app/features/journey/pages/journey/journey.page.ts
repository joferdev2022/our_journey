import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Category } from '../../../../core/models/category.model';
import { Memory } from '../../../../core/models/memory.model';
import { CategoryService } from '../../../../core/services/category.service';
import { MemoryService } from '../../../../core/services/memory.service';
import { memoriesToFeatureCollection } from '../../../../shared/utils/memory-geojson';
import { resolveRequestedMemory } from '../../../../shared/utils/memory-navigation';
import { JourneyMapComponent } from '../../components/journey-map/journey-map.component';
import { MemoryDetailCardComponent } from '../../components/memory-detail-card/memory-detail-card.component';

type LoadStatus = 'loading' | 'success' | 'empty' | 'error';

@Component({
  selector: 'app-journey-page',
  imports: [JourneyMapComponent, MemoryDetailCardComponent, RouterLink],
  templateUrl: './journey.page.html',
  styleUrl: './journey.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyPage implements OnInit, AfterViewInit {
  @ViewChild(JourneyMapComponent)
  private journeyMap?: JourneyMapComponent;

  private readonly memoryService = inject(MemoryService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private requestedFocusMemory: Memory | null = null;

  protected readonly memories = signal<Memory[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly status = signal<LoadStatus>('loading');
  protected readonly selectedMemory = signal<Memory | null>(null);
  protected readonly showCreatedConfirmation = signal(false);
  protected readonly confirmationMessage = signal('');
  protected readonly featureCollection = computed(() =>
    memoriesToFeatureCollection(this.memories()),
  );
  protected readonly selectedCategoryName = computed(() => {
    const selected = this.selectedMemory();

    return (
      this.categories().find((category) => category.id === selected?.categoryId)?.name ??
      'Sin categoría'
    );
  });

  ngOnInit(): void {
    const wasCreated = this.route.snapshot.queryParamMap.has('created');
    const wasUpdated = this.route.snapshot.queryParamMap.has('updated');
    this.showCreatedConfirmation.set(wasCreated || wasUpdated);
    this.confirmationMessage.set(
      wasUpdated ? 'Cambios guardados correctamente.' : 'Recuerdo guardado correctamente.',
    );
    void this.loadJourney();
  }

  ngAfterViewInit(): void {
    this.focusRequestedMemory();
  }

  protected retry(): void {
    void this.loadJourney();
  }

  protected selectMemory(memoryId: string): void {
    this.selectedMemory.set(this.memories().find((memory) => memory.id === memoryId) ?? null);
  }

  protected closeMemoryDetail(): void {
    this.selectedMemory.set(null);
  }

  protected showAllMemories(): void {
    this.journeyMap?.showAllMemories();
  }

  protected dismissConfirmation(): void {
    this.showCreatedConfirmation.set(false);
  }

  private async loadJourney(): Promise<void> {
    this.status.set('loading');

    try {
      const [memories, categories] = await Promise.all([
        this.memoryService.getAll(),
        this.categoryService.getAll(),
      ]);

      this.memories.set(memories);
      this.categories.set(categories);
      this.status.set(memories.length > 0 ? 'success' : 'empty');
      this.selectRequestedMemory();
    } catch (error) {
      console.error('Our Journey: no se pudo cargar la vista Journey.', error);
      this.status.set('error');
    }
  }

  private selectRequestedMemory(): void {
    const requested = resolveRequestedMemory(
      this.memories(),
      this.route.snapshot.queryParamMap.get('memory'),
    );
    if (!requested) return;

    this.selectedMemory.set(requested);
    this.requestedFocusMemory = requested;
    this.focusRequestedMemory();
  }

  private focusRequestedMemory(): void {
    if (!this.requestedFocusMemory || !this.journeyMap) return;
    this.journeyMap.focusMemory(this.requestedFocusMemory);
    this.requestedFocusMemory = null;
  }
}
