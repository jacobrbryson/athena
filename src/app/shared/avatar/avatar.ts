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
  @Input() picture: string | null = '';
  @Input() full_name: string | Record<string, any> | null = '';
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

  get initialLetter(): string | null {
    const label = this.nameLabel;
    const first = label ? label.charAt(0) : '';
    return first ? first.toUpperCase() : null;
  }

  get nameLabel(): string {
    const value = this.full_name as any;
    if (typeof value === 'string') {
      return value.trim();
    }

    if (value && typeof value === 'object') {
      const maybeName =
        value.full_name ||
        value.fullName ||
        value.name ||
        value.display_name ||
        value.displayName;

      if (typeof maybeName === 'string') {
        return maybeName.trim();
      }

      const first = typeof value.first_name === 'string' ? value.first_name.trim() : '';
      const last = typeof value.last_name === 'string' ? value.last_name.trim() : '';
      const combined = `${first} ${last}`.trim();
      if (combined) return combined;
    }

    return '';
  }

  get pictureUrl(): string | null {
    if (typeof this.picture === 'string' && this.picture.trim().length) {
      return this.picture;
    }
    return null;
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}
