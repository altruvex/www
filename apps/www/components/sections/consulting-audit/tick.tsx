/** The world tick that opens an accent eyebrow, in the page's local accent. */
export function Tick() {
  return (
    <span aria-hidden className="block h-[3px] w-5 rounded-full bg-local-accent" />
  );
}
