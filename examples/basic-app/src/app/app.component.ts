import { Component } from '@angular/core';

import generatedManifest from './generated/ng-smart-images.manifest';
import { hashed, imageEntry } from './generated/ng-smart-images.runtime';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  protected readonly scenicPhotoHref = hashed('src/assets/code-photo.png');
  protected readonly includedOnlyEntry = imageEntry('src/assets/included-only.png');
  protected readonly manifestEntry = generatedManifest['src/assets/hero.png'] ?? null;
}
