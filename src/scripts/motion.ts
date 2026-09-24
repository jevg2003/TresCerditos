import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

/** Reveals are progressive enhancement: content is visible by default and
 *  only animated in when motion is welcome and JS has loaded. */
function initReveals() {
  if (prefersReducedMotion) return;

  gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 24,
      duration: 0.7,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
}

function initNavbarAutoHide() {
  const nav = document.getElementById("main-nav");
  if (!nav) return;

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: ({ direction, scroll }) => {
      const hide =
        window.innerWidth < 768 && direction === 1 && scroll() > 100;
      nav.classList.toggle("nav-hidden", hide);
    },
  });
}

/** Lifts the contact FAB so it rides just above the site footer instead of
 *  covering it, and drops it back to its corner when scrolling up. */
function initFabFooterLift() {
  const fab = document.getElementById("contact-fab-container");
  // Target the site footer by id: testimonial cards also use <footer>.
  const footer = document.getElementById("contacto");
  if (!fab || !footer) return;

  const update = () => {
    const overlap = window.innerHeight - footer.getBoundingClientRect().top;
    gsap.set(fab, { y: -Math.max(0, overlap) });
  };

  ScrollTrigger.create({
    trigger: footer,
    start: "top bottom",
    end: "max",
    onUpdate: update,
    onRefresh: update,
    onLeaveBack: () => gsap.set(fab, { y: 0 }),
  });
}

initReveals();
initNavbarAutoHide();
initFabFooterLift();
