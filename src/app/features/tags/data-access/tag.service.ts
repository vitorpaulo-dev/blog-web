import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
	GenericPageableRequest,
	GenericPageableResponse,
	Language,
} from '../../posts/data-access/post.service';

export interface TagContentDto {
	name: string;
}

export interface TagDto {
	id: string;
	slug: string;
	translations: Record<Language, TagContentDto>;
}

export interface CreateTagPayload {
	translations: Record<Language, TagContentDto>;
}

export interface UpdateTagPayload {
	translations: Record<Language, TagContentDto>;
}

export interface TagQueryRequest {
	name?: string;
	language?: Language;
}

@Injectable({ providedIn: 'root' })
export class TagService {
	private readonly http = inject(HttpClient);
	private readonly base = `${environment.apiBaseUrl}/v1/tag`;

	create(payload: CreateTagPayload): Observable<TagDto> {
		return this.http.post<TagDto>(this.base, payload);
	}

	update(id: string, payload: UpdateTagPayload): Observable<TagDto> {
		return this.http.put<TagDto>(`${this.base}/${id}`, payload);
	}

	delete(ids: string[]): Observable<void> {
		return this.http.delete<void>(this.base, { body: { ids } });
	}

	getById(id: string): Observable<TagDto> {
		return this.http.get<TagDto>(`${this.base}/${id}`);
	}

	search(params: GenericPageableRequest<TagQueryRequest>): Observable<GenericPageableResponse<TagDto>> {
		return this.http.post<GenericPageableResponse<TagDto>>(`${this.base}/search`, params);
	}
}
