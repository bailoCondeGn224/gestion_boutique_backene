import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      nom: user.nom,
      roleId: user.role?.id || null, // Null pour les super admins
      organizationId: user.organization?.id || null, // Multi-tenant
      isSuperAdmin: user.isSuperAdmin || false,      // Flag super admin
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        role: user.role,
        organization: user.organization,
        isSuperAdmin: user.isSuperAdmin,
      },
    };
  }

  async register(
    createUserDto: any,
    creatorOrganizationId: string | null,
    isSuperAdmin: boolean = false,
  ) {
    const user = await this.usersService.create(
      createUserDto,
      creatorOrganizationId,
      isSuperAdmin,
    );
    const { password, ...result } = user;
    return this.login(result as User);
  }
}
