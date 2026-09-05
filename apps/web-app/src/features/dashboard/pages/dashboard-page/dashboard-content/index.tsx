"use client";

import { Heart, MapPin } from "lucide-react";
import { MemoriesTimeline } from "@/features/memories/components/memories-timeline";
import { PartnerInviteStatus } from "@/features/partner-invite/components/partner-invite-status";
import { useDashboardActiveSpace } from "../dashboard-shell";
import { MemberAvatar } from "../member-avatar";
import styles from "./dashboard-content.module.css";
import { RelationshipMilestone } from "./relationship-milestone";

export function DashboardContent() {
  const activeSpace = useDashboardActiveSpace();
  const memberNames = activeSpace.active_members.map((member) => member.display_name).join(" & ");
  const isWaitingForPartner = activeSpace.active_members.length === 1;

  return (
    <section className={styles.content} id="timeline">
      <header className={styles.welcome}>
        <p>Welcome back, {memberNames}</p>
        <span>Here is your shared universe.</span>
      </header>

      {isWaitingForPartner ? (
        <PartnerInviteStatus
          code={activeSpace.invite_code}
          expiresAt={activeSpace.invite_code_expires_at}
          membershipState="one-member"
        />
      ) : null}

      <div className={styles.heroGrid}>
        <section className={styles.milestoneCard} aria-label="Relationship milestone">
          <span className={styles.eyebrow}>
            <Heart aria-hidden="true" /> Milestone reached
          </span>
          <RelationshipMilestone startDate={activeSpace.start_date} />
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
        </section>
      </div>

      <section className={styles.summarySection} id="gallery">
        <h2>Recent Memories</h2>
        <MemoriesTimeline variant="recent" />
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
