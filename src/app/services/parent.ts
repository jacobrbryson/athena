import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastService } from './toast';

export interface ChildPayload {
  full_name?: string;
  email?: string;
  birthday?: string;
}

export interface Child extends ChildPayload {
  id: number;
  uuid?: string;
  google_id?: string;
  created_at?: string;
  updated_at?: string;
  invited_at?: string | null;
  approved_at?: string | null;
  denied_at?: string | null;
  status?: 'pending' | 'approved' | 'denied' | 'active';
  // UI extras (optional when returned from API)
  name?: string;
  gradeLevel?: string;
  mood?: string;
  avgProgress?: number;
  focus?: string[];
  targets?: { id: number; topic?: string; progress?: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class ParentService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  children = signal<Child[]>([]);
  loading = signal(false);
  saving = signal(false);

  private applyStatus(child: Child): Child {
    const status: Child['status'] =
      child.denied_at ? 'denied' : child.approved_at ? 'approved' : child.invited_at ? 'pending' : 'active';
    return {
      ...child,
      status,
    };
  }

  private handleHttpError(err: any, context: string): void {
    console.error(`ParentService: Error during ${context}:`, err);

    if (err instanceof HttpErrorResponse) {
      const apiMessage = err.error?.message;
      if (apiMessage) {
        this.toastService.show(apiMessage, 'error');
      } else {
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

  async fetchChildren(): Promise<Child[]> {
    if (this.loading()) return this.children();
    this.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.http.get<Child[]>(`${environment.proxyServer}/api/v1/parent/children`)
      );
      const normalized = (result || []).map((c) => this.applyStatus(c)).filter((c) => c.status !== 'denied');
      this.children.set(normalized);
      return normalized;
    } catch (err) {
      this.handleHttpError(err, 'fetch children');
      return this.children();
    } finally {
      this.loading.set(false);
    }
  }

  async addChild(payload: ChildPayload): Promise<Child | null> {
    if (this.saving()) return null;
    this.saving.set(true);
    try {
      const created = await firstValueFrom(
        this.http.post<Child>(`${environment.proxyServer}/api/v1/parent/children`, payload)
      );
      const normalized = this.applyStatus(created);
      const updated = [...this.children(), normalized].filter((c) => c.status !== 'denied');
      this.children.set(updated);
      return normalized;
    } catch (err) {
      this.handleHttpError(err, 'add child');
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  async updateChild(childId: number, payload: ChildPayload): Promise<Child | null> {
    if (this.saving()) return null;
    this.saving.set(true);
    try {
      const updatedChild = await firstValueFrom(
        this.http.put<Child>(
          `${environment.proxyServer}/api/v1/parent/children/${childId}`,
          payload
        )
      );
      const normalized = this.applyStatus(updatedChild);
      const next = this.children()
        .map((c) => (c.id === childId ? { ...c, ...normalized } : c))
        .filter((c) => c.status !== 'denied');
      this.children.set(next);
      return normalized;
    } catch (err) {
      this.handleHttpError(err, 'update child');
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  async deleteChild(childId: number): Promise<boolean> {
    if (this.saving()) return false;
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${environment.proxyServer}/api/v1/parent/children/${childId}`)
      );
      this.children.set(this.children().filter((c) => c.id !== childId));
      return true;
    } catch (err) {
      this.handleHttpError(err, 'delete child');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private async handleDecision(
    childId: number,
    action: 'approve' | 'deny'
  ): Promise<Child | null> {
    if (this.saving()) return null;
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(
        this.http.post<Child>(
          `${environment.proxyServer}/api/v1/parent/children/${childId}/${action}`,
          {}
        )
      );
      const normalized = this.applyStatus(updated);
      this.children.set(
        this.children().map((c) => (c.id === childId ? { ...c, ...normalized } : c))
      );
      return normalized;
    } catch (err) {
      this.handleHttpError(err, `${action} child invite`);
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  approveChild(childId: number): Promise<Child | null> {
    return this.handleDecision(childId, 'approve');
  }

  denyChild(childId: number): Promise<Child | null> {
    return this.handleDecision(childId, 'deny');
  }

  async blockChild(childId: number): Promise<boolean> {
    if (this.saving()) return false;
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.proxyServer}/api/v1/parent/children/${childId}/block`, {})
      );
      this.children.set(this.children().filter((c) => c.id !== childId));
      return true;
    } catch (err) {
      this.handleHttpError(err, 'block child');
      return false;
    } finally {
      this.saving.set(false);
    }
  }
}
