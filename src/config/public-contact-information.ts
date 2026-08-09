/**
 * Owner-confirmed public contact information.
 *
 * This module is the single runtime authority until a separately approved
 * Company Information administration flow replaces it. A future persistent
 * authority must replace this module rather than read or write alongside it.
 */
const email = "sales@cwtextile.com";
const whatsappCanonicalDigits = "8613380007688";

export const PUBLIC_CONTACT_INFORMATION = Object.freeze({
  email: Object.freeze({
    display: email,
    href: `mailto:${email}`,
  }),
  whatsapp: Object.freeze({
    display: "+86 133 8000 7688",
    canonicalDigits: whatsappCanonicalDigits,
    href: `https://wa.me/${whatsappCanonicalDigits}`,
  }),
  location: "Guangzhou, Guangdong, China",
  businessHours: "Monday–Friday, 9:00–18:00 (UTC+8)",
});
