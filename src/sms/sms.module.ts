import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SmsService } from './sms.service';

@Global() // Rendre le service disponible partout sans import
@Module({
  imports: [HttpModule],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
