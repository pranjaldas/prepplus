/** Password rule mandated by the product spec. */
export function generatePassword(email: string, fullName: string): string {
  return (
    email.trim().slice(0, 4).toLowerCase() +
    fullName.trim().replace(/\s+/g, '').slice(0, 4).toLowerCase()
  );
}
