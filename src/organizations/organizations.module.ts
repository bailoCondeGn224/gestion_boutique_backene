import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization } from './entities/organization.entity';
import { PlansModule } from '../plans/plans.module';
import { RolesModule } from '../roles/roles.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, User]),
    PlansModule,
    forwardRef(() => RolesModule),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
