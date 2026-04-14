import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MatrixConfig {
  rows: string[];
  columns: string[];
}

/** Must match the CSS constants in matrix-editor.scss */
const ROW_HEIGHT = 36;   // px
const COL_WIDTH  = 80;   // px
const OVERSCAN_ROWS = 5;
const OVERSCAN_COLS = 5;

@Component({
  selector: 'app-matrix-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matrix-editor.html',
  styleUrl: './matrix-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatrixEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: MatrixConfig = { rows: [], columns: [] };
  @ViewChild('scrollHost') scrollHostRef!: ElementRef<HTMLDivElement>;

  /** Row-major boolean store — 500×500 ≈ 250 KB, never fully rendered */
  cells: boolean[][] = [];

  // ── Scroll & viewport state (Angular signals) ──────────────────────
  readonly _scrollTop  = signal(0);
  readonly _scrollLeft = signal(0);
  readonly _vpH        = signal(600);
  readonly _vpW        = signal(800);

  private resizeObserver?: ResizeObserver;

  // ── Visible row window ──────────────────────────────────────────────
  readonly rowStart = computed(() =>
    Math.max(0, Math.floor(this._scrollTop() / ROW_HEIGHT) - OVERSCAN_ROWS)
  );
  readonly rowEnd = computed(() =>
    Math.min(
      this.config.rows.length,
      Math.ceil((this._scrollTop() + this._vpH()) / ROW_HEIGHT) + OVERSCAN_ROWS,
    )
  );

  // ── Visible column window ───────────────────────────────────────────
  readonly colStart = computed(() =>
    Math.max(0, Math.floor(this._scrollLeft() / COL_WIDTH) - OVERSCAN_COLS)
  );
  readonly colEnd = computed(() =>
    Math.min(
      this.config.columns.length,
      Math.ceil((this._scrollLeft() + this._vpW()) / COL_WIDTH) + OVERSCAN_COLS,
    )
  );

  // ── Slices of only the visible rows / columns ───────────────────────
  readonly visibleRows = computed(() => {
    const s = this.rowStart();
    return this.config.rows
      .slice(s, this.rowEnd())
      .map((label, i) => ({ label, index: s + i }));
  });

  readonly visibleCols = computed(() => {
    const s = this.colStart();
    return this.config.columns
      .slice(s, this.colEnd())
      .map((label, i) => ({ label, index: s + i }));
  });

  // ── Virtual spacer sizes (maintain correct scroll extent) ──────────
  readonly topSpacer    = computed(() => this.rowStart() * ROW_HEIGHT);
  readonly bottomSpacer = computed(() => (this.config.rows.length    - this.rowEnd()) * ROW_HEIGHT);
  readonly leftSpacer   = computed(() => this.colStart() * COL_WIDTH);
  readonly rightSpacer  = computed(() => (this.config.columns.length - this.colEnd()) * COL_WIDTH);

  // ── Lifecycle ───────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cells = Array.from({ length: this.config.rows.length }, () =>
      new Array<boolean>(this.config.columns.length).fill(false)
    );
  }

  ngAfterViewInit(): void {
    const el = this.scrollHostRef.nativeElement;
    this._vpH.set(el.clientHeight);
    this._vpW.set(el.clientWidth);

    this.resizeObserver = new ResizeObserver(([e]) => {
      this._vpH.set(e.contentRect.height);
      this._vpW.set(e.contentRect.width);
    });
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    this._scrollTop.set(el.scrollTop);
    this._scrollLeft.set(el.scrollLeft);
  }

  // ── Bulk toggle helpers ─────────────────────────────────────────────
  toggleAll(checked: boolean): void {
    this.cells = Array.from({ length: this.config.rows.length }, () =>
      new Array<boolean>(this.config.columns.length).fill(checked)
    );
  }

  toggleRow(rowIndex: number, checked: boolean): void {
    this.cells[rowIndex] = new Array<boolean>(this.config.columns.length).fill(checked);
    this.cells = [...this.cells];
  }

  toggleColumn(colIndex: number, checked: boolean): void {
    for (let r = 0; r < this.cells.length; r++) {
      this.cells[r][colIndex] = checked;
    }
    this.cells = [...this.cells];
  }

  // ── State queries (only called for the ~20 visible rows/cols) ───────
  isRowChecked(ri: number): boolean {
    return this.cells[ri]?.every(Boolean) ?? false;
  }

  isRowIndeterminate(ri: number): boolean {
    const row = this.cells[ri] ?? [];
    const n = row.reduce((s, v) => s + (v ? 1 : 0), 0);
    return n > 0 && n < row.length;
  }

  isColChecked(ci: number): boolean {
    return this.cells.every(row => row[ci]);
  }

  isColIndeterminate(ci: number): boolean {
    const n = this.cells.reduce((s, row) => s + (row[ci] ? 1 : 0), 0);
    return n > 0 && n < this.cells.length;
  }

  isAllChecked(): boolean {
    return this.cells.every(row => row.every(Boolean));
  }

  isAllIndeterminate(): boolean {
    const total = this.config.rows.length * this.config.columns.length;
    let n = 0;
    for (const row of this.cells) {
      for (const v of row) { if (v) n++; }
    }
    return n > 0 && n < total;
  }
}
