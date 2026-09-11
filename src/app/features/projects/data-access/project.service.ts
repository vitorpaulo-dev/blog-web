import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
	AuthorDto,
	GenericPageableRequest,
	GenericPageableResponse,
	Language,
	ProjectContentDto,
	ProjectDto,
} from '../../posts/data-access/post.service';

export type { ProjectDto, ProjectContentDto };

export interface CreateProjectPayload {
	logoUrl?: string;
	bannerUrl?: string;
	githubUrl?: string;
	websiteUrl?: string;
	tagIds?: string[];
	translations: Record<Language, ProjectContentDto>;
	status?: string;
}

export interface UpdateProjectPayload {
	logoUrl?: string;
	bannerUrl?: string;
	githubUrl?: string;
	websiteUrl?: string;
	tagIds?: string[];
	translations: Record<Language, ProjectContentDto>;
	status: 'DRAFT' | 'PUBLISHED';
}

export interface ProjectQueryParams {
	query?: string;
	authorId?: string;
	language?: Language;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
	private readonly http = inject(HttpClient);
	private readonly base = `${environment.apiBaseUrl}/v1/project`;

	create(payload: CreateProjectPayload): Observable<ProjectDto> {
		return this.http.post<ProjectDto>(this.base, payload);
	}

	update(id: string, payload: UpdateProjectPayload): Observable<ProjectDto> {
		return this.http.put<ProjectDto>(`${this.base}/${id}`, payload);
	}

	delete(ids: string[]): Observable<void> {
		return this.http.delete<void>(this.base, { body: { ids } });
	}

	getById(id: string): Observable<ProjectDto> {
		return this.http.get<ProjectDto>(`${this.base}/${id}`);
	}

	getBySlug(slug: string, language: Language): Observable<ProjectDto> {
		return this.http.get<ProjectDto>(`${this.base}/slug/${slug}/${language}`);
	}

	search(params: GenericPageableRequest<ProjectQueryParams>): Observable<GenericPageableResponse<ProjectDto>> {
		return this.http.post<GenericPageableResponse<ProjectDto>>(`${this.base}/search`, params);
	}

	getByIds(ids: string[], language: Language): Observable<ProjectDto[]> {
		return this.http.post<ProjectDto[]>(`${this.base}/batch`, { ids, language });
	}
}
