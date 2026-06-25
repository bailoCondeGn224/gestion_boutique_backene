/**
 * Génère un mot de passe aléatoire sécurisé
 * @param length Longueur du mot de passe (par défaut 10)
 * @returns Mot de passe généré
 */
export function generateRandomPassword(length: number = 10): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '@#$%&*!?';

  const allChars = uppercase + lowercase + numbers + symbols;

  // Assurer au moins un caractère de chaque type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Compléter avec des caractères aléatoires
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mélanger le mot de passe
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
