import { Component } from '@angular/core';
import { MatrixEditorComponent, MatrixConfig } from './matrix-editor/matrix-editor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatrixEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly title = 'Matrix Editor';

  readonly config: MatrixConfig = {
    rows:    Array.from({ length: 500 }, (_, i) => `Row ${i + 1}`),
    columns: Array.from({ length: 500 }, (_, i) => `Col ${i + 1}`),
  };
}
