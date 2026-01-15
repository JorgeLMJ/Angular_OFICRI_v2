import { TestBed } from '@angular/core/testing';

import { GeminiOcrService } from './gemini-ocr.service';

describe('GeminiOcrService', () => {
  let service: GeminiOcrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeminiOcrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
