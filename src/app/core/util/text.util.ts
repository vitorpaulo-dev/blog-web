export function excerpt(content: string): string {
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