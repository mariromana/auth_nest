import {
	BadRequestException,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'

import type { TypeBaseProviderOptions } from './types/base-provider.options.types'
import type { TypeUserInfo } from './types/user-info.types'

@Injectable()
export class BaseOauthService {
	private BASE_URL: string

	public constructor(private readonly options: TypeBaseProviderOptions) {}

	public getAuthUrl() {
		const query = new URLSearchParams({
			client_id: this.options.client_id,
			redirect_uri: this.getRedirectUrl(),
			response_type: 'code',
			scope: (this.options.scopes ?? []).join(' '),
			access_type: 'select_account'
		})

		return `${this.options.authorize_url}?${query.toString()}`
	}

	public async findUserByCode(code: string): Promise<TypeUserInfo> {
		const client_id = this.options.client_id
		const client_secret = this.options.client_secret

		const tokenQuery = new URLSearchParams({
			client_id,
			client_secret,
			redirect_uri: this.getRedirectUrl(),
			grant_type: 'authorization_code'
		})
		const tokenRequest = await fetch(this.options.access_url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json'
			},
			body: tokenQuery
		})

		const tokenResponse = await tokenRequest.json()

		if (!tokenResponse.ok) {
			throw new BadRequestException(
				`Faild to get user info: ${this.options.profile_url}. Check your token and try again`
			)
		}

		if (!tokenResponse.access_token) {
			throw new BadRequestException(
				`Faild to get user info: ${this.options.access_url}. Check your token and try again`
			)
		}

		const userRequest = await fetch(this.options.profile_url, {
			headers: {
				Authorization: `Bearer ${tokenResponse.access_token}`
			}
		})

		if (!userRequest.ok) {
			throw new UnauthorizedException(
				`Faild to get user info: ${this.options.profile_url}. Check your token and try again`
			)
		}

		const user = await userRequest.json()
		const userInfo = await this.extractUserInfo(user)

		return {
			...userInfo,
			access_token: tokenResponse.access_token,
			refresh_token: tokenResponse.refresh_token,
			expires_at: tokenResponse.expires_at || tokenResponse.expires_in,
			provider: this.options.name
		}
	}

	protected async extractUserInfo(data: any): Promise<TypeUserInfo> {
		return {
			...data,
			provider: this.options.name
		}
	}
	getRedirectUrl() {
		return `${this.BASE_URL}/auth/oauth/callback/${this.options.name}/`
	}
	set baseUrl(value: string) {
		this.BASE_URL = value
	}

	get name() {
		return this.options.name
	}

	get access_url() {
		return this.options.access_url
	}

	get profile_url() {
		return this.options.profile_url
	}

	get scopes() {
		return this.options.scopes
	}
}
