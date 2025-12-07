import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastService } from './toast';

export interface ChildPayload {
  full_name: string;
  email: string;
  birthday: string;
  grade?: string;
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
  grade?: string;
  name?: string;
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
  created_by_profile_id?: number | null;
  created_by_email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedGoals {
  items: ChildGoal[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GuardianSummary {
  full_name?: string;
  relation?: string | null;
  invited_at?: string | null;
  approved_at?: string | null;
  status?: 'linked' | 'invited';
  created_at?: string | null;
  picture?: string | null;
}

export interface SiblingSummary {
  full_name?: string;
  grade?: string;
  birthday?: string;
  relation?: string | null;
  level?: number | null;
  level_progress?: number | null;
  picture?: string | null;
}

type Decision = 'approve' | 'deny';

@Injectable({
  providedIn: 'root',
})
export class ParentService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  children = signal<Child[]>([]);
  loading = signal(false);
  saving = signal(false);

  // --- Public API: Children -------------------------------------------------

  async fetchChildren(): Promise<Child[]> {
    if (this.loading()) return this.children();
    this.loading.set(true);
    try {
      const result = await this.apiGet<Child[]>('/children');
      const normalized = (result || [])
        .map((c) => this.applyStatus(c))
        .filter((c) => c.status !== 'denied');
      this.children.set(normalized);
      return normalized;
    } finally {
      this.loading.set(false);
    }
  }

  async addChild(payload: ChildPayload): Promise<Child | null> {
    return this.withSaving(async () => {
      const created = await this.apiPost<Child>('/children', payload);
      const normalized = this.applyStatus(created);
      const updated = [...this.children(), normalized].filter((c) => c.status !== 'denied');
      this.children.set(updated);
      return normalized;
    });
  }

  async updateChild(childId: number | string, payload: ChildPayload): Promise<Child | null> {
    const result = await this.withSaving(async () => {
      const updatedChild = await this.apiPut<Child>(`/children/${childId}`, payload);
      const normalized = this.applyStatus(updatedChild);
      const next = this.children()
        .map((c) => (this.matchesChild(childId, c) ? { ...c, ...normalized } : c))
        .filter((c) => c.status !== 'denied');
      this.children.set(next);
      return normalized;
    });
    return result;
  }

  async deleteChild(childId: number | string): Promise<boolean> {
    const result = await this.withSaving(async () => {
      await this.apiDelete<void>(`/children/${childId}`);
      this.children.set(this.children().filter((c) => !this.matchesChild(childId, c)));
      return true;
    });
    return result ?? false;
  }

  approveChild(childId: number): Promise<Child | null> {
    return this.handleDecision(childId, 'approve');
  }

  denyChild(childId: number): Promise<Child | null> {
    return this.handleDecision(childId, 'deny');
  }

  async blockChild(childId: number): Promise<boolean> {
    const result = await this.withSaving(async () => {
      await this.apiPost(`/children/${childId}/block`, {});
      this.children.set(this.children().filter((c) => c.id !== childId));
      return true;
    });
    return result ?? false;
  }

  // --- Public API: Goals ----------------------------------------------------

  async fetchChildGoals(
    childId: number | string,
    options: { limit?: number; activeOnly?: boolean; orderBy?: 'progress_desc' | 'created_at' } = {}
  ): Promise<{ id: number; topic: string; progress: number }[]> {
    if (!childId) return [];
    const params: Record<string, any> = {};
    if (options.limit) params['limit'] = options.limit;
    if (options.activeOnly !== undefined) params['active_only'] = options.activeOnly;
    if (options.orderBy) params['order_by'] = options.orderBy;

    const goals = await this.apiGet<{ id: number; topic: string; progress: number }[]>(
      `/children/${childId}/goals`,
      params
    );
    this.children.set(
      this.children().map((c) => (this.matchesChild(childId, c) ? { ...c, targets: goals } : c))
    );
    return goals || [];
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
    const activeOnly = opts.activeOnly !== false;

    const params: Record<string, any> = {
      page: safePage,
      page_size: safePageSize,
      include_deleted: includeDeleted,
      active_only: activeOnly,
    };

    const goals = await this.apiGet<PaginatedGoals | ChildGoal[]>(
      `/children/${childId}/goals`,
      params
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
  }

  async addChildGoal(childId: number | string, topic: string): Promise<ChildGoal | null> {
    if (!childId || !topic?.trim()) return null;
    return this.apiPost<ChildGoal>(`/children/${childId}/goals`, { topic: topic.trim() });
  }

  async deleteChildGoal(
    childId: number | string,
    goalId: number | string,
    opts: { markComplete?: boolean } = {}
  ): Promise<boolean> {
    if (!childId || !goalId) return false;
    await this.apiDelete<void>(
      `/children/${childId}/goals/${goalId}`,
      opts.markComplete ? { mark_complete: 'true' } : {}
    );
    return true;
  }

  async fetchChildActivity(
    childId: number | string,
    options: { limit?: number } = {}
  ): Promise<{ id: number; activity: string; time: string }[]> {
    if (!childId) return [];
    const params: Record<string, any> = {};
    if (options.limit) params['limit'] = options.limit;
    return this.apiGet<{ id: number; activity: string; time: string }[]>(
      `/children/${childId}/activity`,
      params
    ).catch(() => []);
  }

  async fetchChildGuardians(childId: number | string): Promise<GuardianSummary[]> {
    if (!childId) return [];
    try {
      const guardians = await this.apiGet<any[]>(`/children/${childId}/guardians`);
      return (guardians || []).map((g) => ({
        full_name: g.full_name || g.name || 'Guardian',
        relation: g.relation || g.relationship || null,
        invited_at: g.invited_at || null,
        approved_at: g.approved_at || null,
        created_at: g.created_at || null,
        picture: g.picture || null,
        status: g.approved_at ? 'linked' : 'invited',
      }));
    } catch (err) {
      console.error('ParentService: Failed to fetch child guardians', err);
      this.toastService.show('Unable to load guardians right now.', 'error');
      return [];
    }
  }

  async fetchChildSiblings(childId: number | string): Promise<SiblingSummary[]> {
    if (!childId) return [];
    try {
      const siblings = await this.apiGet<any[]>(`/children/${childId}/siblings`);
      return (siblings || []).map((s) => ({
        full_name: s.full_name || s.name || 'Sibling',
        grade: this.normalizeGrade((s as any).grade),
        birthday:
          typeof s.birthday === 'string' && s.birthday.length >= 10
            ? s.birthday.slice(0, 10)
            : undefined,
        relation: s.relation || s.relationship || null,
        level: Number.isFinite(s.level) ? Number(s.level) : null,
        level_progress: Number.isFinite(s.level_progress)
          ? Math.max(0, Math.min(100, Number(s.level_progress)))
          : null,
        picture: s.picture || null,
      }));
    } catch (err) {
      console.error('ParentService: Failed to fetch siblings', err);
      this.toastService.show('Unable to load siblings right now.', 'error');
      return [];
    }
  }

  // --- Internal helpers -----------------------------------------------------

  private endpoint(path: string): string {
    return `${environment.proxyServer}/api/v1/parent${path}`;
  }

  private async apiGet<T>(path: string, params?: Record<string, any>): Promise<T> {
    try {
      return await firstValueFrom(this.http.get<T>(this.endpoint(path), { params }));
    } catch (err) {
      this.handleHttpError(err, `GET ${path}`);
      throw err;
    }
  }

  private async apiPost<T>(path: string, body: any): Promise<T> {
    try {
      return await firstValueFrom(this.http.post<T>(this.endpoint(path), body));
    } catch (err) {
      this.handleHttpError(err, `POST ${path}`);
      throw err;
    }
  }

  private async apiPut<T>(path: string, body: any): Promise<T> {
    try {
      return await firstValueFrom(this.http.put<T>(this.endpoint(path), body));
    } catch (err) {
      this.handleHttpError(err, `PUT ${path}`);
      throw err;
    }
  }

  private async apiDelete<T>(path: string, params?: Record<string, any>): Promise<T> {
    try {
      return await firstValueFrom(this.http.delete<T>(this.endpoint(path), { params }));
    } catch (err) {
      this.handleHttpError(err, `DELETE ${path}`);
      throw err;
    }
  }

  private async handleDecision(childId: number, action: Decision): Promise<Child | null> {
    return this.withSaving(async () => {
      const updated = await this.apiPost<Child>(`/children/${childId}/${action}`, {});
      const normalized = this.applyStatus(updated);
      this.children.set(
        this.children().map((c) => (c.id === childId ? { ...c, ...normalized } : c))
      );
      return normalized;
    });
  }

  private async withSaving<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.saving()) return null;
    this.saving.set(true);
    try {
      return await fn();
    } catch {
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  private applyStatus(child: Child): Child {
    const uuid = child.uuid || (child as any).child_uuid || child.google_id;
    const grade = this.normalizeGrade((child as any).grade);
    const status: Child['status'] = child.denied_at
      ? 'denied'
      : child.approved_at
      ? 'approved'
      : child.invited_at
      ? 'pending'
      : 'active';
    return {
      ...child,
      uuid,
      child_uuid: uuid,
      grade,
      status,
    };
  }

  private matchesChild(target: string | number, child: Child): boolean {
    const uuid = child.uuid || (child as any).child_uuid;
    return child.id === target || uuid === target || `${child.id}` === `${target}`;
  }

  private normalizeGrade(value?: string | null): string {
    if (typeof value !== 'string') return '';
    const normalized = value.trim().toLowerCase();
    return normalized;
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
}
