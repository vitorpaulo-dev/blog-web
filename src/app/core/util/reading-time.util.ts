export function formatReadingTime(seconds?: number | null): string {
	if (seconds === undefined || seconds === null || seconds <= 0) return '5m';

	const totalMinutes = Math.ceil(seconds / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours === 0) return `${minutes}m`;
	if (minutes === 0) return `${hours}h`;
	return `${hours}h ${minutes}m`;
}
