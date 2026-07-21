import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CustomerAccount } from './entities/customer-account.entity';
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  UpdateCustomerProfileDto,
  CustomerResponseDto,
} from './dto';

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(CustomerAccount)
    private customerAccountRepository: Repository<CustomerAccount>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterCustomerDto): Promise<{ customer: CustomerResponseDto; access_token: string }> {
    // Vérifier si le téléphone existe déjà
    const existing = await this.customerAccountRepository.findOne({
      where: { telephone: dto.telephone },
    });

    if (existing) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Créer le compte
    const customer = this.customerAccountRepository.create({
      nom: dto.nom,
      telephone: dto.telephone,
      email: dto.email,
      passwordHash,
    });

    await this.customerAccountRepository.save(customer);

    // Générer le token
    const token = this.generateToken(customer);

    return {
      customer: this.toResponseDto(customer),
      access_token: token,
    };
  }

  async login(dto: LoginCustomerDto): Promise<{ customer: CustomerResponseDto; access_token: string }> {
    const customer = await this.customerAccountRepository.findOne({
      where: { telephone: dto.telephone },
    });

    if (!customer) {
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }

    if (!customer.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, customer.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }

    const token = this.generateToken(customer);

    return {
      customer: this.toResponseDto(customer),
      access_token: token,
    };
  }

  async getProfile(customerId: string): Promise<CustomerResponseDto> {
    const customer = await this.customerAccountRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Compte client non trouvé');
    }

    return this.toResponseDto(customer);
  }

  async updateProfile(customerId: string, dto: UpdateCustomerProfileDto): Promise<CustomerResponseDto> {
    const customer = await this.customerAccountRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Compte client non trouvé');
    }

    if (dto.nom) {
      customer.nom = dto.nom;
    }

    if (dto.email !== undefined) {
      customer.email = dto.email;
    }

    if (dto.password) {
      customer.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.customerAccountRepository.save(customer);

    return this.toResponseDto(customer);
  }

  private generateToken(customer: CustomerAccount): string {
    const payload = {
      sub: customer.id,
      telephone: customer.telephone,
      type: 'customer',
    };

    return this.jwtService.sign(payload, { expiresIn: '30d' });
  }

  private toResponseDto(customer: CustomerAccount): CustomerResponseDto {
    return {
      id: customer.id,
      nom: customer.nom,
      telephone: customer.telephone,
      email: customer.email,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
    };
  }
}
