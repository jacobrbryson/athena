import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LearningTargets } from './learning-targets';

describe('LearningTargets', () => {
  let component: LearningTargets;
  let fixture: ComponentFixture<LearningTargets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearningTargets]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LearningTargets);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
