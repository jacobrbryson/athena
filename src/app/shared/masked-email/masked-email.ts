import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-masked-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './masked-email.html',
  styleUrl: './masked-email.css',
})
export class MaskedEmail {
  @Input() email: string | null | undefined = '';
  @Input() variant: 'inline' | 'input' = 'inline';

  emailVisible = signal<boolean>(false);

  get masked(): string {
    const value = this.email || '';
    const [local, domain] = value.split('@');
    if (!domain) return value;
    const prefix = local.slice(0, 3);
    return `${prefix}${local.length > 3 ? '***' : ''}@${domain}`;
  }

  toggleVisibility() {
    this.emailVisible.update((v) => !v);
  }
}
