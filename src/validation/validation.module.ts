import { Module } from '@nestjs/common';
import { RetoursValidator } from './retours.validator';

/**
 * Module centralisé pour tous les validators métier
 * Permet de partager les validations entre différents modules
 */
@Module({
  providers: [RetoursValidator],
  exports: [RetoursValidator],
})
export class ValidationModule {}
