import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { OrganizationStatus } from '../organizations/enums/organization-status.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Les super admins peuvent toujours se connecter
    if (user.isSuperAdmin) {
      const { password, ...result } = user;
      return result;
    }

    // Vérifier que l'utilisateur est actif
    if (user.actif === false) {
      throw new UnauthorizedException(
        'Votre compte a été désactivé. Contactez votre administrateur.'
      );
    }

    // Vérifier que l'organisation existe et est approuvée
    if (user.organization) {
      const orgStatus = user.organization.statut;

      if (orgStatus === OrganizationStatus.EN_ATTENTE) {
        throw new UnauthorizedException(
          'Votre organisation est en attente d\'approbation. Vous recevrez un SMS dès que votre compte sera activé.'
        );
      }

      if (orgStatus === OrganizationStatus.REJETE) {
        throw new UnauthorizedException(
          'Votre demande d\'inscription a été rejetée. Contactez le support pour plus d\'informations.'
        );
      }

      if (orgStatus === OrganizationStatus.SUSPENDU) {
        throw new UnauthorizedException(
          'Votre organisation a été suspendue. Contactez le support pour plus d\'informations.'
        );
      }

      // Vérifier aussi que l'organisation est active
      if (!user.organization.actif) {
        throw new UnauthorizedException(
          'Votre organisation est inactive. Contactez le support pour plus d\'informations.'
        );
      }
    }

    const { password: pwd, ...result } = user;
    return result;
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
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Récupérer l'utilisateur avec son mot de passe
    const user = await this.usersService.findOneWithPassword(userId);

    // Vérifier que l'ancien mot de passe est correct
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new Error('Le mot de passe actuel est incorrect');
    }

    // Vérifier que le nouveau mot de passe est différent de l'ancien
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new Error(
        'Le nouveau mot de passe doit être différent de l\'ancien',
      );
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et désactiver le flag mustChangePassword
    await this.usersService.updatePassword(userId, hashedPassword);

    return { message: 'Mot de passe modifié avec succès' };
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
