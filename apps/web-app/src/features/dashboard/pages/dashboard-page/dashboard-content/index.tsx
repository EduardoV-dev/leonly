import type { ActiveSpace } from "@/features/space-setup/server/get-active-space-for-user";
import { Heart, ImageIcon, MapPin } from "lucide-react";
import { MemberAvatar } from "../member-avatar";
import styles from "./dashboard-content.module.css";

type DashboardContentProps = {
  activeSpace: ActiveSpace;
  daysTogether: number;
};

export function DashboardContent({ activeSpace, daysTogether }: DashboardContentProps) {
  const memberNames = activeSpace.active_members.map((member) => member.display_name).join(" & ");
  const isWaitingForPartner = activeSpace.active_members.length === 1;

  return (
    <section className={styles.content} id="timeline">
      <header className={styles.welcome}>
        <p>Welcome back, {memberNames}</p>
        <span>Here is your shared universe.</span>
      </header>

      <div className={styles.heroGrid}>
        <section className={styles.milestoneCard} aria-label="Relationship milestone">
          <span className={styles.eyebrow}>
            <Heart aria-hidden="true" /> Milestone reached
          </span>
          <h2>{daysTogether.toLocaleString()} Days Together</h2>
          <p>
            Every moment captured, every memory cherished. Your journey continues to unfold
            beautifully.
          </p>
        </section>
        <section className={styles.memberSummary} aria-label="Space members">
          <div className={styles.avatars}>
            {activeSpace.active_members.map((member) => (
              <MemberAvatar key={member.display_name} member={member} size="medium" />
            ))}
          </div>
          <h2>{isWaitingForPartner ? "Waiting for your person" : memberNames}</h2>
          <p>
            {isWaitingForPartner
              ? "Share your invite code when you are ready for them to join."
              : `Sharing ${activeSpace.name} together.`}
          </p>
          {isWaitingForPartner && activeSpace.invite_code ? (
            <code>{activeSpace.invite_code}</code>
          ) : null}
        </section>
      </div>

      <section className={styles.summarySection} id="gallery">
        <h2>Recent Memories</h2>
        <div className={styles.emptyState}>
          <ImageIcon aria-hidden="true" />
          <h3>No memories yet</h3>
          <p>Your shared moments will appear here once memories are available.</p>
        </div>
      </section>

      <section className={styles.summarySection} id="rankings">
        <h2>Our Top Rated Places</h2>
        <div className={styles.emptyState}>
          <MapPin aria-hidden="true" />
          <h3>No rated places yet</h3>
          <p>Your favorite shared places will appear here once ratings are available.</p>
        </div>
      </section>
    </section>
  );
}
