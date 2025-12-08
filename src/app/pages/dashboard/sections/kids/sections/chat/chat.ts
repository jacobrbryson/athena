import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService, Message } from 'src/app/services/chat'; // Import the new interface
import { ChatInput } from '../shared/chat-input/chat-input';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatInput],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
})
export class Chat implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild(ChatInput) chatInputComponent?: ChatInput;

  private chatService = inject(ChatService);

  message = signal('');
  isSending = signal(false);

  // Expose service state to the template for display
  messages = this.chatService.messages;
  sessionId = this.chatService.sessionId;
  isThinking = this.chatService.isThinking;

  constructor() {
    this.sendMessage = this.sendMessage.bind(this);
  }

  ngOnInit(): void {
    // Start the chat service initialization (session and connection)
    this.chatService.init();
  }

  ngOnDestroy(): void {
    // Delegate cleanup to the service
    this.chatService.close();
  }

  async sendMessage() {
    const text = this.message().trim();

    // Check pre-requisites
    if (!text || this.isSending()) return;

    this.isSending.set(true);
    this.message.set('');

    this.isThinking.set(true);

    try {
      await this.chatService.sendMessage(text);
    } catch (err) {
      console.error('Failed to send message:', err);
      this.isThinking.set(false);
    } finally {
      this.isSending.set(false);
      this.focusInput();
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  trackById(index: number, item: Message) {
    return item.uuid ?? index;
  }

  formatTimestamp(ts?: string | number) {
    if (!ts) return '';
    try {
      const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  }

  private focusInput() {
    this.chatInputComponent?.focusInput();
  }
}
