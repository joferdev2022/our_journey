import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-coming-soon',
  template: `
    <section class="coming-soon">
      <div class="coming-soon__mark" aria-hidden="true">{{ monogram() }}</div>
      <p>Our Journey</p>
      <h1>{{ title() }} — próximamente</h1>
      <span>Esta sección ya tiene su lugar reservado para la siguiente etapa.</span>
    </section>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: auto;
    }

    .coming-soon {
      min-height: 100%;
      display: grid;
      place-content: center;
      justify-items: center;
      padding: 2rem;
      text-align: center;
      background:
        radial-gradient(circle at 50% 35%, rgb(69 107 93 / 9%), transparent 28%), var(--surface);
    }

    .coming-soon__mark {
      width: 3.25rem;
      height: 3.25rem;
      display: grid;
      place-items: center;
      margin-bottom: 1.25rem;
      border: 1px solid #aebfb7;
      border-radius: 50%;
      color: var(--accent-strong);
      font-size: 0.72rem;
      font-weight: 750;
      letter-spacing: 0.08em;
    }

    p {
      margin: 0 0 0.65rem;
      color: var(--accent);
      font-size: 0.68rem;
      font-weight: 750;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(1.8rem, 7vw, 3rem);
      font-weight: 400;
      letter-spacing: -0.04em;
    }

    span {
      max-width: 28rem;
      margin-top: 0.8rem;
      color: var(--ink-muted);
      font-size: 0.85rem;
      line-height: 1.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonComponent {
  readonly title = input.required<string>();
  readonly monogram = input('OJ');
}
