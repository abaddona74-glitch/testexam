"use client";

import { useEffect } from "react";

export function ScrollActivity() {
  useEffect(() => {
    let timeout;

    const handleScroll = () => {
      document.body.setAttribute("data-scrolling", "true");
      document.documentElement.setAttribute("data-scrolling", "true");

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        document.body.removeAttribute("data-scrolling");
        document.documentElement.removeAttribute("data-scrolling");
      }, 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  return null;
}
