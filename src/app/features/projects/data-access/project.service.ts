import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TurnstileService } from '../../../core/captcha/turnstile.service';
import {
	AuthorDto,
	GenericPageableRequest,
	GenericPageableResponse,
	Language,
	ProjectContentDto,
	ProjectDto,
	type ReactionResponse,
	type ReactionType,
} from '../../posts/data-access/post.service';
import { TuiToastService } from '@taiga-ui/kit';
import { LanguageService } from '../../../core/i18n/language.service';

export type { ProjectDto, ProjectContentDto, ReactionResponse, ReactionType };

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
	private readonly languageService = inject(LanguageService);
	private readonly turnstile = inject(TurnstileService);
	private readonly base = `${environment.apiBaseUrl}/v1/project`;
	private reactInFlight = false; // single in-flight react submission guard

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

	getBySlug(slug: string): Observable<ProjectDto> {
		return this.http.get<ProjectDto>(`${this.base}/slug/${slug}/${this.languageService.language()}`);
	}

	search(params: GenericPageableRequest<ProjectQueryParams>): Observable<GenericPageableResponse<ProjectDto>> {
		params.query.language = this.languageService.language();

		return this.http.post<GenericPageableResponse<ProjectDto>>(`${this.base}/search`, params);
	}

	getByIds(ids: string[], language: Language): Observable<ProjectDto[]> {
		return this.http.post<ProjectDto[]>(`${this.base}/batch`, { ids, language });
	}

	async reactTo(slug: string, reactionType: ReactionType): Promise<ReactionResponse> {
		// Never double-POST: a second call while a react request is pending is rejected.
		if (this.reactInFlight) {
			throw new Error('Reaction request already in progress');
		}
		this.reactInFlight = true;

		try {
			const token = await this.turnstile.getToken();

			if (!token) {
				throw new Error('Turnstile token unavailable');
			}

			return await firstValueFrom(this.http.post<ReactionResponse>(
				`${this.base}/${slug}/react`,
				{ reactionType },
				{ headers: { 'X-Captcha-Token': token } },
			));
		} finally {
			this.reactInFlight = false;
			this.turnstile.reset();
		}
	}
}
