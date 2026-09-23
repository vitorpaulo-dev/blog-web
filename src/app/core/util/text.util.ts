export function excerpt(content?: string): string {
	if (!content) return '';
	const text = content
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
		.replace(/[#*_~`>|-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return text.length > 150 ? text.slice(0, 150) + '…' : text;
}

export function firstTranslation<T>(translations: Record<string, T> | undefined | null): T | null {
	if (!translations) return null;
	const values = Object.values(translations);
	return values.length > 0 ? values[0] : null;
}

export interface TocItem {
	id: string;
	text: string;
	level: 1 | 2 | 3;
}

export function slugifyHeading(text: string): string {
	const slug = text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug.length > 0 ? slug : 'section';
}

function stripInlineMarkup(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.trim();
}

export function withHeadingIds(html: string): string {
	const used = new Map<string, number>();
	return html.replace(
		/<(h[1-3])\b([^>]*)>([\s\S]*?)<\/\1>/gi,
		(_match, tag: string, attrs: string, inner: string) => {
			const baseId = slugifyHeading(stripInlineMarkup(inner));
			const count = used.get(baseId) ?? 0;
			used.set(baseId, count + 1);
			const id = count > 0 ? `${baseId}-${count + 1}` : baseId;
			return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
		},
	);
}

export function extractToc(html: string): TocItem[] {
	const seen = new Set<string>();
	const items: TocItem[] = [];

	for (const match of html.matchAll(/<h([1-3])\b[^>]*?\bid="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi)) {
		const id = match[2];
		if (seen.has(id)) continue;
		seen.add(id);
		items.push({
			id,
			text: stripInlineMarkup(match[3]),
			level: Number(match[1]) as 1 | 2 | 3,
		});
	}

	return items;
}
