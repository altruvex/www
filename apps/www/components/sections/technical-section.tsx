import { useTranslations } from "next-intl";
import { Container } from "../shared/container";
import { Eyebrow } from "../ui/eyebrow";

type TechnicalSection = {
   body: string;
   points: string[];
   title: string;
};

type TechnicalFaq = {
   a: string;
   q: string;
};

export function TechnicalSection() {
   const t = useTranslations("serviceDetails.consulting.seo");
   const sections = t.raw("sections") as TechnicalSection[];
   const faqItems = t.raw("faq.items") as TechnicalFaq[];
   return (
      <section className="border-t border-foreground/8 bg-background pt-(--section-y-top) pb-(--section-y-bottom)">
         <Container>
            <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16">
               <div>
                  <Eyebrow className="mb-4">{t("eyebrow")}</Eyebrow>
                  <h2 className="max-w-[13ch] font-sans text-4xl font-normal leading-tight text-primary md:text-5xl">
                     {t("title")}
                  </h2>
                  <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-primary/65">
                     {t("body")}
                  </p>
               </div>
               <div className="grid gap-6">
                  {sections.map((section) => (
                     <article
                        key={section.title}
                        className="p-6 border border-foreground/8 rounded-xl"
                     >
                        <h3 className="font-sans text-2xl font-normal leading-snug text-primary">
                           {section.title}
                        </h3>
                        <p className="mt-3 text-base leading-relaxed text-primary/65">
                           {section.body}
                        </p>
                        <ul className="mt-5 grid gap-3 text-sm leading-relaxed text-primary/55 sm:grid-cols-2">
                           {section.points.map((point) => (
                              <li key={point} className="flex gap-3">
                                 <span
                                    aria-hidden
                                    className="mt-2 h-px w-4 shrink-0 bg-primary/25"
                                 />
                                 <span>{point}</span>
                              </li>
                           ))}
                        </ul>
                     </article>
                  ))}
               </div>
            </div>
            <div className="mt-16 border-t border-foreground/8 pt-10">
               <h2 className="font-sans text-3xl font-normal leading-tight text-primary">
                  {t("faq.title")}
               </h2>
               <div className="mt-8 grid gap-8 md:grid-cols-2">
                  {faqItems.map((item) => (
                     <article key={item.q}>
                        <h3 className="text-lg font-medium leading-snug text-primary">
                           {item.q}
                        </h3>
                        <p className="mt-3 text-base leading-relaxed text-primary/65">
                           {item.a}
                        </p>
                     </article>
                  ))}
               </div>
            </div>
         </Container>
      </section>
   )
}