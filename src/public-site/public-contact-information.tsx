import { PUBLIC_CONTACT_INFORMATION } from "@/config/public-contact-information";

import { TrackedLink } from "./tracking";

type ContactInformationVariant = "direct" | "footer";

export function PublicContactInformation({
  variant,
}: Readonly<{ variant: ContactInformationVariant }>) {
  const contact = PUBLIC_CONTACT_INFORMATION;
  const linkClassName =
    "public-contact-link font-semibold text-[#8EE2DC] underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline-[#8EE2DC]";

  return (
    <address
      aria-label={variant === "footer"
        ? "CloudWave Textile contact information"
        : "Direct contact channels"}
      className="not-italic"
      data-public-contact-information={variant}
    >
      <dl className="mt-4 grid min-w-0 gap-4 text-sm leading-6">
        <div className="min-w-0">
          <dt className="text-white/65">Email</dt>
          <dd className="min-w-0">
            <a className={linkClassName} href={contact.email.href}>
              {contact.email.display}
            </a>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-white/65">WhatsApp</dt>
          <dd className="min-w-0">
            <TrackedLink
              className={linkClassName}
              eventName="whatsapp_click"
              href={contact.whatsapp.href}
              placement={variant === "footer" ? "footer_contact" : "quote_direct"}
            >
              {contact.whatsapp.display}
            </TrackedLink>
          </dd>
        </div>
        {variant === "footer" ? (
          <>
            <div className="min-w-0">
              <dt className="text-white/65">Location</dt>
              <dd className="text-white/80">{contact.location}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-white/65">Business Hours</dt>
              <dd className="text-white/80">{contact.businessHours}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </address>
  );
}
