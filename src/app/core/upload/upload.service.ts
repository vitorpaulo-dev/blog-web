import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UploadFolder = 'post' | 'project';

export type UploadSubfolder = 'banner' | 'logo' | 'content';

export interface PresignResponse {
	uploadUrl: string;
	key: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
	private readonly http = inject(HttpClient);
	private readonly base = `${environment.apiBaseUrl}/v1/upload`;

	private readonly cache = new Map<string, string>();

	presign(folder: UploadFolder, subfolder: UploadSubfolder, fileName: string): Observable<PresignResponse> {
		return this.http.post<PresignResponse>(`${this.base}/presign`, { folder, subfolder, fileName });
	}

	uploadDirect(uploadUrl: string, file: File): Observable<void> {
		return this.http.put<void>(uploadUrl, file, {
			headers: { 'Content-Type': file.type || 'application/octet-stream' },
		});
	}

	upload(file: File, folder: UploadFolder, subfolder: UploadSubfolder): Observable<string> {
		return this.presign(folder, subfolder, file.name).pipe(
			switchMap((res) => this.uploadDirect(res.uploadUrl, file).pipe(map(() => res.key)))
		);
	}

	sign(keys: string[]): Observable<Record<string, string>> {
		const missing = [...new Set(keys)].filter((key) => key && !this.cache.has(key));

		const request$ =
			missing.length === 0
				? of({})
				: this.http
					.post<Record<string, string>>(`${this.base}/sign`, { keys: missing })
					.pipe(tap((urls) => Object.entries(urls).forEach(([key, url]) => this.cache.set(key, url))));

		return request$.pipe(map(() => this.lookup(keys)));
	}

	private lookup(keys: string[]): Record<string, string> {
		const result: Record<string, string> = {};
		for (const key of keys) {
			result[key] = this.cache.get(key) ?? '';
		}
		return result;
	}
}
