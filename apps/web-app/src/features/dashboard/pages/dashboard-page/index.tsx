import { APP_ROUTES } from "@/constants/routes";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { createClient } from "@/lib/supabase/server";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  Camera,
  ChevronRight,
  Headphones,
  Heart,
  ImageIcon,
  LockKeyhole,
  Map as MapIcon,
  MapPin,
  Plus,
  Settings,
  Star,
  Trees,
  Utensils,
} from "lucide-react";
import { redirect } from "next/navigation";
import { MobileMenu } from "../../components/mobile-menu";
import styles from "./dashboard-page.module.css";

const recentMemories = [
  {
    date: "Oct 14, 2023",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=85",
    title: "Autumn in Paris",
  },
  {
    date: "Sep 28, 2023",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85",
    title: "Morning Coffee",
  },
  {
    date: "Aug 05, 2023",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85",
    title: "Malibu Sunset",
  },
];

const favoritePlaces = [
  { icon: Utensils, name: "Casa Luna", rating: 5 },
  { icon: Trees, name: "Botanical Gardens", rating: 4 },
];

export async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(APP_ROUTES.AUTH);
  }

  const activeSpace = await getActiveSpaceForCurrentUser();

  if (!activeSpace) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
  }

  if (!activeSpace.onboarding_completed_at) {
    redirect(APP_ROUTES.WELCOME_CREATE_STEP("invite"));
  }

  const daysTogether = Math.max(
    0,
    differenceInCalendarDays(new Date(), parseISO(activeSpace.start_date)),
  );
  const startedOn = format(parseISO(activeSpace.start_date), "MMM d, yyyy");
  const displayName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.split(" ")[0]
      : "there";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.storyIdentity}>
            <img
              className={styles.avatar}
              src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=160&q=85"
              alt="A couple sharing a moment"
            />
            <h1>Our Story</h1>
            <p>Since {startedOn}</p>
          </div>

          <nav className={styles.navigation} aria-label="Dashboard sections">
            <a className={styles.activeNavItem} href="#timeline">
              <MapIcon aria-hidden="true" />
              Timeline
            </a>
            <a href="#gallery">
              <ImageIcon aria-hidden="true" />
              Gallery
            </a>
            <a href="#map">
              <MapPin aria-hidden="true" />
              Map
            </a>
            <a href="#rankings">
              <Star aria-hidden="true" />
              Rankings
            </a>
            <a href="#vault">
              <LockKeyhole aria-hidden="true" />
              Private Vault
            </a>
          </nav>

          <button className={styles.sidebarAddButton} type="button">
            <span aria-hidden="true">+</span>
            Add Memory
          </button>

          <div className={styles.sidebarFooter}>
            <a href="#settings">
              <Settings aria-hidden="true" />
              Settings
            </a>
            <a href="#support">
              <Headphones aria-hidden="true" />
              Support
            </a>
          </div>
        </aside>

        <section className={styles.content} id="timeline">
          <header className={styles.welcome}>
            <p>Welcome back, {displayName}</p>
            <span>Here is your shared universe.</span>
          </header>

          <div className={styles.heroGrid}>
            <section className={styles.milestoneCard} aria-label="Relationship milestone">
              <span className={styles.eyebrow}>
                <Heart aria-hidden="true" /> Milestone
              </span>
              <h2>{daysTogether.toLocaleString()} Days Together</h2>
              <p>
                Every moment captured, every memory cherished. Your journey continues to unfold
                beautifully.
              </p>
            </section>
            <button className={styles.addMemoryCard} type="button">
              <span className={styles.cameraPlus} aria-hidden="true">
                <Camera />
                <Plus />
              </span>
              <strong>Add Memory</strong>
              <span>Capture a new moment today</span>
            </button>
          </div>

          <section className={styles.memories} id="gallery">
            <div className={styles.sectionHeading}>
              <h2>Recent Memories</h2>
              <a href="#gallery">
                View Gallery <ChevronRight aria-hidden="true" />
              </a>
            </div>
            <div className={styles.memoryGrid}>
              {recentMemories.map((memory, index) => (
                <article className={styles.memoryCard} key={memory.title}>
                  <div className={styles.memoryImageWrap}>
                    <img className={styles.memoryImage} src={memory.image} alt="" />
                    {index === 0 ? (
                      <Heart className={styles.savedHeart} aria-label="Favorite memory" />
                    ) : null}
                  </div>
                  <div className={styles.memoryDetails}>
                    <time>{memory.date}</time>
                    <h3>{memory.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.places} id="rankings">
            <div className={styles.sectionHeading}>
              <h2>Our Top Rated Places</h2>
            </div>
            <div className={styles.placesGrid}>
              {favoritePlaces.map((place) => {
                const Icon = place.icon;

                return (
                  <article className={styles.placeCard} key={place.name}>
                    <span className={styles.placeIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{place.name}</h3>
                      <div className={styles.rating} aria-label={`${place.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            className={star > place.rating ? styles.emptyStar : undefined}
                            key={star}
                            aria-hidden="true"
                            fill="currentColor"
                          />
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>

        <MobileMenu />
      </div>
    </main>
  );
}
