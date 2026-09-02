import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

export interface AuthorDto {
	id: string;
	slug: string;
	name: string;
	avatarUrl?: string;
	jobTitle?: string;
}

export interface TagDto {
	id: string;
	name: string;
	slug: string;
	description?: string;
}

export interface ProjectDto {
	id: string;
	slug: string;
	title: string;
	logoUrl?: string;
	description?: string;
	programmingLanguage?: string;
}

export interface PostDto {
	id: string;
	slug: string;
	title: string;
	bannerUrl?: string;
	content: string;
	language?: string;
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
}

export interface CreatePostPayload {
	title: string;
	bannerUrl?: string;
	content: string;
	language?: string;
	tagIds?: string[];
	projectIds?: string[];
	status?: string;
}

export interface UpdatePostPayload extends CreatePostPayload {}

export interface SearchParams {
	query?: string;
	authorId?: string;
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

	getBySlug(slug: string): Observable<PostDto> {
		return this.http.get<PostDto>(`${this.base}/slug/${slug}`);
	}

	search(params: GenericPageableRequest<SearchParams>): Observable<GenericPageableResponse<PostDto>> {
		return this.http.post<GenericPageableResponse<PostDto>>(`${this.base}/search`, params);
	}
}
