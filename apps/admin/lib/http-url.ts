import { z } from "zod";

export const httpUrl = z.url({ protocol: /^https?$/ }).max(500);
