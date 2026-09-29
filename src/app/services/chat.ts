import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastService } from './toast';
import { ActiveProfileService } from './active-profile';
import { ConversationModeService } from './conversation-mode';
import { ProfileService } from './profile';

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
  private activeProfile = inject(ActiveProfileService);
  private modeService = inject(ConversationModeService);
  private profile = inject(ProfileService);

  messages = signal<Message[]>([]);
  sessionId = signal<string | null>(null);
  wisdomPoints = signal<number>(0);
  learningTargets = signal<Target[]>([]);
  recentLessons = signal<Lesson[]>([]);
  isThinking = signal<boolean>(false);
  wsConnected = signal<boolean>(false);

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
    await this.modeService.loadModes();
    await this.setSessionId();
  }

  /** localStorage key namespaced per active profile so histories stay separate. */
  private sessionStorageKey(): string {
    return `sessionId:${this.activeProfile.storageKey()}`;
  }

  /**
   * The profile uuid to bind the session to. Children already carry their
   * uuid. A parent's active profile defaults to null (an IP-bound session),
   * but a logged-in parent still has a real profile — binding to it lets
   * profile-scoped features (e.g. Connected App grounding) work for the
   * parent's own conversation. Falls back to null for anonymous visitors.
   */
  private async resolveProfileUuid(): Promise<string | null> {
    const active = this.activeProfile.active();
    if (active.profileUuid) return active.profileUuid;
    if (active.kind !== 'parent') return null;
    const loaded = this.profile.profile()?.uuid;
    if (loaded) return loaded;
    try {
      return (await this.profile.fetchProfile())?.uuid ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Re-initialize chat for the currently active profile. Called after a
   * profile switch so each child/parent gets its own session + history.
   */
  async reinitForActiveProfile() {
    this.close();
    this.messages.set([]);
    this.learningTargets.set([]);
    await this.setSessionId();
  }

  /** Switch the conversation mode of the current session (Phase 5). */
  async changeMode(mode: string) {
    this.modeService.setCurrent(mode);
    const sessionId = this.sessionId();
    if (!sessionId) return;
    try {
      const params = new URLSearchParams({ sessionId, mode });
      await firstValueFrom(
        this.http.get(`${environment.proxyServer}/api/v1/session?${params.toString()}`)
      );
    } catch (err) {
      this.handleHttpError(err, 'mode change');
    }
  }

  private async setSessionId() {
    const storageKey = this.sessionStorageKey();
    const storedId = localStorage.getItem(storageKey);
    const context = 'session ID fetch';

    try {
      const params = new URLSearchParams();
      if (storedId) params.set('sessionId', storedId);
      params.set('mode', this.modeService.current());
      const profileUuid = await this.resolveProfileUuid();
      if (profileUuid) params.set('profile_uuid', profileUuid);

      const url = `${environment.proxyServer}/api/v1/session?${params.toString()}`;

      const res: any = await firstValueFrom(this.http.get(url));

      if (res?.session?.uuid) {
        const sessionId = res.session.uuid;
        this.sessionId.set(sessionId);
        localStorage.setItem(storageKey, sessionId);

        this.modeService.setAllowedModes(res.session.allowed_modes);

        if (res.session.mode) {
          this.modeService.setCurrent(res.session.mode);
        }

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
    // The sign-in token rides in the subprotocol list, never the URL: request
    // logs record every URL, and this token is the whole sign-in.
    const protocols = token ? ['athena.v1', `athena.ticket.${token}`] : ['athena.v1'];

    const wsUrl = environment.proxyServer.replace('http', 'ws') + `/ws?${params.toString()}`;

    this.ws = new WebSocket(wsUrl, protocols);

    this.ws.onopen = () => {
      console.log('✅ ChatService: WebSocket connected');
      this.wsConnected.set(true);
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
        if (msg && msg.rpc === 'sessionStatus') {
          if (typeof msg.session?.is_busy === 'boolean') {
            this.isThinking.set(msg.session.is_busy);
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
      this.wsConnected.set(false);
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('ChatService: WebSocket error:', err);
      this.wsConnected.set(false);
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
      this.wsConnected.set(false);
      this.ws.close();
      this.ws = null;
    }
  }
}
