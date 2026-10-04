import { MOTION } from "../tokens";
import { INITIAL_LOAD_KEY, WELCOMED_KEY } from "./ready";

export const LOADER_RELEASE_EVENT = "altruvex:loader-release";

const { duration: D, ease: E, loader: L } = MOTION;

const s = (seconds: number): string => `${Math.round(seconds * 1000)}ms`;

const greetOutAt = L.enter + D.display + L.greetHold;
const firstMarkAt = greetOutAt + L.handover;
const firstLiftAt = firstMarkAt + D.slow + L.markHold;

const returningMarkAt = L.enter;
const returningLiftAt = returningMarkAt + D.slow + L.markHold;

const FAILSAFE_MS = Math.round((firstLiftAt + D.settle) * 1000) + 1500;

const SHOWN = `html[data-loader="first"], html[data-loader="returning"]`;

export const LOADER_CSS = `
#initial-loader { display: none; }
:is(${SHOWN}) #initial-loader { display: block; }
:is(${SHOWN}):not([data-initial-load="complete"]) { overflow: hidden; }
html[data-loader="returning"] [data-loader-greet] { display: none; }
html[data-loader="first"] { --loader-mark: ${s(firstMarkAt)}; --loader-lift: ${s(firstLiftAt)}; }
html[data-loader="returning"] { --loader-mark: ${s(returningMarkAt)}; --loader-lift: ${s(returningLiftAt)}; }

@keyframes loader-in { from { transform: translateY(105%); opacity: 0; } }
@keyframes loader-out { to { transform: translateY(-70%); opacity: 0; } }
@keyframes loader-lift { to { transform: translateY(-100%); } }
@keyframes loader-lift-mark { to { transform: translateY(-${Math.round(L.markLift * 100)}vh); opacity: 0; } }
@keyframes loader-fade { to { opacity: 0; } }

[data-loader-greet] {
  animation:
    loader-in ${s(D.display)} ${E.text} ${s(L.enter)} both,
    loader-out ${s(D.base)} ${E.exit} ${s(greetOutAt)} forwards;
}
[data-loader-mark] { animation: loader-in ${s(D.slow)} ${E.text} var(--loader-mark) both; }
[data-loader-sheet] { animation: loader-lift ${s(D.settle)} ${E.gentle} var(--loader-lift) both; }
[data-loader-stage] { animation: loader-lift-mark ${s(D.settle)} ${E.gentle} var(--loader-lift) both; }
[data-loader-greet], [data-loader-mark], [data-loader-sheet], [data-loader-stage] { will-change: transform, opacity; }

@media (prefers-reduced-motion: reduce) {
  [data-loader-mark] { animation: none; }
  [data-loader-sheet], [data-loader-stage] {
    animation: loader-fade ${s(D.instant)} linear ${s(L.markHold)} both;
  }
}
`;

export const LOADER_SCRIPT = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem("${INITIAL_LOAD_KEY}")){d.setAttribute("data-initial-load","complete");return}}catch(e){return}var w=true;try{w=localStorage.getItem("${WELCOMED_KEY}")==="1"}catch(e){}var r=matchMedia("(prefers-reduced-motion: reduce)").matches;d.setAttribute("data-loader",w||r?"returning":"first");var done=false;function release(){if(done)return;done=true;try{sessionStorage.setItem("${INITIAL_LOAD_KEY}","true");localStorage.setItem("${WELCOMED_KEY}","1")}catch(e){}d.setAttribute("data-initial-load","complete");window.dispatchEvent(new Event("${LOADER_RELEASE_EVENT}"))}function hide(){release();d.setAttribute("data-loader","done")}function sheet(e){return e.target&&e.target.hasAttribute&&e.target.hasAttribute("data-loader-sheet")}document.addEventListener("animationstart",function(e){if(sheet(e))release()});document.addEventListener("animationend",function(e){if(sheet(e))hide()});setTimeout(hide,${FAILSAFE_MS})})();`;
