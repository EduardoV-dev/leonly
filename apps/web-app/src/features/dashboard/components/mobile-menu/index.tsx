"use client";

import {
  Camera,
  Headphones,
  ImageIcon,
  LockKeyhole,
  Map as MapIcon,
  MapPin,
  Menu,
  Settings,
  Star,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import styles from "./mobile-menu.module.css";

export function MobileMenu() {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeDrawer = () => {
    if (!drawerRef.current?.open || isClosing) {
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      drawerRef.current?.close();
      setIsClosing(false);
    }, 240);
  };
  const navigateTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ block: "start" });
    closeDrawer();
  };

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label="Open dashboard menu"
        className={styles.mobileMenuTrigger}
        type="button"
        onClick={() => {
          setIsClosing(false);
          drawerRef.current?.showModal();
        }}
      >
        <Menu aria-hidden="true" />
      </button>

      <dialog
        aria-label="Dashboard menu"
        className={styles.mobileDrawer}
        data-closing={isClosing || undefined}
        ref={drawerRef}
        onCancel={(event) => {
          event.preventDefault();
          closeDrawer();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDrawer();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeDrawer();
          }
        }}
      >
        <div className={styles.drawerHandle} aria-hidden="true" />
        <div className={styles.drawerHeader}>
          <span>Our Story</span>
          <button aria-label="Close dashboard menu" type="button" onClick={closeDrawer}>
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className={styles.drawerNavigation} aria-label="Dashboard sections">
          <button type="button" onClick={() => navigateTo("timeline")}>
            <MapIcon aria-hidden="true" />
            Timeline
          </button>
          <button type="button" onClick={() => navigateTo("gallery")}>
            <ImageIcon aria-hidden="true" />
            Gallery
          </button>
          <button type="button" onClick={() => navigateTo("rankings")}>
            <MapPin aria-hidden="true" />
            Map
          </button>
          <button type="button" onClick={() => navigateTo("rankings")}>
            <Star aria-hidden="true" />
            Rankings
          </button>
          <button type="button" onClick={closeDrawer}>
            <LockKeyhole aria-hidden="true" />
            Private Vault
          </button>
        </nav>

        <button className={styles.drawerAddButton} type="button" onClick={closeDrawer}>
          <Camera aria-hidden="true" />
          Add Memory
        </button>

        <div className={styles.drawerFooter}>
          <button type="button" onClick={closeDrawer}>
            <Settings aria-hidden="true" />
            Settings
          </button>
          <button type="button" onClick={closeDrawer}>
            <Headphones aria-hidden="true" />
            Support
          </button>
        </div>
      </dialog>
    </>
  );
}
