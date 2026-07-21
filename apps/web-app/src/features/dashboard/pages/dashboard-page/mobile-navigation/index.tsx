import { BookHeart, Heart, ImageIcon, MapPin, Star } from "lucide-react";
import styles from "./mobile-navigation.module.css";

export function MobileNavigation() {
  return (
    <nav className={styles.navigation} aria-label="Mobile dashboard sections">
      <a href="#timeline">
        <BookHeart aria-hidden="true" />
        <span>Timeline</span>
      </a>
      <a href="#gallery">
        <ImageIcon aria-hidden="true" />
        <span>Gallery</span>
      </a>
      <a href="#map">
        <MapPin aria-hidden="true" />
        <span>Map</span>
      </a>
      <a href="#rankings">
        <Star aria-hidden="true" />
        <span>Rankings</span>
      </a>
      <a href="#vault">
        <Heart aria-hidden="true" />
        <span>Vault</span>
      </a>
    </nav>
  );
}
