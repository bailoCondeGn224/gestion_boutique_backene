// src/storefront/storefront-public.controller.ts
import { Controller, Get, Post, Param, Query, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { StorefrontService } from './storefront.service';
import { OnlineOrdersService } from '../online-orders/online-orders.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';

@ApiTags('public/stores')
@Controller('public/stores')
export class StorefrontPublicController {
  constructor(
    private readonly storefrontService: StorefrontService,
    private readonly onlineOrdersService: OnlineOrdersService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste des boutiques actives' })
  getActiveStores() {
    return this.storefrontService.getActiveStores();
  }

  @Get(':slug')
  @ApiOperation({ summary: "Détails d'une boutique" })
  getBySlug(@Param('slug') slug: string) {
    return this.storefrontService.getBySlug(slug);
  }

  @Get(':slug/products')
  @ApiOperation({ summary: "Catalogue produits d'une boutique" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categorieId', required: false, type: String })
  getProducts(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('categorieId') categorieId?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    return this.storefrontService.getProducts(slug, pageNum, limitNum, search, categorieId);
  }

  @Get(':slug/products/:productId')
  @ApiOperation({ summary: "Détail d'un produit" })
  getProduct(
    @Param('slug') slug: string,
    @Param('productId') productId: string,
  ) {
    return this.storefrontService.getProduct(slug, productId);
  }

  @Get(':slug/categories')
  @ApiOperation({ summary: "Catégories d'une boutique" })
  getCategories(@Param('slug') slug: string) {
    return this.storefrontService.getCategories(slug);
  }

  @Post(':slug/orders')
  @ApiOperation({ summary: 'Créer une commande en ligne' })
  async createOrder(
    @Param('slug') slug: string,
    @Body() dto: CreateOnlineOrderDto,
    @Headers('authorization') authorization?: string,
  ) {
    // Extraire le customerId du JWT token si présent (authentification optionnelle)
    let customerId: string | null = null;

    if (authorization && authorization.startsWith('Bearer ')) {
      try {
        const token = authorization.substring(7);
        const payload = this.jwtService.verify(token);

        // Vérifier que c'est bien un token customer (pas un token admin)
        if (payload.type === 'customer' && payload.sub) {
          customerId = payload.sub;
        }
      } catch (error) {
        // Token invalide ou expiré - ignorer et continuer comme non-authentifié
        console.log('[STOREFRONT] Token invalide ou expiré:', error.message);
      }
    }

    return this.onlineOrdersService.createFromStorefront(slug, dto, customerId);
  }
}
