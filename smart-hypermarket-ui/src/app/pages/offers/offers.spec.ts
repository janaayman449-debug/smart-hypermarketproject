import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Offers } from './offers';

describe('Offers', () => {
  let component: Offers;
  let fixture: ComponentFixture<Offers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Offers],
    providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Offers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
