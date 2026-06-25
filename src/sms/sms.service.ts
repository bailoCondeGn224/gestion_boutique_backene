import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SmsMessage {
  to: string | string[];
  message: string;
  senderName?: string;
}

export interface NimbaSmsResponse {
  messageid: string;
  status: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly defaultSender: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('SMS_BASEURL', 'https://api.nimbasms.com/v1');
    this.token = this.configService.get<string>('SMS_TOKEN', '');
    this.defaultSender = this.configService.get<string>('SMS_SENDER', 'Walli Paie');
  }

  /**
   * Envoyer un SMS via Nimba SMS API
   */
  async sendSms(smsMessage: SmsMessage): Promise<NimbaSmsResponse | null> {
    const { to, message, senderName } = smsMessage;

    // Normaliser le(s) numéro(s) de téléphone
    const recipients = Array.isArray(to)
      ? to.map(phone => this.normalizePhoneNumber(phone))
      : [this.normalizePhoneNumber(to)];

    // Vérifier si le token est configuré
    if (!this.token) {
      this.logger.warn('SMS_TOKEN non configuré. SMS non envoyé (mode développement).');
      this.logger.log(`📱 [DEV] SMS à ${recipients.join(', ')}:`);
      this.logger.log(`   Message: ${message}`);
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<NimbaSmsResponse>(
          `${this.baseUrl}/messages`,
          {
            sender_name: senderName || this.defaultSender,
            to: recipients,
            message: message,
          },
          {
            headers: {
              'Authorization': `${this.token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`✅ SMS envoyé avec succès à ${recipients.join(', ')} - ID: ${response.data.messageid}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Erreur envoi SMS à ${recipients.join(', ')}: ${error.message}`);
      if (error.response) {
        this.logger.error(`   Détails: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Envoyer un SMS de demande en attente (~70 chars)
   */
  async sendPendingRegistrationSms(telephone: string, nomOrganisation: string): Promise<boolean> {
    // Max ~70 chars: "Walli: Demande recue pour [nom]. En attente de validation."
    const nom = nomOrganisation.substring(0, 20);
    const message = `Walli: Demande recue pour ${nom}. En attente de validation.`;

    const result = await this.sendSms({ to: telephone, message });
    return result !== null;
  }

  /**
   * Envoyer un SMS d'approbation avec les identifiants (~95 chars)
   */
  async sendApprovalSms(
    telephone: string,
    nomOrganisation: string,
    email: string,
    password: string,
  ): Promise<boolean> {
    // Max ~95 chars: "Walli: Compte actif! Login: [email] MDP: [password]"
    const message = `Walli: Compte actif! Login: ${email} MDP: ${password}`;

    const result = await this.sendSms({ to: telephone, message });
    return result !== null;
  }

  /**
   * Envoyer un SMS de rejet (~80 chars)
   */
  async sendRejectionSms(
    telephone: string,
    nomOrganisation: string,
    motif: string,
  ): Promise<boolean> {
    // Max ~80 chars: "Walli: Demande refusee. Motif: [motif court]"
    const motifCourt = motif.substring(0, 40);
    const message = `Walli: Demande refusee. Motif: ${motifCourt}`;

    const result = await this.sendSms({ to: telephone, message });
    return result !== null;
  }

  /**
   * Envoyer un SMS de suspension (~75 chars)
   */
  async sendSuspensionSms(
    telephone: string,
    nomOrganisation: string,
    motif: string,
  ): Promise<boolean> {
    // Max ~75 chars: "Walli: Compte suspendu. Motif: [motif court]"
    const motifCourt = motif.substring(0, 40);
    const message = `Walli: Compte suspendu. Motif: ${motifCourt}`;

    const result = await this.sendSms({ to: telephone, message });
    return result !== null;
  }

  /**
   * Envoyer un SMS de réactivation (~50 chars)
   */
  async sendReactivationSms(
    telephone: string,
    nomOrganisation: string,
  ): Promise<boolean> {
    // Max ~50 chars: "Walli: Compte reactive. Connectez-vous!"
    const message = `Walli: Compte reactive. Connectez-vous!`;

    const result = await this.sendSms({ to: telephone, message });
    return result !== null;
  }

  /**
   * Normaliser le numéro de téléphone (format international Guinée)
   */
  private normalizePhoneNumber(phone: string): string {
    // Supprimer les espaces et caractères spéciaux
    let cleaned = phone.replace(/[\s\-\.\(\)]/g, '');

    // Si le numéro ne commence pas par +, ajouter le préfixe Guinée
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('00')) {
        cleaned = '+' + cleaned.substring(2);
      } else if (cleaned.startsWith('224')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+224' + cleaned;
      }
    }

    return cleaned;
  }
}
