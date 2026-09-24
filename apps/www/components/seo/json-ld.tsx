import type { JsonLdSchema } from "@/lib/schema";

type JsonLdProps = {
  schemas:
    | Array<JsonLdSchema | null | undefined>
    | JsonLdSchema
    | null
    | undefined;
};

/**
 * JSON is not HTML-safe inside a <script> element: a `</script` sequence in any
 * string value ends the element early and everything after it is parsed as
 * markup. Today every value here comes from the repo, so this escapes nothing
 * real — which is exactly when it is cheap to add, rather than the day a
 * database string or a client name reaches a schema builder.
 */
function safeJson(schema: JsonLdSchema): string {
  return JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ schemas }: JsonLdProps) {
  const entries = (Array.isArray(schemas) ? schemas : [schemas]).filter(
    (schema): schema is JsonLdSchema => Boolean(schema),
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <>
      {entries.map((schema, index) => (
        <script
          // @type alone is not unique (e.g. one Review schema per testimonial,
          // all typed "Review") — duplicate keys let React drop JSON-LD nodes.
          key={schema["@id"] != null ? String(schema["@id"]) : `${String(schema["@type"] ?? "schema")}-${index}`}
          dangerouslySetInnerHTML={{ __html: safeJson(schema) }}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
