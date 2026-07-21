// src/storefront/storefront-public.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';

@ApiTags('public/stores')
@Controller('public/stores')
export class StorefrontPublicController {
  constructor(private readonly storefrontService: StorefrontService) {}

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
}
