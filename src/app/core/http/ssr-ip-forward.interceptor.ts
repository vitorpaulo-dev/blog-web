import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID, REQUEST } from '@angular/core';
import { environment } from '../../../environments/environment';

export const ssrIpForwardInterceptor: HttpInterceptorFn = (req, next) => {
	const platformId = inject(PLATFORM_ID);

	if (isPlatformBrowser(platformId)) {
		return next(req);
	}

	if (!req.url.startsWith(environment.apiBaseUrl)) {
		return next(req);
	}

	const request = inject(REQUEST);
	const connectingIp = request?.headers?.get('cf-connecting-ip');
	const forwardedFor = request?.headers?.get('x-forwarded-for');

	if (!connectingIp && !forwardedFor) {
		return next(req);
	}

	const headers: Record<string, string> = {};
	if (connectingIp) {
		headers['CF-Connecting-IP'] = connectingIp;
	}
	if (forwardedFor) {
		headers['X-Forwarded-For'] = forwardedFor;
	}

	return next(req.clone({ setHeaders: headers }));
};
