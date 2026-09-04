import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type Language = 'ENGLISH' | 'PORTUGUESE';

export interface GenericPageableResponse<T> {
	content: T[];
	totalPages: number;
	totalElements: number;
}
export interface GenericPageableRequest<T> {
	query: T;
	page: number;
	size: number;
	sort: string;
	direction: 'ASC' | 'DESC';
}

export interface PostContentDto {
	title: string;
	content: string;
}

export interface TagContentDto {
	name: string;
	description?: string;
}

export interface ProjectContentDto {
	title: string;
	description?: string;
}

export interface AuthorContentDto {
	bio?: string;
	jobTitle?: string;
}

export interface AuthorDto {
	id: string;
	slug: string;
	name: string;
	avatarUrl?: string;
	translations: Record<Language, AuthorContentDto>;
}

export interface TagDto {
	id: string;
	slug: string;
	translations: Record<Language, TagContentDto>;
}

export interface ProjectDto {
	id: string;
	slug: string;
	logoUrl?: string;
	programmingLanguage?: string;
	translations: Record<Language, ProjectContentDto>;
}

export interface PostDto {
	id: string;
	slug: string;
	bannerUrl?: string;
	status: string;
	estimatedReading?: number;
	createdAt: string;
	updatedAt: string;
	authors: AuthorDto[];
	tags: TagDto[];
	projects: ProjectDto[];
	reactionCount: number;
	viewCount: number;
	loveCount: number;
	celebrateCount: number;
	geniusCount: number;
	helpCount: number;
	translations: Record<Language, PostContentDto>;
}

export interface CreatePostPayload {
	bannerUrl?: string;
	translations: Record<Language, PostContentDto>;
	tagIds?: string[];
	projectIds?: string[];
	status?: string;
}

export interface UpdatePostPayload extends CreatePostPayload {}

export interface SearchParams {
	query?: string;
	authorId?: string;
	language?: Language;
}

@Injectable({ providedIn: 'root' })
export class PostService {
	private readonly http = inject(HttpClient);
	private readonly base = `${environment.apiBaseUrl}/v1/post`;

	create(payload: CreatePostPayload): Observable<PostDto> {
		return this.http.post<PostDto>(this.base, payload);
	}

	update(id: string, payload: UpdatePostPayload): Observable<PostDto> {
		return this.http.put<PostDto>(`${this.base}/${id}`, payload);
	}

	delete(ids: string[]): Observable<void> {
		return this.http.delete<void>(this.base, { body: { ids } });
	}

	getById(id: string): Observable<PostDto> {
		return this.http.get<PostDto>(`${this.base}/${id}`);
	}

	getBySlug(slug: string, language: Language): Observable<PostDto> {
		return this.http.get<PostDto>(`${this.base}/slug/${slug}/${language}`);
	}

	search(params: GenericPageableRequest<SearchParams>): Observable<GenericPageableResponse<PostDto>> {
		return this.http.post<GenericPageableResponse<PostDto>>(`${this.base}/search`, params);
	}
}
