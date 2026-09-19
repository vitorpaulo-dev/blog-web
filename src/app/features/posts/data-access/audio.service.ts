import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AudioType, Language } from './post.service';
import { UploadService } from '../../../core/upload/upload.service';
import { environment } from '../../../../environments/environment';

export type { AudioType };

export type AudioStatus = 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';

export interface AudioArtifactDto {
	type: AudioType;
	language: Language;
	status: AudioStatus;
	key: string;
	error?: string;
	progress?: number;
}

@Injectable({ providedIn: 'root' })
export class AudioService {
	private readonly http = inject(HttpClient);
	private readonly uploadService = inject(UploadService);
	private readonly base = `${environment.apiBaseUrl}/v1/post`;

	signArtifacts(artifacts: Array<Partial<AudioArtifactDto>>): Observable<Record<string, string>> {
		const keys = artifacts
			.filter((artifact) => artifact.status === 'READY' && artifact.key)
			.map((artifact) => artifact.key!);

		return this.uploadService.sign(keys);
	}

	retry(postId: string, type: AudioType, language: Language): Observable<AudioArtifactDto> {
		return this.http.post<AudioArtifactDto>(
			`${this.base}/${postId}/audio/${type}/${language}/retry`,
			{},
		);
	}
}
