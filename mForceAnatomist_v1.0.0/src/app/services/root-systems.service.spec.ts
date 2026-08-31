import { TestBed } from '@angular/core/testing';

import { RootSystemsService } from './root-systems.service';

describe('RootSystemsService', () => {
  let service: RootSystemsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RootSystemsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
