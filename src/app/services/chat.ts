import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastService } from './toast';

export interface Message {
  uuid: string;
  is_human: boolean;
  text: string;
  created_at?: string | number; // optional ISO or epoch for display
}

// 💡 Existing: Define the Target interface here so it can be used within the service
export interface Target {
  id: number;
  topic_name: string;
  proficiency: number;
}

// 💡 NEW: Define the Lesson interface
export interface Lesson {
  id: number;
  title: string;
  summary: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  // Dependencies injected using the modern 'inject' function
  private http = inject(HttpClient);
  private toastService = inject(ToastService); // Public state exposed as signals

  messages = signal<Message[]>([]);
  sessionId = signal<string | null>(null);
  wisdomPoints = signal<number>(0);
  learningTargets = signal<Target[]>([]);
  recentLessons = signal<Lesson[]>([]);
  isThinking = signal<boolean>(false);

  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;

  private handleHttpError(err: any, context: string): void {
    console.error(`ChatService: Error during ${context}:`, err); // Check if the error is an Angular HttpErrorResponse

    if (err instanceof HttpErrorResponse) {
      // API message is typically on err.error if the response was JSON
      const apiMessage = err.error?.message;

      if (apiMessage) {
        // Show the specific message from the JSON payload
        this.toastService.show(apiMessage, 'error');
      } else {
        // Fallback for network issues or non-JSON errors
        this.toastService.show(
          `API call failed during ${context}. Status: ${err.statusText || 'Unknown Error'}`,
          'error'
        );
      }
    } else {
      this.toastService.show(
        `An unexpected client error occurred: ${err.message || 'Unknown'}`,
        'error'
      );
    }
  }

  async init() {
    await this.setSessionId();
  }

  private async setSessionId() {
    const storedId = localStorage.getItem('sessionId');
    const context = 'session ID fetch';

    try {
      const url = storedId
        ? `${environment.proxyServer}/api/v1/session?sessionId=${storedId}`
        : `${environment.proxyServer}/api/v1/session`;

      const res: any = await firstValueFrom(this.http.get(url));

      if (res?.session?.uuid) {
        const sessionId = res.session.uuid;
        this.sessionId.set(sessionId);
        localStorage.setItem('sessionId', sessionId);

        if (res.session.wisdom_points !== undefined && res.session.wisdom_points !== null) {
          this.wisdomPoints.set(res.session.wisdom_points);
          console.log('ChatService: Wisdom Points set to:', res.session.wisdom_points);
        }

        await this.getMessages();

        await this.getLearningTargets();

        // 💡 NEW: Fetch recent lessons after setting sessionId
        await this.getRecentLessons();

        this.connectWebSocket();
      } else {
        console.error('ChatService: API did not return a valid sessionId.');
      }
    } catch (err) {
      this.handleHttpError(err, context);
      console.error('ChatService: Error fetching session ID:', err);
    }
  }

  private async getMessages() {
    const currentSessionId = this.sessionId();
    const context = 'message history fetch';

    if (!currentSessionId) return;

    try {
      const url = `${environment.proxyServer}/api/v1/message?sessionId=${currentSessionId}`;
      console.log('ChatService: Fetching message history:', url);

      const messages: Message[] = await firstValueFrom(this.http.get<Message[]>(url));

      if (Array.isArray(messages)) {
        this.messages.set(messages);
        console.log(`ChatService: Loaded ${messages.length} messages from history.`);
      } else {
        console.warn('ChatService: History endpoint did not return an array.');
      }
    } catch (err) {
      this.handleHttpError(err, context);
      console.error('ChatService: Error fetching message history:', err);
    }
  }

  private async getLearningTargets() {
    const currentSessionId = this.sessionId();
    const context = 'learning targets fetch';

    if (!currentSessionId) return;

    try {
      const url = `${environment.proxyServer}/api/v1/session/${currentSessionId}/topic`;
      console.log('ChatService: Fetching learning targets:', url);

      const targets: Target[] = await firstValueFrom(this.http.get<Target[]>(url));

      if (Array.isArray(targets)) {
        this.learningTargets.set(targets);

        console.log(`ChatService: Loaded ${this.learningTargets().length} learning targets.`);
      } else {
        console.warn('ChatService: Targets endpoint did not return an array. Using empty array.');
        this.learningTargets.set([]);
      }
    } catch (err) {
      this.handleHttpError(err, context);
      console.error('ChatService: Error fetching learning targets:', err);
      this.learningTargets.set([]);
    }
  }

  // 💡 NEW: Method to fetch recent lessons
  private async getRecentLessons() {
    const currentSessionId = this.sessionId();
    const context = 'recent lessons fetch';

    if (!currentSessionId) return;

    try {
      // Assuming a new API endpoint for fetching lessons
      const url = `${environment.proxyServer}/api/v1/session/${currentSessionId}/lessons`;
      console.log('ChatService: Fetching recent lessons:', url);

      // Assuming the API returns an array of Lesson objects
      const lessons: Lesson[] = await firstValueFrom(this.http.get<Lesson[]>(url));

      if (Array.isArray(lessons)) {
        this.recentLessons.set(lessons);
        console.log(`ChatService: Loaded ${lessons.length} recent lessons.`);
      } else {
        console.warn('ChatService: Lessons endpoint did not return an array. Using empty array.');
        this.recentLessons.set([]);
      }
    } catch (err) {
      this.handleHttpError(err, context);
      console.error('ChatService: Error fetching recent lessons:', err);
      this.recentLessons.set([]);
    }
  }

  async sendMessage(text: string): Promise<any> {
    const currentSessionId = this.sessionId();
    const context = 'message send';
    if (!currentSessionId) {
      throw new Error('ChatService: Cannot send message, session ID is missing.');
    }

    try {
      const res: any = await firstValueFrom(
        this.http.post<any>(`${environment.proxyServer}/api/v1/message`, {
          text,
          sessionId: currentSessionId,
        })
      );

      if (res && res.message) {
        this.messages.update((msgs) => [...msgs, res.message]);
      }

      return res;
    } catch (err) {
      this.handleHttpError(err, context);
      console.error('ChatService: Error sending message:', err);
      throw err;
    }
  }

  updateTargetProficiency(topic_name: string, newProficiency: number) {
    this.learningTargets.update((targets) =>
      targets.map((t) => (t.topic_name === topic_name ? { ...t, proficiency: newProficiency } : t))
    );
  }

  addWisdomPoints(points: number) {
    this.wisdomPoints.update((current) => current + points);
  }

  // 💡 NEW: Method to add a lesson from the component
  addLesson(lesson: Lesson) {
    this.recentLessons.update((lessons) => [lesson, ...lessons]);
  }

  // --- WebSocket Logic ---

  private connectWebSocket() {
    const session = this.sessionId();
    if (!session) return;

    const token = localStorage.getItem('auth_token') || '';
    const params = new URLSearchParams({ sessionId: session });
    if (token) {
      params.set('token', token);
    }

    const wsUrl = environment.proxyServer.replace('http', 'ws') + `/ws?${params.toString()}`;

    console.log('ChatService: Connecting WebSocket:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ ChatService: WebSocket connected');
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg && msg.rpc === 'addMessage') {
          this.messages.update((msgs) => [...msgs, msg.message]);
          if (msg.session?.is_busy === false) {
            this.isThinking.set(false);
          }
        }
        if (msg && msg.rpc === 'addSessionTopic')
          this.learningTargets.update((msgs) => [...msgs, msg.topic]);
        if (msg && msg.rpc === 'updateSessionTopic')
          this.updateTargetProficiency(msg.topic.topic_name, msg.topic.proficiency);
        console.log('📩 ChatService: Incoming WS message:', msg);
      } catch (err) {
        console.error('ChatService: Invalid JSON from WS:', err);
      }
    };

    this.ws.onclose = () => {
      console.warn('⚠️ ChatService: WebSocket closed, retrying in 2s...');
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('ChatService: WebSocket error:', err);
      this.ws?.close();
    };
  } /** Auto reconnect (lightweight) */

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, 2000);
  } /** Clean close, called by the component's ngOnDestroy */

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      console.log('ChatService: Closing WebSocket connection');
      this.ws.close();
      this.ws = null;
    }
  }
}
