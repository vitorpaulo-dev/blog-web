import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AudioType, Language, PostAudioDto } from './post.service';
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

const AUDIO_TYPES: AudioType[] = ['NARRATION', 'PODCAST'];
const AUDIO_LANGUAGES: Language[] = ['ENGLISH', 'PORTUGUESE'];

@Injectable({ providedIn: 'root' })
export class AudioService {
	private readonly http = inject(HttpClient);
	private readonly uploadService = inject(UploadService);
	private readonly base = `${environment.apiBaseUrl}/v1/post`;

	flattenAudio(audio: PostAudioDto | undefined): AudioArtifactDto[] {
		if (!audio) {
			return [];
		}

		const artifacts: AudioArtifactDto[] = [];

		for (const type of AUDIO_TYPES) {
			const forType = audio[type] ?? {};

			for (const language of AUDIO_LANGUAGES) {
				const artifact = forType[language];

				if (!artifact) {
					continue;
				}

				artifacts.push({
					type,
					language,
					status: artifact.status,
					key: artifact.key ?? '',
					error: artifact.error,
					progress: artifact.progress,
				});
			}
		}

		return artifacts;
	}

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
