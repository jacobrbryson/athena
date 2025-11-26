import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-input.html',
  styleUrls: ['./chat-input.css'],
})
export class ChatInput {
  @ViewChild('messageInput') inputElement!: ElementRef<HTMLInputElement>;
  @Input({ required: true }) message!: WritableSignal<string>;
  @Input({ required: true }) sendMessage!: () => Promise<void>;

  isSendingInternal = signal(false);

  @Input({ required: true }) set isSending(value: Signal<boolean>) {
    const wasSending = this.isSendingInternal();
    this.isSendingInternal.set(value());
    if (wasSending && !value()) {
      setTimeout(() => {
        this.inputElement.nativeElement.focus();
      }, 0);
    }
  }

  get isSending() {
    return this.isSendingInternal.asReadonly();
  }

  public focusInput() {
    this.inputElement.nativeElement.focus();
  }
}
