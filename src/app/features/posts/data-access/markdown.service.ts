import { ApplicationRef, createComponent, ElementRef, EnvironmentInjector, inject, Injectable } from '@angular/core';
import { Marked, MarkedExtension, Tokens } from 'marked';
import { createHighlighter } from 'shiki';
import markedShiki from 'marked-shiki';
import DOMPurify from 'dompurify';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
	Alert01Icon,
	Alert02Icon,
	BiohazardIcon,
	BulbIcon,
	ExclamationMarkBigIcon,
	InformationCircleIcon,
	NoteIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIconComponent } from '@hugeicons/angular';

export type CalloutType =
	| 'note'
	| 'tip'
	| 'important'
	| 'warning'
	| 'caution';

export const getCalloutIcon = (type: CalloutType) => {
	const icons: Record<CalloutType, typeof NoteIcon> = {
		note: NoteIcon,
		tip: BulbIcon,
		important: ExclamationMarkBigIcon,
		warning: Alert02Icon,
		caution: BiohazardIcon,
	};

	return icons[type];
};

interface CalloutToken extends Tokens.Generic {
	type: 'callout';
	calloutType: CalloutType;
	title: string;
	body: string;
	raw: string;
}

const CALLOUT_RE =
	/^ {0,3}>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)][ \t]*([^\n]*)\n((?:>.*(?:\n|$))*)/i;

@Injectable({ providedIn: 'root' })
export class MarkdownService {

	private readonly sanitizer = inject(DomSanitizer);
	private readonly appRef = inject(ApplicationRef);
	private readonly environmentInjector = inject(EnvironmentInjector);

	markdownRendererPromise: Promise<Marked> | null = null;

	private async createMarkdownRenderer(): Promise<Marked> {
		const highlighter = await createHighlighter({
			themes: ['github-dark-default'],
			langs: [
				'bash',
				'css',
				'html',
				'java',
				'javascript',
				'json',
				'markdown',
				'scss',
				'shellscript',
				'dockerfile',
				'sql',
				'typescript',
				'xml',
				'yaml',
			],
		});

		const renderer = new Marked({
			gfm: true,
			breaks: true,
			async: true,
		});

		renderer.use(
			markedShiki({
				highlight(code, lang) {
					if (lang === 'mermaid') {
						return `<div class="mermaid" data-mermaid="${encodeURIComponent(code)}"></div>`;
					}

					try {
						return highlighter.codeToHtml(code, {
							lang: lang || 'text',
							theme: 'github-dark-default',
						});
					} catch {
						return highlighter.codeToHtml(code, {
							lang: 'text',
							theme: 'github-dark-default',
						});
					}
				},
			})
		);

		renderer.use({
			gfm: true,
			extensions: [
				...this.callouts().extensions!,
			],
		});

		return renderer;
	}

	getMarkdownRenderer(): Promise<Marked> {
		if (!this.markdownRendererPromise) {
			this.markdownRendererPromise = this.createMarkdownRenderer();
		}

		return this.markdownRendererPromise;
	}

	async renderMarkdown(content: string, isBrowser: boolean): Promise<SafeHtml> {
		const renderer = await this.getMarkdownRenderer();
		const raw = await renderer.parse(content, {
			async: true,
		});

		const sanitized = isBrowser? DOMPurify.sanitize(raw, { ADD_ATTR: ['class', 'data-mermaid'], }) : raw;
		return this.sanitizer.bypassSecurityTrustHtml(sanitized);
	}

	async renderArticle(articleEl: ElementRef<HTMLElement> | undefined): Promise<void> {
		const container = articleEl?.nativeElement;
		if (!container) {
			return;
		}

		await this.renderMermaid(container);
		await this.renderIcons(container);
	}

	async renderMermaid(container: HTMLElement): Promise<void> {
		const nodes = container.querySelectorAll<HTMLElement>('.mermaid[data-mermaid]');
		if (nodes.length === 0) {
			return;
		}

		const { default: mermaid } = await import('mermaid');
		mermaid.initialize({
			startOnLoad: false,
			theme: 'dark',
			securityLevel: 'strict',
		});

		for (const node of nodes) {
			const source = node.dataset['mermaid'];
			if (!source) {
				continue;
			}

			node.textContent = decodeURIComponent(source);
		}

		await mermaid.run({
			nodes,
		});
	}

	async renderIcons(container: HTMLElement): Promise<void> {
		const nodes = container.querySelectorAll<HTMLElement>(
			'.markdown-callout__icon[data-icon]',
		);
		if (nodes.length === 0) {
			return;
		}

		for (const node of nodes) {
			const type = node.getAttribute('data-icon') as CalloutType;
			const icon = getCalloutIcon(type);

			const host = document.createElement('span');

			const componentRef = createComponent(HugeiconsIconComponent, {
				environmentInjector: this.environmentInjector,
				hostElement: host,
			});

			componentRef.setInput('icon', icon);
			componentRef.setInput('size', 22);
			componentRef.setInput('strokeWidth', 1.5);

			this.appRef.attachView(componentRef.hostView);
			componentRef.changeDetectorRef.detectChanges();

			const svg = host.querySelector('svg');
			if (svg) {
				node.replaceChildren(svg.cloneNode(true));
			}

			this.appRef.detachView(componentRef.hostView);
			componentRef.destroy();
		}
	}

	private callouts(): MarkedExtension {
		return {
			extensions: [
				{
					name: 'callout',
					level: 'block',

					start(src: string) {
						const match = src.match(/^ {0,3}>[ \t]*\[!/m);
						return match?.index;
					},

					tokenizer(src: string) {
						const match = CALLOUT_RE.exec(src);

						if (!match) {
							return;
						}

						const calloutType = match[1].toLowerCase() as CalloutType;
						const explicitTitle = match[2].trim();
						const body = match[3]
							.split('\n')
							.map(line => line.replace(/^>[ \t]?/, ''))
							.join('\n')
							.trim();

						const title =
							explicitTitle ||
							calloutType.charAt(0).toUpperCase() + calloutType.slice(1);

						const token: CalloutToken = {
							type: 'callout',
							raw: match[0],
							calloutType,
							title,
							body,
						};

						return token;
					},

					renderer(token) {
						const callout = token as CalloutToken;
						return `
							<aside
							  class="markdown-callout"
							  data-callout="${callout.calloutType}"
							  role="note"
							>
							  <div class="markdown-callout__header">
								<div class="markdown-callout__icon" data-icon="${callout.calloutType}"></div>
				
								<strong class="markdown-callout__title">
								  ${callout.title}
								</strong>
							  </div>
				
							  <div class="markdown-callout__body">
								${callout.body}
							  </div>
							</aside>
						`;
					},
				},
			],
		};
	}
}
