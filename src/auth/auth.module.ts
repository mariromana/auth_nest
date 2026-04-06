import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha'

import { getProvidersConfig } from '@/config/providers.config'
import { getRecaptchaConfig } from '@/config/recaptcha.config'
import { UserService } from '@/user/user.service'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { ProviderModule } from './provider/provider.module'

@Module({
	imports: [
		ProviderModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: getProvidersConfig
		}),
		GoogleRecaptchaModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: getRecaptchaConfig
		})
	],
	controllers: [AuthController],
	providers: [AuthService, UserService]
})
export class AuthModule {}
