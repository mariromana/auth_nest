import { ConfigService } from '@nestjs/config'

import { TypeOptions } from '@/auth/provider/provider.constants'
import { GoogleProvider } from '@/auth/provider/services/google.provider'

export const getProvidersConfig = async (
	ConfigService: ConfigService
): Promise<TypeOptions> => ({
	baseUrl: ConfigService.getOrThrow<string>('APPLICATION_URL'),
	service: [
		new GoogleProvider({
			client_id: ConfigService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
			client_secret: ConfigService.getOrThrow<string>(
				'GOOGLE_CLIENT_SECRET'
			),
			scopes: ['email', 'profile']
		})
	]
})
