import { APP_ROUTES } from "@/constants/routes";
import { getActiveSpaceForCurrentUser } from "@/features/space-setup/server/get-active-space-for-user";
import { createClient } from "@/lib/supabase/server";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  BookHeart,
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
  UsersRound,
  Utensils,
} from "lucide-react";
import { redirect } from "next/navigation";
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
  {
    icon: Utensils,
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=240&q=80",
    location: "Paris, France",
    name: "Casa Luna",
    rating: 4.9,
  },
  {
    icon: Trees,
    image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=240&q=80",
    location: "Swiss Alps",
    name: "Botanical Gardens",
    rating: 5,
  },
  {
    icon: Star,
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=240&q=80",
    location: "New York City",
    name: "Luna Rooftop Bar",
    rating: 4.7,
  },
];

const coupleImage =
  "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=85";

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
  const startedOn = format(parseISO(activeSpace.start_date), "MMMM yyyy");
  const memberNames = activeSpace.member_names.join(" & ");

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.mobileHeader}>
          <div className={styles.mobileBrand}>
            <img src={coupleImage} alt="" />
            <span>Leonly</span>
          </div>
          <div className={styles.mobileHeaderActions}>
            <button type="button" aria-label="Favorite memories">
              <Heart aria-hidden="true" />
            </button>
            <button type="button" aria-label="Our profile">
              <UsersRound aria-hidden="true" />
            </button>
          </div>
        </header>

        <aside className={styles.sidebar}>
          <div className={styles.storyIdentity}>
            <img className={styles.avatar} src={coupleImage} alt="A couple sharing a moment" />
            <h1>{activeSpace.name}</h1>
            <p>Since {startedOn}</p>
          </div>

          <nav className={styles.navigation} aria-label="Dashboard sections">
            <a href="#timeline">
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
            <p>Welcome back, {memberNames}</p>
            <span>Here is your shared universe.</span>
          </header>

          <div className={styles.heroGrid}>
            <section className={styles.milestoneCard} aria-label="Relationship milestone">
              <img className={styles.milestoneImage} src={coupleImage} alt="" />
              <div className={styles.milestoneShade} aria-hidden="true" />
              <div className={styles.milestoneContent}>
                <span className={styles.eyebrow}>
                  <Heart aria-hidden="true" /> Milestone reached
                </span>
                <h2>{daysTogether.toLocaleString()} Days Together</h2>
                <p>
                  Every moment captured, every memory cherished. Your journey continues to unfold
                  beautifully.
                </p>
              </div>
            </section>
            <button className={styles.addMemoryCard} type="button">
              <span className={styles.cameraPlus} aria-hidden="true">
                <Camera />
                <Plus />
              </span>
              <span className={styles.addMemoryCopy}>
                <strong>Add Memory</strong>
                <span>Capture a new chapter</span>
              </span>
              <ChevronRight className={styles.addMemoryChevron} aria-hidden="true" />
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
                    <img className={styles.placeImage} src={place.image} alt="" />
                    <span className={styles.placeIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                    <div className={styles.placeDetails}>
                      <h3>{place.name}</h3>
                      <p>{place.location}</p>
                      <div className={styles.rating} aria-label={`${place.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            className={
                              star > Math.round(place.rating) ? styles.emptyStar : undefined
                            }
                            key={star}
                            aria-hidden="true"
                            fill="currentColor"
                          />
                        ))}
                      </div>
                    </div>
                    <span className={styles.ratingPill} aria-hidden="true">
                      {place.rating.toFixed(1)} <Star fill="currentColor" />
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
        </section>

        <nav className={styles.mobileNavigation} aria-label="Mobile dashboard sections">
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
      </div>
    </main>
  );
}
