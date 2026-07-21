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
  getProducts(
    @Param('slug') slug: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.storefrontService.getProducts(slug, Number(page), Number(limit));
  }
}
