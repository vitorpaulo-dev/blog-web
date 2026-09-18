import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DashboardStats {
	totalPosts: number;
	publishedPosts: number;
	draftPosts: number;
	totalProjects: number;
	publishedProjects: number;
	draftProjects: number;
	totalViews: number;
	totalReactions: number;
	totalSubscribers: number;
	activeSubscribers: number;
}

export interface TopItem {
	id: string;
	title: string;
	slug: string;
	viewCount: number;
	reactionCount: number;
	createdAt: string;
}

export interface Top {
	allTime: TopItem[];
	last24h: TopItem[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
	private readonly http = inject(HttpClient);
	private readonly base = `${environment.apiBaseUrl}/v1/dashboard`;

	getStats(): Observable<DashboardStats> {
		return this.http.get<DashboardStats>(`${this.base}/stats`);
	}

	getTopPosts(limit = 5): Observable<Top> {
		return this.http.get<Top>(`${this.base}/posts/top`, { params: { limit: limit } });
	}

	getTopProjects(limit = 5): Observable<Top> {
		return this.http.get<Top>(`${this.base}/projects/top`, { params: { limit: limit } });
	}
}
