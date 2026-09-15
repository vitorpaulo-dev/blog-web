import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Clerk } from '@clerk/clerk-js';
import { ui } from '@clerk/ui';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClerkService {
	private readonly platformId = inject(PLATFORM_ID);
	private clerk: Clerk | null = null;
	private initPromise: Promise<void> | null = null;
	private unsubscribe: (() => void) | null = null;

	readonly isLoaded = signal(false);
	readonly isSignedIn = signal(false);
	readonly user = signal<Clerk['user']>(null);

	get instance(): Clerk | null {
		return this.clerk;
	}

	async init(): Promise<void> {
		if (!isPlatformBrowser(this.platformId)) return;

		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = this.doInit();
		return this.initPromise;
	}

	private async doInit(): Promise<void> {
		const key = environment.clerkPublishableKey;
		if (!key) {
			return;
		}

		if (this.clerk) return;

		this.clerk = new Clerk(key);
		await this.clerk.load({ ui });

		this.syncState();

		this.unsubscribe = this.clerk.addListener(({ session, user }) => {
			this.isSignedIn.set(!!session);
			this.user.set(user ?? null);
		});
	}

	private syncState(): void {
		if (!this.clerk) return;
		this.isLoaded.set(this.clerk.loaded);
		this.isSignedIn.set(!!this.clerk.session);
		this.user.set(this.clerk.user ?? null);
	}

	destroy(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	openSignIn(props?: Parameters<Clerk['openSignIn']>[0]): void {
		this.clerk?.openSignIn(props);
	}

	openSignUp(props?: Parameters<Clerk['openSignUp']>[0]): void {
		this.clerk?.openSignUp(props);
	}

	openUserProfile(props?: Parameters<Clerk['openUserProfile']>[0]): void {
		this.clerk?.openUserProfile(props);
	}

	signOut(): Promise<void> {
		return this.clerk?.signOut() ?? Promise.resolve();
	}

	mountSignIn(node: HTMLDivElement, props?: Parameters<Clerk['mountSignIn']>[1]): void {
		this.clerk?.mountSignIn(node, props);
	}

	unmountSignIn(node: HTMLDivElement): void {
		this.clerk?.unmountSignIn(node);
	}

	mountSignUp(node: HTMLDivElement, props?: Parameters<Clerk['mountSignUp']>[1]): void {
		this.clerk?.mountSignUp(node, props);
	}

	unmountSignUp(node: HTMLDivElement): void {
		this.clerk?.unmountSignUp(node);
	}

	mountUserButton(node: HTMLDivElement, props?: Parameters<Clerk['mountUserButton']>[1]): void {
		this.clerk?.mountUserButton(node, props);
	}

	unmountUserButton(node: HTMLDivElement): void {
		this.clerk?.unmountUserButton(node);
	}

	async getToken(): Promise<string | null> {
		if (!isPlatformBrowser(this.platformId) || !this.clerk?.session) return null;
		try {
			return await this.clerk.session.getToken();
		} catch {
			return null;
		}
	}
}