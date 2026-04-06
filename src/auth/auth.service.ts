import {
	ConflictException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthMethod, User } from '@prisma/client'
import { verify } from 'argon2'
import { Request, Response } from 'express'

import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'

import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ProviderService } from './provider/provider.service'

@Injectable()
export class AuthService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly userService: UserService,
		private readonly configService: ConfigService,
		private readonly providerService: ProviderService
	) {}

	public async register(req: Request, dto: RegisterDto) {
		const isExists = await this.userService.findByEmail(dto.email)

		if (isExists) {
			throw new ConflictException(
				'User already exists. Please login or register with a different email.'
			)
		}

		const newUser = await this.userService.create(
			dto.email,
			dto.password,
			dto.name,
			'',
			AuthMethod.CREDENTIALS,
			false
		)

		return this.saveSession(req, newUser)
	}

	public async login(req: Request, dto: LoginDto) {
		const user = await this.userService.findByEmail(dto.email)

		if (!user || !user.password) {
			throw new NotFoundException('User not found')
		}

		const isValidPassword = await verify(user.password, dto.password)

		if (!isValidPassword) {
			throw new UnauthorizedException(
				'wrong password.please try again or reset your password'
			)
		}

		return this.saveSession(req, user)
	}

	public async extractProfileFromCode(
		req: Request,
		code: string,
		provider: string
	) {
		const providerInstance = this.providerService.findByService(provider)
		const profile = await providerInstance?.findUserByCode(code)

		if (!providerInstance || !profile) {
			throw new NotFoundException('User not found')
		}
		const account = await this.prismaService.account.findFirst({
			where: {
				id: profile.id,
				provider: profile.provider
			}
		})

		let user = account?.userId
			? await this.userService.findById(account.userId)
			: null

		if (user) {
			return this.saveSession(req, user)
		}

		user = await this.userService.create(
			profile.email,
			'',
			profile.name,
			profile.picture,
			AuthMethod[profile.provider.toUpperCase()] as AuthMethod,
			true
		)

		if (!account) {
			await this.prismaService.account.create({
				data: {
					userId: user.id,
					id: profile.id,
					provider: profile.provider,
					type: 'oauth',
					accessToken: profile.access_token,
					refreshToken: profile.refresh_token,
					expiresAt: profile.expires_at ?? 0
				}
			})
		}
		return this.saveSession(req, user)
	}

	public async logout(req: Request, res: Response): Promise<void> {
		return new Promise((resolve, reject) => {
			req.session.destroy(err => {
				if (err) {
					return reject(
						new InternalServerErrorException('Failed to logout')
					)
				}

				res.clearCookie(
					this.configService.getOrThrow<string>('SESSION_NAME')
				)
			})
			resolve()
		})
	}

	private async saveSession(req: Request, user: User) {
		return new Promise((resolve, reject) => {
			req.session.userId = user.id
			req.session.save(err => {
				if (err) {
					console.error('Session save error:', err)
					return reject(
						new InternalServerErrorException(
							'Failed to save session'
						)
					)
				} else {
					resolve(user)
				}
			})
		})
	}
}
