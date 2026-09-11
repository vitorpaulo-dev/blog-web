import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadResponse {
	url: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
	private readonly http = inject(HttpClient);
	private readonly base = `${environment.apiBaseUrl}/v1/upload`;

	upload(file: File): Observable<UploadResponse> {
		const formData = new FormData();
		formData.append('file', file);
		return this.http.post<UploadResponse>(this.base, formData);
	}
}
