import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastService } from './toast';

export interface ChildPayload {
  full_name?: string;
  email?: string;
  birthday?: string;
  profile_editing_locked?: boolean;
}

export interface Child extends ChildPayload {
  id: number;
  uuid?: string;
  child_uuid?: string;
  google_id?: string;
  created_at?: string;
  updated_at?: string;
  invited_at?: string | null;
  approved_at?: string | null;
  denied_at?: string | null;
  status?: 'pending' | 'approved' | 'denied' | 'active';
  profile_editing_locked?: boolean;
  // UI extras (optional when returned from API)
  name?: string;
  gradeLevel?: string;
  mood?: string;
  avgProgress?: number;
  level?: number;
  level_progress?: number;
  focus?: string[];
  wisdom_points?: number;
  wisdomPoints?: number;
  picture?: string;
  targets?: { id: number; topic?: string; progress?: number }[];
}

export interface ChildGoal {
  id: number;
  topic: string;
  progress: number;
  status?: string;
  created_by?: 'parent' | 'child' | 'teacher' | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedGoals {
  items: ChildGoal[];
  total: number;
  page: number;
  pageSize: number;
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
    const uuid = child.uuid || (child as any).child_uuid || child.google_id;
    const status: Child['status'] =
      child.denied_at ? 'denied' : child.approved_at ? 'approved' : child.invited_at ? 'pending' : 'active';
    return {
      ...child,
      uuid,
      child_uuid: uuid,
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

  private matchesChild(target: string | number, child: Child): boolean {
    const uuid = child.uuid || (child as any).child_uuid;
    return child.id === target || uuid === target || `${child.id}` === `${target}`;
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

  async updateChild(childId: number | string, payload: ChildPayload): Promise<Child | null> {
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
        .map((c) => (this.matchesChild(childId, c) ? { ...c, ...normalized } : c))
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

  async deleteChild(childId: number | string): Promise<boolean> {
    if (this.saving()) return false;
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${environment.proxyServer}/api/v1/parent/children/${childId}`)
      );
      this.children.set(this.children().filter((c) => !this.matchesChild(childId, c)));
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

  async fetchChildGoals(
    childId: number | string
  ): Promise<{ id: number; topic: string; progress: number }[]> {
    if (!childId) return [];
    try {
      const goals = await firstValueFrom(
        this.http.get<{ id: number; topic: string; progress: number }[]>(
          `${environment.proxyServer}/api/v1/parent/children/${childId}/goals`
        )
      );
      // Attach to child in cache for quick reuse
      this.children.set(
        this.children().map((c) => (this.matchesChild(childId, c) ? { ...c, targets: goals } : c))
      );
      return goals || [];
    } catch (err) {
      this.handleHttpError(err, 'fetch child goals');
      return [];
    }
  }

  async fetchChildGoalsPaginated(
    childId: number | string,
    page: number,
    pageSize: number,
    opts: { includeDeleted?: boolean; activeOnly?: boolean } = {}
  ): Promise<PaginatedGoals> {
    if (!childId) return { items: [], total: 0, page: 1, pageSize };
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
    const includeDeleted = opts.includeDeleted === true;
    const activeOnly = opts.activeOnly !== false; // default true

    try {
      const goals = await firstValueFrom(
        this.http.get<PaginatedGoals | ChildGoal[]>(
          `${environment.proxyServer}/api/v1/parent/children/${childId}/goals`,
          {
            params: {
              page: safePage,
              page_size: safePageSize,
              include_deleted: includeDeleted,
              active_only: activeOnly,
            } as any,
          }
        )
      );

      if (Array.isArray(goals)) {
        return { items: goals, total: goals.length, page: 1, pageSize: goals.length || safePageSize };
      }

      return {
        items: goals.items || [],
        total: goals.total ?? 0,
        page: goals.page ?? safePage,
        pageSize: goals.pageSize ?? safePageSize,
      };
    } catch (err) {
      this.handleHttpError(err, 'fetch child goals (paginated)');
      return { items: [], total: 0, page: safePage, pageSize: safePageSize };
    }
  }

  async addChildGoal(childId: number | string, topic: string): Promise<ChildGoal | null> {
    if (!childId || !topic?.trim()) return null;
    try {
      const goal = await firstValueFrom(
        this.http.post<ChildGoal>(`${environment.proxyServer}/api/v1/parent/children/${childId}/goals`, {
          topic: topic.trim(),
        })
      );
      return goal;
    } catch (err) {
      this.handleHttpError(err, 'add child goal');
      return null;
    }
  }

  async deleteChildGoal(childId: number | string, goalId: number | string): Promise<boolean> {
    if (!childId || !goalId) return false;
    try {
      await firstValueFrom(
        this.http.delete(`${environment.proxyServer}/api/v1/parent/children/${childId}/goals/${goalId}`)
      );
      return true;
    } catch (err) {
      this.handleHttpError(err, 'delete child goal');
      return false;
    }
  }

  async fetchChildActivity(
    childId: number | string
  ): Promise<{ id: number; activity: string; time: string }[]> {
    if (!childId) return [];
    try {
      const activity = await firstValueFrom(
        this.http.get<{ id: number; activity: string; time: string }[]>(
          `${environment.proxyServer}/api/v1/parent/children/${childId}/activity`
        )
      );
      return activity || [];
    } catch (err) {
      this.handleHttpError(err, 'fetch child activity');
      return [];
    }
  }
}
