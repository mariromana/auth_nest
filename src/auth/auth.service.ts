import { ConflictException, Injectable } from '@nestjs/common'
import { AuthMethod, User } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'

import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly userService: UserService
	) {}

	public async register(dto: RegisterDto) {
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

		return this.saveSession(newUser)
	}

	public async login() {}

	public async logout() {}

	private async saveSession(user: User) {
		console.log('session saved User', user)
	}
}
