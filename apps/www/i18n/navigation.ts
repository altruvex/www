import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// `redirect` and `getPathname` are part of what createNavigation returns and
// are not destructured here: nothing in this app routes through them.
export const { Link, usePathname, useRouter } = createNavigation(routing);
