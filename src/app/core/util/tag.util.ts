import { TagDto } from '../../features/tags/data-access/tag.service';
import { Language } from '../../features/posts/data-access/post.service';

export function tagName(tag: TagDto | undefined, lang: Language): string {
	return (
		tag?.translations?.[lang]?.name ||
		tag?.translations?.['ENGLISH']?.name ||
		''
	);
}

export function collectTagIds(items: { tagIds?: string[] }[]): string[] {
	const ids = new Set<string>();
	for (const item of items) {
		for (const id of item.tagIds ?? []) {
			ids.add(id);
		}
	}
	return Array.from(ids);
}

export function buildTagMap(tags: TagDto[]): Map<string, TagDto> {
	return new Map(tags.map(tag => [tag.id, tag]));
}
