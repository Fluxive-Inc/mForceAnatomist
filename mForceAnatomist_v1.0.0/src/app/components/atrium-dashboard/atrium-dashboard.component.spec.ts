import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AtriumDashboardComponent } from './atrium-dashboard.component';

describe('AtriumDashboardComponent', () => {
  let component: AtriumDashboardComponent;
  let fixture: ComponentFixture<AtriumDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtriumDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AtriumDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
