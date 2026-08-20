import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraftSelectorComponent } from './graft-selector.component';

describe('GraftSelectorComponent', () => {
  let component: GraftSelectorComponent;
  let fixture: ComponentFixture<GraftSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraftSelectorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GraftSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
