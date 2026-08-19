import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export interface PhotoViewerPhoto {
  url: string;
  alt: string;
}

@Component({
  selector: 'app-photo-viewer',
  templateUrl: './photo-viewer.component.html',
  styleUrl: './photo-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoViewerComponent implements OnInit, OnDestroy {
  readonly photos = input.required<readonly PhotoViewerPhoto[]>();
  readonly initialIndex = input(0);
  readonly closed = output<void>();

  private readonly document = inject(DOCUMENT);
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly previouslyFocused = this.document.activeElement as HTMLElement | null;
  private readonly previousBodyOverflow = this.document.body.style.overflow;

  protected readonly index = signal(0);
  protected readonly currentPhoto = computed(() => this.photos()[this.index()] ?? null);

  constructor() {
    this.document.body.style.overflow = 'hidden';
    afterNextRender(() => this.closeButton().nativeElement.focus());
  }

  ngOnInit(): void {
    this.index.set(this.clampIndex(this.initialIndex()));
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousBodyOverflow;
    this.previouslyFocused?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected previous(): void {
    const count = this.photos().length;

    if (count > 1) {
      this.index.update((index) => (index - 1 + count) % count);
    }
  }

  protected next(): void {
    const count = this.photos().length;

    if (count > 1) {
      this.index.update((index) => (index + 1) % count);
    }
  }

  private clampIndex(index: number): number {
    return Math.min(Math.max(0, index), Math.max(0, this.photos().length - 1));
  }
}
