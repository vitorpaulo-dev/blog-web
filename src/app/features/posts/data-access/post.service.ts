import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface GenericPageableResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
}

export interface AuthorDto {
  id: string;
  clerkUserId: string;
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
  viewCount: number;
  averageReadingTimeSeconds?: number;
  estimatedReadingTimeMinutes?: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
  authors: AuthorDto[];
  tags: TagDto[];
  projects: ProjectDto[];
  reactionCount?: number;
  commentCount?: number;
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
  page?: number;
  limit?: number;
  sort?: string;
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

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  massDelete(ids: string[]): Observable<void> {
    return this.http.delete<void>(this.base, { body: { ids } });
  }

  getById(id: string): Observable<PostDto> {
    return this.http.get<PostDto>(`${this.base}/${id}`);
  }

  getBySlug(slug: string): Observable<PostDto> {
    return this.http.get<PostDto>(`${this.base}/slug/${slug}`);
  }

  search(params: SearchParams): Observable<GenericPageableResponse<PostDto>> {
    let httpParams = new HttpParams();
    if (params.query) httpParams = httpParams.set('query', params.query);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    return this.http.get<GenericPageableResponse<PostDto>>(this.base, { params: httpParams });
  }
}
