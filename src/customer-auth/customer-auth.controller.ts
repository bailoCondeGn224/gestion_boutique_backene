import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAuthService } from './customer-auth.service';
import {
  RegisterCustomerDto,
  LoginCustomerDto,
  UpdateCustomerProfileDto,
  CustomerResponseDto,
} from './dto';
import { CustomerJwtAuthGuard } from './guards/customer-jwt-auth.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { CustomerAccount } from './entities/customer-account.entity';

@ApiTags('public/auth')
@Controller('public/auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Créer un compte client' })
  @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
  @ApiResponse({ status: 409, description: 'Téléphone déjà utilisé' })
  register(@Body() dto: RegisterCustomerDto) {
    return this.customerAuthService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Connexion client' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants incorrects' })
  login(@Body() dto: LoginCustomerDto) {
    return this.customerAuthService.login(dto);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil du client connecté' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  getProfile(@CurrentCustomer() customer: CustomerAccount) {
    return this.customerAuthService.getProfile(customer.id);
  }

  @UseGuards(CustomerJwtAuthGuard)
  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier le profil client' })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  updateProfile(
    @CurrentCustomer() customer: CustomerAccount,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customerAuthService.updateProfile(customer.id, dto);
  }
}
