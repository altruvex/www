/**
 * Comparison table for MDX articles.
 *
 * The article pipeline has no GFM plugin (pipe tables render as raw text) and
 * next-mdx-remote blocks JS expressions in props, so columns travel as one
 * pipe-separated string: <Compare head="A|B|C"><Row cells="a|b|c" /></Compare>.
 * The first cell of each row is its header cell.
 */

function split(value: string) {
  return value.split("|").map((cell) => cell.trim());
}

export function Compare({
  head,
  caption,
  children,
}: {
  head: string;
  caption?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="my-8 overflow-x-auto">
      <table className="w-full min-w-120 border-collapse text-start text-base leading-relaxed">
        {caption && (
          <caption className="mb-3 text-start text-sm text-muted-foreground">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="border-b-2 border-foreground">
            {split(head).map((cell, i) => (
              <th
                key={i}
                scope="col"
                className="py-3 pe-4 text-start align-bottom text-sm font-medium text-foreground"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ cells }: { cells: string }) {
  const [first, ...rest] = split(cells);
  return (
    <tr className="border-b border-border-subtle">
      <th
        scope="row"
        className="py-3 pe-4 text-start align-top font-medium text-foreground"
      >
        {first}
      </th>
      {rest.map((cell, i) => (
        <td key={i} className="py-3 pe-4 align-top text-primary/85">
          {cell}
        </td>
      ))}
    </tr>
  );
}
