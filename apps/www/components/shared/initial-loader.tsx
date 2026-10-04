import { getTranslations } from "next-intl/server";

export async function InitialLoader() {
  const t = await getTranslations("common.loader");
  const slot = "[grid-area:1/1] overflow-hidden px-[0.06em] py-[0.12em]";

  return (
    <div id="initial-loader" aria-hidden="true" data-nav-skip className="fixed inset-0 z-9999">
      <div data-loader-sheet="" className="absolute inset-0 bg-background" />
      <div data-loader-stage="" className="absolute inset-0 grid place-items-center">
        <div className="grid place-items-center">
          <div className={slot}>
            <span
              data-loader-greet=""
              className="block whitespace-nowrap text-[clamp(3rem,10vw,8rem)] font-light leading-none"
            >
              {t("welcome")}
            </span>
          </div>
          <div className={slot} dir="ltr">
            <span
              data-loader-mark=""
              className="block whitespace-nowrap text-[clamp(2.5rem,7vw,5rem)] font-light leading-none tracking-tight"
            >
              Altruvex
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
