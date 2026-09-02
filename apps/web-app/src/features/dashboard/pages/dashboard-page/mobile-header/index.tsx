"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { APP_ROUTES } from "@/constants/routes";
import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import { MemberAvatar } from "../member-avatar";
import styles from "./mobile-header.module.css";

type MobileHeaderProps = {
  member: ActiveSpace["active_members"][number];
  spaceName: string;
};

export function MobileHeader({ member, spaceName }: Readonly<MobileHeaderProps>) {
  const nameViewportRef = useRef<HTMLDivElement>(null);
  const nameMeasureRef = useRef<HTMLSpanElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const nameViewport = nameViewportRef.current;
    const nameMeasure = nameMeasureRef.current;

    if (!nameViewport || !nameMeasure) {
      return;
    }

    const updateScrollDistance = () => {
      setScrollDistance(Math.max(0, nameMeasure.scrollWidth - nameViewport.clientWidth));
    };

    updateScrollDistance();
    window.addEventListener("resize", updateScrollDistance);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", updateScrollDistance);
    }

    const resizeObserver = new ResizeObserver(updateScrollDistance);
    resizeObserver.observe(nameViewport);
    resizeObserver.observe(nameMeasure);

    return () => {
      window.removeEventListener("resize", updateScrollDistance);
      resizeObserver.disconnect();
    };
  }, []);

  const isNameOverflowing = scrollDistance > 0;
  const spaceNameStyle = isNameOverflowing
    ? ({ "--scroll-distance": `${scrollDistance}px` } as CSSProperties)
    : undefined;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <MemberAvatar member={member} />
        <div className={styles.nameViewport} ref={nameViewportRef}>
          <span
            className={`${styles.name} ${isNameOverflowing ? styles.scrolling : ""}`}
            style={spaceNameStyle}
            title={spaceName}
          >
            {spaceName}
          </span>
          <span className={styles.nameMeasure} ref={nameMeasureRef} aria-hidden="true">
            {spaceName}
          </span>
        </div>
      </div>
      <Link className={styles.actions} href={APP_ROUTES.MEMORIES_NEW}>
        <Plus aria-hidden="true" />
        <span>New Entry</span>
      </Link>
    </header>
  );
}
