import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Kids } from './kids';

describe('Kids', () => {
  let component: Kids;
  let fixture: ComponentFixture<Kids>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Kids]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Kids);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
