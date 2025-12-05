import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.html',
  styleUrls: ['./avatar.css'],
})
export class Avatar implements OnChanges {
  @Input() picture?: any;
  @Input() name?: any;
  @Input() sizeClass = 'w-9 h-9';
  @Input() bgClass = 'bg-teal-200';
  @Input() borderClass = 'border border-teal-100';
  imageFailed = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['picture']) {
      // Reset failure state when a new picture is provided so it can try to load again.
      this.imageFailed = false;
    }
  }

  get initial(): string {
    const source = this.displayName;
    const first = typeof source === 'string' ? source.trim().charAt(0) : '';
    return first ? first.toUpperCase() : '?';
  }

  get displayName(): string {
    if (typeof this.name === 'string') {
      const text = this.name.trim();
      return text === '[object Object]' ? '' : text;
    }
    if (this.name && typeof this.name === 'object') {
      const candidate = this.name.full_name || this.name.fullName || this.name.name;
      if (typeof candidate === 'string') {
        const text = candidate.trim();
        if (text && text !== '[object Object]') return text;
      }
      const maybeToString = typeof this.name.toString === 'function' ? this.name.toString() : '';
      if (typeof maybeToString === 'string') {
        const text = maybeToString.trim();
        if (text && text !== '[object Object]') return text;
      }
    }
    return '';
  }

  get pictureUrl(): string | null {
    if (typeof this.picture === 'string' && this.picture.trim().length) {
      return this.picture;
    }
    if (this.picture && typeof this.picture === 'object') {
      const candidate = this.picture.url || this.picture.src || this.picture.href || this.picture.data;
      if (typeof candidate === 'string' && candidate.trim().length) {
        return candidate;
      }
    }
    return null;
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}
