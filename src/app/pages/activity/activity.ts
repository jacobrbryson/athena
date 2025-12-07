import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ParentService, Child } from 'src/app/services/parent';
import { formatDisplayTime } from 'src/app/shared/date-utils';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule, RouterModule, Breadcrumb],
  templateUrl: './activity.html',
})
export class Activity implements OnInit {
  private route = inject(ActivatedRoute);
  private parentService = inject(ParentService);

  loading = signal<boolean>(true);
  child = signal<Child | null>(null);
  rows = signal<
    { id: any; activity: string; time: string; actor_profile_id?: number | string; actor_name?: string; actor_email?: string }[]
  >([]);
  search = signal<string>('');
  sortField = signal<'activity' | 'time'>('time');
  sortDir = signal<'asc' | 'desc'>('desc');
  page = signal<number>(1);
  pageSize = signal<number>(10);

  childName = computed(() => this.child()?.full_name || this.child()?.name || 'Learner');
  breadcrumbLabels = computed(() => [{ text: `${this.childName()}'s Activity`, bold: true }]);

  filteredRows = computed(() => {
    const term = this.search().toLowerCase().trim();
    if (!term) return this.rows();
    return this.rows().filter((row) => {
      const activity = row.activity?.toLowerCase?.() || '';
      const time = row.time?.toLowerCase?.() || '';
      const actor = this.actorLabel(row).toLowerCase();
      return activity.includes(term) || time.includes(term) || actor.includes(term);
    });
  });

  sortedRows = computed(() => {
    const field = this.sortField();
    const dir = this.sortDir();
    return [...this.filteredRows()].sort((a, b) => {
      let result = 0;
      if (field === 'activity') {
        result = (a.activity || '').localeCompare(b.activity || '');
      } else {
        // default sort by time
        result = (a.time || '').localeCompare(b.time || '');
      }
      return dir === 'asc' ? result : -result;
    });
  });

  displayRows = computed(() => {
    const p = Math.max(1, this.page());
    const size = Math.max(1, this.pageSize());
    const start = (p - 1) * size;
    return this.sortedRows().slice(start, start + size);
  });

  total = computed(() => this.filteredRows().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / Math.max(1, this.pageSize()))));
  rangeStart = computed(() => {
    if (!this.total()) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });
  rangeEnd = computed(() => {
    return Math.min(this.total(), this.page() * this.pageSize());
  });

  async ngOnInit() {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    try {
      // Ensure we have the children list, then find the matching profile.
      await this.parentService.fetchChildren();
      const child = this.parentService.children().find(
        (c) => c.uuid === uuid || (c as any).child_uuid === uuid || `${c.id}` === uuid
      );
      this.child.set(child ?? null);

      const activity = await this.parentService.fetchChildActivity(uuid, { limit: 200 });
      this.rows.set(Array.isArray(activity) ? activity : []);
      this.page.set(1);
    } finally {
      this.loading.set(false);
    }
  }

  formattedTime(value: string) {
    return formatDisplayTime(value);
  }

  setSort(field: 'activity' | 'time') {
    if (this.sortField() === field) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortField.set(field);
      this.sortDir.set(field === 'time' ? 'desc' : 'asc');
    }
    this.page.set(1);
  }

  goToPage(page: number) {
    const next = Math.min(Math.max(1, page), this.totalPages());
    this.page.set(next);
  }

  changePageSize(raw: any) {
    const size = Number(raw);
    if (Number.isFinite(size) && size > 0) {
      this.pageSize.set(size);
      this.page.set(1);
    }
  }

  actorLabel(row: { actor_profile_id?: number | string; actor_name?: string; actor_email?: string }) {
    return (
      row.actor_name?.trim() ||
      row.actor_email?.trim() ||
      (row.actor_profile_id ? `User ${row.actor_profile_id}` : 'Athena')
    );
  }
}
