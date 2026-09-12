import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContentCardComponent, ContentCardItem } from './content-card.component';
import { provideRouter, RouterLink } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { EyeIcon, SourceCodeIcon } from '@hugeicons/core-free-icons';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('ContentCardComponent', () => {
  let component: ContentCardComponent;
  let fixture: ComponentFixture<ContentCardComponent>;

  const baseItem: ContentCardItem = {
    slug: 'test-project',
    title: 'Test Project',
    excerpt: 'A short excerpt about the project.',
    imageUrl: 'https://example.com/image.png',
    date: '2025-01-15T00:00:00Z',
    routePrefix: '/project',
    metaIcon: EyeIcon,
    metaText: '42 views',
    chips: [
      { icon: SourceCodeIcon, label: 'TypeScript' },
      { icon: SourceCodeIcon, label: 'Angular' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('item', baseItem);
    expect(component).toBeTruthy();
  });

  it('should render title, excerpt, and meta text', () => {
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Test Project');
    expect(el.textContent).toContain('A short excerpt about the project.');
    expect(el.textContent).toContain('42 views');
  });

  it('should render image when imageUrl is provided', () => {
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('image.png');
    expect(img.alt).toBe('Test Project');
  });

  it('should not render image when imageUrl is null', () => {
    const noImageItem = { ...baseItem, imageUrl: null };
    fixture.componentRef.setInput('item', noImageItem);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeNull();
  });

  it('should show divider when showDivider is true', () => {
    fixture.componentRef.setInput('item', baseItem);
    fixture.componentRef.setInput('showDivider', true);
    fixture.detectChanges();

    const hr = fixture.nativeElement.querySelector('hr');
    expect(hr).toBeTruthy();
  });

  it('should hide divider when showDivider is false', () => {
    fixture.componentRef.setInput('item', baseItem);
    fixture.componentRef.setInput('showDivider', false);
    fixture.detectChanges();

    const hr = fixture.nativeElement.querySelector('hr');
    expect(hr).toBeNull();
  });

  it('should render chips with labels', () => {
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('TypeScript');
    expect(el.textContent).toContain('Angular');
  });

  it('should render date', () => {
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
        expect(el.textContent).toMatch(/\d{2} Jan 2025/);
  });

  it('should build correct router link from routePrefix and slug', () => {
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('/project/test-project');
  });
});
