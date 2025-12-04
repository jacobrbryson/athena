import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from 'src/app/services/chat'; // Import the new interface
import { UnityPlayerComponent } from 'src/app/shared/unity/unity';
import { ChatInput } from '../shared/chat-input/chat-input';
import { ChatPreviewComponent } from './chat-preview/chat-preview';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, UnityPlayerComponent, ChatPreviewComponent, ChatInput],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
})
export class Chat implements OnInit, OnDestroy {
  @ViewChild(ChatPreviewComponent) chatPreview!: ChatPreviewComponent;
  @ViewChild(ChatInput) chatInputComponent!: ChatInput;

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

    if (this.chatPreview && !this.chatPreview.isDrawerOpen) {
      this.chatPreview.openDrawer();
    }

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
      this.chatPreview.focusInput();
    }
  }
}
