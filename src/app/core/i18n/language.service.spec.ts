import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
    localStorage.removeItem('blog-language');
  });

  it('builds unprefixed paths for English', () => {
    service.setLanguage('ENGLISH');
    expect(service.prefixed('/post')).toBe('/post');
    expect(service.prefixed('/post/my-post')).toBe('/post/my-post');
  });

  it('builds pt-prefixed paths for Portuguese', () => {
    service.setLanguage('PORTUGUESE');
    expect(service.prefixed('/post')).toBe('/pt/post');
    expect(service.prefixed('/project/my-project')).toBe('/pt/project/my-project');
  });
});
