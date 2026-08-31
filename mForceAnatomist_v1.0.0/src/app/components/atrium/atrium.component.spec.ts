import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { AtriumComponent } from './atrium.component';

describe('AtriumComponent', () => {
  let component: AtriumComponent;
  let fixture: ComponentFixture<AtriumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AtriumComponent, RouterModule.forRoot([])]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AtriumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
