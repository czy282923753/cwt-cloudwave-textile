export function productStructuredData(
  input: {
    name: string;
    description: string | undefined;
    path: string;
    specifications: readonly string[][];
    faqs: readonly { question: string; answer: string }[];
  },
  siteOrigin: string,
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: input.name,
        description: input.description,
        additionalProperty: input.specifications.map(([name, value]) => ({
          "@type": "PropertyValue",
          name,
          value,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteOrigin },
          { "@type": "ListItem", position: 2, name: "Products", item: new URL("/products/", siteOrigin).toString() },
          { "@type": "ListItem", position: 3, name: input.name, item: new URL(input.path, siteOrigin).toString() },
        ],
      },
      ...(input.faqs.length ? [{
        "@type": "FAQPage",
        mainEntity: input.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }] : []),
    ],
  };
}

export function articleAuthorStructuredData(
  authorName: string,
  isOrganization: boolean,
) {
  return {
    "@type": isOrganization ? "Organization" : "Person",
    name: authorName,
  };
}

export function taxonomyBreadcrumbStructuredData(
  name: string,
  path: string,
  siteOrigin: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteOrigin },
      { "@type": "ListItem", position: 2, name, item: new URL(path, siteOrigin).toString() },
    ],
  };
}
