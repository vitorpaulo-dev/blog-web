import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
	GenericPageableRequest,
	GenericPageableResponse,
	Language,
} from '../../posts/data-access/post.service';

export type SubscriberStatus = 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
export type Frequency = 'EVERY_POST' | 'MONTHLY_DIGEST';

export interface SubscriberDto {
	id: string;
	email: string;
	status: SubscriberStatus;
	language: Language;
	frequency: Frequency;
	createdAt: string;
}

export interface SubscribePayload {
	email: string;
	language: Language;
	frequency: Frequency;
}

export interface SubscriberSearchParams {
	email?: string;
	status?: SubscriberStatus;
	language?: Language;
	frequency?: Frequency;
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
	private readonly http = inject(HttpClient);
	private readonly base = `${environment.apiBaseUrl}/v1/newsletter`;

	subscribe(payload: SubscribePayload, captchaToken: string): Observable<SubscriberDto> {
		const headers = new HttpHeaders({ 'X-Captcha-Token': captchaToken });

		return this.http.post<SubscriberDto>(`${this.base}/subscribe`, payload, { headers });
	}

	listSubscribers(params: GenericPageableRequest<SubscriberSearchParams>): Observable<GenericPageableResponse<SubscriberDto>> {
		return this.http.post<GenericPageableResponse<SubscriberDto>>(`${this.base}/subscriber/search`, params);
	}

	unsubscribeSubscriber(id: string): Observable<SubscriberDto> {
		return this.http.post<SubscriberDto>(`${this.base}/subscriber/${id}/unsubscribe`, {});
	}
}
