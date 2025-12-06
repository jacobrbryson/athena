import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ChildGoal, PaginatedGoals, ParentService } from 'src/app/services/parent';
import { Breadcrumb, Crumb } from 'src/app/shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-learning-goals',
  standalone: true,
  imports: [CommonModule, RouterModule, Breadcrumb],
  templateUrl: './learning-goals.html',
})
export class LearningGoals implements OnInit {
  private parentService = inject(ParentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  childIdentifier = signal<string | number | null>(null);
  childName = signal<string>('Learner');
  goals = signal<ChildGoal[]>([]);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(10);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  newGoal = signal<string>('');
  activeOnly = signal<boolean>(true);
  search = signal<string>('');
  sortField = signal<'topic' | 'progress' | 'status' | 'created_by' | 'updated_at'>('progress');
  sortDir = signal<'asc' | 'desc'>('desc');
  showDetails = signal<boolean>(false);
  filtersMenuOpen = signal<boolean>(false);
  showAddModal = signal<boolean>(false);
  filterAge = signal<string>('all');
  filterGrade = signal<string>('all');
  filterSubject = signal<string>('all');
  catalogSelections = signal<Record<number, boolean>>({});
  confirmDeleteState = signal<{ goalId: number; message: string; markComplete: boolean } | null>(
    null
  );

  catalogGoals = signal<
    { id: number; topic: string; age: string; grade: string; subject: string }[]
  >([
    { id: 1, topic: 'Read 20 minutes daily', age: '8-10', grade: '3-4', subject: 'Language Arts' },
    { id: 2, topic: 'Master multiplication tables', age: '8-10', grade: '3-4', subject: 'Math' },
    {
      id: 3,
      topic: 'Write a 5-sentence paragraph',
      age: '10-12',
      grade: '5-6',
      subject: 'Language Arts',
    },
    {
      id: 4,
      topic: 'Complete a science fair project',
      age: '10-12',
      grade: '5-6',
      subject: 'Science',
    },
    {
      id: 5,
      topic: 'Learn fractions with word problems',
      age: '10-12',
      grade: '5-6',
      subject: 'Math',
    },
    {
      id: 6,
      topic: 'Research a historical figure',
      age: '12-14',
      grade: '7-8',
      subject: 'History',
    },
  ]);

  breadcrumbLabels = computed<Crumb[]>(() => {
    const childLabel = this.childName() || 'Learner';
    return [
      {
        text: childLabel,
      },
      { text: 'Learning Goals', bold: true },
    ];
  });

  ngOnInit(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.childIdentifier.set(uuid);
    this.resolveChildName(uuid);
    this.loadGoals();
  }

  private matchesChild(target: string | number, child: any): boolean {
    const uuid = child.uuid || child.child_uuid;
    return child.id === target || uuid === target || `${child.id}` === `${target}`;
  }

  private async resolveChildName(identifier: string): Promise<void> {
    const ensureChildren = this.parentService.children().length
      ? Promise.resolve(this.parentService.children())
      : this.parentService.fetchChildren();

    const list = await ensureChildren;
    const found = (list || []).find((c: any) => this.matchesChild(identifier, c));
    if (found) {
      this.childName.set(found.full_name || found.name || 'Learner');
      // Prefer relationship id for faster lookups if present.
      this.childIdentifier.set(found.id ?? identifier);
    }
  }

  async loadGoals(page = this.page(), pageSize = this.pageSize()): Promise<void> {
    const childId = this.childIdentifier();
    if (!childId) return;
    this.loading.set(true);
    try {
      const result: PaginatedGoals = await this.parentService.fetchChildGoalsPaginated(
        childId,
        page,
        pageSize,
        { includeDeleted: !this.activeOnly(), activeOnly: this.activeOnly() }
      );
      this.goals.set(result.items || []);
      this.total.set(result.total || 0);
      this.page.set(result.page || 1);
      this.pageSize.set(result.pageSize || pageSize);
      this.syncCatalogSelections();
    } finally {
      this.loading.set(false);
    }
  }

  totalPages(): number {
    const perPage = this.pageSize() || 1;
    return Math.max(1, Math.ceil(this.total() / perPage));
  }

  rangeStart(): number {
    if (this.total() === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  }

  rangeEnd(): number {
    if (this.total() === 0) return 0;
    const tentative = (this.page() - 1) * this.pageSize() + this.pageSize();
    return tentative > this.total() ? this.total() : tentative;
  }

  goToPage(next: number): void {
    const clamped = Math.min(Math.max(1, next), this.totalPages());
    if (clamped === this.page()) return;
    this.loadGoals(clamped, this.pageSize());
  }

  changePageSize(nextSize: number | string): void {
    const parsed = Number(nextSize);
    const size = Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : 10, 100));
    this.pageSize.set(size);
    this.loadGoals(1, size);
  }

  toggleActiveOnly(checked: boolean): void {
    this.activeOnly.set(checked);
    this.loadGoals(1, this.pageSize());
  }

  toggleFiltersMenu(): void {
    this.filtersMenuOpen.update((v) => !v);
  }

  closeFiltersMenu(): void {
    this.filtersMenuOpen.set(false);
  }

  async addGoal(): Promise<void> {
    const childId = this.childIdentifier();
    const topic = this.newGoal().trim();
    if (!childId || !topic || this.saving()) return;
    this.saving.set(true);
    try {
      const created = await this.parentService.addChildGoal(childId, topic);
      if (created) {
        this.newGoal.set('');
        await this.loadGoals(1, this.pageSize());
      }
    } finally {
      this.saving.set(false);
    }
  }

  async deleteGoal(goalId: number): Promise<void> {
    const childId = this.childIdentifier();
    if (!childId || !goalId) return;
    const goal = (this.goals() || []).find((g) => g.id === goalId);
    const progress = Number(goal?.progress) || 0;

    if (progress > 0) {
      const isComplete = progress >= 100;
      const message = isComplete
        ? 'This goal is already at 100%. Removing it will set the status to complete.'
        : 'This goal has progress. You can add it back later (child, parent, or teacher).';
      this.confirmDeleteState.set({ goalId, message, markComplete: isComplete });
      return;
    }

    await this.executeDelete(childId, goalId, false);
  }

  async confirmDelete(): Promise<void> {
    const state = this.confirmDeleteState();
    const childId = this.childIdentifier();
    if (!state || !childId) return;
    await this.executeDelete(childId, state.goalId, state.markComplete);
    this.confirmDeleteState.set(null);
  }

  cancelDelete(): void {
    this.confirmDeleteState.set(null);
  }

  private async executeDelete(childId: number | string, goalId: number, markComplete: boolean) {
    const ok = await this.parentService.deleteChildGoal(childId, goalId, { markComplete });
    if (ok) {
      const nextTotal = this.total() - 1;
      const perPage = this.pageSize();
      const maxPage = Math.max(1, Math.ceil(nextTotal / perPage));
      const targetPage = Math.min(this.page(), maxPage);
      await this.loadGoals(targetPage, perPage);
    }
  }

  openAddModal(): void {
    this.showAddModal.set(true);
    this.syncCatalogSelections();
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  filteredCatalog() {
    const age = this.filterAge();
    const grade = this.filterGrade();
    const subject = this.filterSubject();
    return this.catalogGoals().filter((g) => {
      const ageOk = age === 'all' || g.age === age;
      const gradeOk = grade === 'all' || g.grade === grade;
      const subjectOk = subject === 'all' || g.subject === subject;
      return ageOk && gradeOk && subjectOk;
    });
  }

  toggleCatalogSelection(id: number, checked: boolean): void {
    this.catalogSelections.update((map) => ({ ...map, [id]: checked }));
  }

  private syncCatalogSelections(): void {
    const selectedTopics = new Set((this.goals() || []).map((g) => (g.topic || '').toLowerCase()));
    const next: Record<number, boolean> = {};
    for (const item of this.catalogGoals()) {
      const match = selectedTopics.has(item.topic.toLowerCase());
      next[item.id] = match;
    }
    this.catalogSelections.set(next);
  }

  async addSelectedCatalogGoals(): Promise<void> {
    const childId = this.childIdentifier();
    if (!childId || this.saving()) return;
    const selections = this.catalogSelections();
    const toAdd = this.catalogGoals().filter((g) => selections[g.id]);

    if (!toAdd.length) {
      this.closeAddModal();
      return;
    }

    // Avoid re-adding existing topics
    const existingTopics = new Set((this.goals() || []).map((g) => (g.topic || '').toLowerCase()));
    const newGoals = toAdd.filter((g) => !existingTopics.has(g.topic.toLowerCase()));

    if (!newGoals.length) {
      this.closeAddModal();
      return;
    }

    this.saving.set(true);
    try {
      for (const item of newGoals) {
        await this.parentService.addChildGoal(childId, item.topic);
      }
      await this.loadGoals(1, this.pageSize());
      this.closeAddModal();
    } finally {
      this.saving.set(false);
    }
  }

  formattedDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  selectedCatalogCount(): number {
    return Object.values(this.catalogSelections() || {}).filter((v) => !!v).length;
  }

  displayGoals(): ChildGoal[] {
    const searchTerm = this.search().trim().toLowerCase();
    const items = (this.goals() || []).filter((g) => {
      if (!searchTerm) return true;
      return (
        (g.topic || '').toLowerCase().includes(searchTerm) ||
        (g.status || '').toLowerCase().includes(searchTerm)
      );
    });

    const field = this.sortField();
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    return items.sort((a, b) => {
      const av = this.sortValue(a, field);
      const bv = this.sortValue(b, field);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  private sortValue(goal: ChildGoal, field: 'topic' | 'progress' | 'status' | 'created_by' | 'updated_at') {
    switch (field) {
      case 'progress':
        return Number(goal.progress) || 0;
      case 'status':
        return (goal.status || '').toLowerCase();
      case 'created_by':
        return (goal.created_by || '').toLowerCase();
      case 'updated_at':
        return goal.updated_at || goal.created_at || '';
      case 'topic':
      default:
        return (goal.topic || '').toLowerCase();
    }
  }

  setSort(field: 'topic' | 'progress' | 'status' | 'created_by' | 'updated_at'): void {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set(field === 'progress' ? 'desc' : 'asc');
    }
  }
}


