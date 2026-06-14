type LocalizedString = {
  en: string;
  ar: string;
};

type Testimonial = {
  id: string;
  author: string;
  role: LocalizedString;
  company: string;
  quote: LocalizedString;
  avatar?: string;
  caseStudySlug?: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "newlight-1",
    author: "NewLight",
    role: {
      en: "Lighting retail",
      ar: "تجارة الإضاءة",
    },
    company: "NewLight",
    quote: {
      en: "Our first online store had to work in Arabic and English without feeling like a translated template. Altruvex delivered a fast bilingual shop we could show to suppliers on day one.",
      ar: "كان علينا أن يعمل متجرنا الأول بالعربية والإنجليزية دون أن يبدو كقالب مترجم. سلّمت Altruvex متجراً ثنائي اللغة سريعاً استطعنا عرضه على الموردين من اليوم الأول.",
    },
    caseStudySlug: "newlight-lighting-store",
  },
  {
    id: "art-lighting-1",
    author: "Art Lighting",
    role: {
      en: "Premium lighting",
      ar: "إضاءة فاخرة",
    },
    company: "Art Lighting",
    quote: {
      en: "Product pages stay fast on mobile data and inventory updates without breaking the catalog experience—that was the bar for going live.",
      ar: "صفحات المنتجات تبقى سريعة على بيانات الجوال وتحديثات المخزون دون أن تكسر تجربة الكتالوج—كان هذا شرط الإطلاق.",
    },
    caseStudySlug: "art-lighting-store",
  },
];

export function getTestimonialsForCaseStudy(slug: string): Testimonial[] {
  return TESTIMONIALS.filter((t) => t.caseStudySlug === slug);
}

export function getAllTestimonials(): Testimonial[] {
  return TESTIMONIALS;
}

export type { Testimonial };
